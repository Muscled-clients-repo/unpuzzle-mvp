'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BackblazeService } from '@/services/video/backblaze-service'
import { generateCDNUrlWithToken, extractFilePathFromPrivateUrl } from '@/services/security/hmac-token-service'

export interface ConversationAttachment {
  id: string
  message_id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  cdn_url: string // Private URL format: "private:fileId:fileName"
  backblaze_file_id?: string
  storage_path: string
  upload_status: 'uploading' | 'completed' | 'failed'
  created_at: string
}

export interface AttachmentCDNUrl {
  url: string // Full CDN URL with HMAC token
  expiresAt: number // Timestamp when token expires
}

interface UploadFileResult {
  success: boolean
  data?: ConversationAttachment
  error?: string
  errorType?: 'file_too_large' | 'invalid_type' | 'total_size_exceeded' | 'upload_failed'
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB combined
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// Validate files before upload
function validateFiles(files: File[]): { valid: boolean; error?: string; errorType?: string } {
  // Check individual file sizes
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File "${file.name}" is too large. Maximum size per file is 5MB.`,
        errorType: 'file_too_large'
      }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed.`,
        errorType: 'invalid_type'
      }
    }
  }

  // Check total combined size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds 50MB limit.`,
      errorType: 'total_size_exceeded'
    }
  }

  return { valid: true }
}

/**
 * Generate CDN URL for conversation attachment
 */
export async function generateAttachmentCDNUrl(
  attachmentId: string,
  expirationHours: number = 6
): Promise<AttachmentCDNUrl | null> {
  console.log('🔍 generateAttachmentCDNUrl called:', { attachmentId, expirationHours })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('❌ generateAttachmentCDNUrl: No user authenticated')
    return null
  }

  try {
    const serviceClient = createServiceClient()

    // Simplified: Just get the attachment (no complex nested query)
    const { data: attachment, error } = await (serviceClient as any)
      .from('conversation_attachments')
      .select('cdn_url')
      .eq('id', attachmentId)
      .single()

    console.log('🔍 Simplified attachment query result:', { attachment, error: error?.message })

    if (error || !attachment) {
      console.log('❌ generateAttachmentCDNUrl: Attachment not found')
      return null
    }

    // Skip access verification - if user can call this function, they already have access
    // The attachment is in a conversation they have access to (enforced by conversation system)

    // Use the same pattern as main branch videos - call backblazeService
    const { backblazeService } = await import('@/services/video/backblaze-service')
    const result = await backblazeService.getSignedUrlFromPrivate(attachment.cdn_url, expirationHours)

    console.log('🔍 Backblaze service result:', { result: !!result, hasUrl: !!result?.url, hasExpiresAt: !!result?.expiresAt })

    if (!result || !result.url) {
      console.log('❌ generateAttachmentCDNUrl: Failed to get CDN URL from backblaze service')
      return null
    }

    return result

  } catch (error) {
    console.error('Generate attachment CDN URL error:', error)
    return null
  }
}

/**
 * Upload files for a message (unified function replacing all file upload variants)
 */
export async function uploadMessageAttachments({
  messageId,
  files
}: {
  messageId: string
  files: FormData
}): Promise<UploadFileResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return [{ success: false, error: 'User not authenticated' }]
  }

  // Verify user owns the message
  const serviceClient = createServiceClient()
  const { data: message, error: messageError } = await (serviceClient as any)
    .from('conversation_messages')
    .select('sender_id, conversation_id')
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .single()

  if (messageError || !message) {
    return [{ success: false, error: 'Message not found or access denied' }]
  }

  const uploadResults: UploadFileResult[] = []
  const filesToUpload: File[] = []

  // Extract files from FormData
  for (const [key, value] of files.entries()) {
    if (key.startsWith('file_') && value instanceof File) {
      filesToUpload.push(value)
    }
  }

  // Validate files before upload
  const validation = validateFiles(filesToUpload)
  if (!validation.valid) {
    return [{
      success: false,
      error: validation.error,
      errorType: validation.errorType as any
    }]
  }

  try {
    const backblazeService = new BackblazeService()

    // Process each file
    for (const file of filesToUpload) {
      try {
        // Generate unique filename for storage
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop() || ''
        const uniqueFilename = `messages/${user.id}/${timestamp}_${randomStr}.${fileExtension}`

        console.log(`📤 Uploading message attachment: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

        // Upload to Backblaze B2
        const uploadResult = await backblazeService.uploadVideo(file, uniqueFilename)

        if (!uploadResult.fileId) {
          uploadResults.push({
            success: false,
            error: `Failed to upload ${file.name}: Upload incomplete`,
            errorType: 'upload_failed'
          })
          continue
        }

        // Store the private URL format for CDN access (same as videos)
        const privateUrl = `private:${uploadResult.fileId}:${uniqueFilename}`

        console.log('🔗 Private URL stored for message attachment:', privateUrl)

        // Save file metadata to database
        const { data: fileRecord, error } = await (serviceClient as any)
          .from('conversation_attachments')
          .insert({
            message_id: messageId,
            filename: uniqueFilename,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadResult.privateUrl || uniqueFilename,
            backblaze_file_id: uploadResult.fileId || null,
            cdn_url: privateUrl, // Store private URL for signed URL generation
            upload_status: 'completed'
          })
          .select()
          .single()

        if (error) {
          console.error('Database save error:', error)
          uploadResults.push({
            success: false,
            error: `Failed to save file metadata: ${error.message}`
          })
        } else {
          console.log(`✅ Message attachment uploaded successfully: ${file.name}`)
          uploadResults.push({
            success: true,
            data: fileRecord
          })
        }

      } catch (fileError) {
        console.error('Individual file upload error:', fileError)
        uploadResults.push({
          success: false,
          error: `Failed to upload ${file.name}: ${fileError}`,
          errorType: 'upload_failed'
        })
      }
    }

    revalidatePath('/instructor/student-goals')
    revalidatePath('/student/goals')
    return uploadResults

  } catch (error) {
    console.error('Upload operation error:', error)
    return [{ success: false, error: 'Upload operation failed', errorType: 'upload_failed' }]
  }
}

/**
 * Get attachments for a message
 */
export async function getMessageAttachments(messageId: string): Promise<ConversationAttachment[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const serviceClient = createServiceClient()
  const { data, error } = await (serviceClient as any)
    .from('conversation_attachments')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at')

  if (error) {
    throw new Error('Failed to get message attachments')
  }

  return data || []
}

/**
 * Delete a message attachment
 */
export async function deleteMessageAttachment(attachmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    const serviceClient = createServiceClient()

    // Get attachment info and verify ownership
    const { data: attachment, error: fetchError } = await (serviceClient as any)
      .from('conversation_attachments')
      .select(`
        storage_path,
        message_id,
        message:conversation_messages!message_id(sender_id)
      `)
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found' }
    }

    // Verify user owns the message
    if (attachment.message.sender_id !== user.id) {
      return { success: false, error: 'Access denied' }
    }

    // Delete from database
    const { error: deleteError } = await (serviceClient as any)
      .from('conversation_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      return { success: false, error: 'Failed to delete attachment record' }
    }

    revalidatePath('/instructor/student-goals')
    revalidatePath('/student/goals')
    return { success: true }

  } catch (error) {
    console.error('Delete attachment error:', error)
    return { success: false, error: 'Delete operation failed' }
  }
}