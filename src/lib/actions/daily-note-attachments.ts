'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BackblazeService } from '@/services/video/backblaze-service'

export interface DailyNoteFile {
  id: string
  daily_note_id: string
  user_id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  backblaze_file_id: string | null
  cdn_url: string | null
  upload_status: 'uploading' | 'completed' | 'failed'
  message_text: string | null
  created_at: string
  updated_at: string
}

interface UploadFileResult {
  success: boolean
  data?: DailyNoteFile
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

// Log file size limit errors for analytics
async function logFileSizeError(userId: string, errorType: string, fileSize: number, fileName: string) {
  try {
    const supabase = await createClient()
    await supabase.from('daily_note_upload_errors').insert({
      user_id: userId,
      error_type: errorType,
      file_size: fileSize,
      file_name: fileName,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log file size error:', error)
  }
}

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

// Upload files for a daily note
export async function uploadDailyNoteFiles({
  dailyNoteId,
  files,
  messageText
}: {
  dailyNoteId: string
  files: FormData
  messageText?: string
}): Promise<UploadFileResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return [{ success: false, error: 'User not authenticated' }]
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
    // Log file size errors for analytics
    for (const file of filesToUpload) {
      if (validation.errorType && (validation.errorType === 'file_too_large' || validation.errorType === 'total_size_exceeded')) {
        await logFileSizeError(user.id, validation.errorType, file.size, file.name)
      }
    }
    
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
        // Generate operation ID for progress tracking (simplified - no WebSocket for daily notes)
        const operationId = `daily_note_upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        
        // Generate unique filename for storage
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop() || ''
        const uniqueFilename = `daily-notes/${user.id}/${timestamp}_${randomStr}.${fileExtension}`
        
        console.log(`📤 Uploading daily note file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        // Upload to Backblaze B2
        const uploadResult = await backblazeService.uploadVideo(file, uniqueFilename)
        
        if (!uploadResult.fileId) {
          await logFileSizeError(user.id, 'upload_failed', file.size, file.name)
          uploadResults.push({ 
            success: false, 
            error: `Failed to upload ${file.name}: Upload incomplete`,
            errorType: 'upload_failed'
          })
          continue
        }

        // Store the private URL format for signed URL generation
        // The fileUrl from BackblazeService is in format: "private:fileId:fileName"
        const privateUrl = uploadResult.fileUrl

        console.log('🔗 Private URL stored for daily note file:', privateUrl)
        console.log('🔗 Upload result details:', {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          contentLength: uploadResult.contentLength
        })

        // Save file metadata to database
        const { data: fileRecord, error } = await supabase
          .from('daily_note_files')
          .insert({
            daily_note_id: dailyNoteId,
            user_id: user.id,
            filename: uniqueFilename,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: uploadResult.privateUrl || uniqueFilename,
            backblaze_file_id: uploadResult.fileId || null,
            cdn_url: privateUrl, // Store private URL for signed URL generation
            upload_status: 'completed',
            message_text: messageText // Store the specific message this file was uploaded with
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
          console.log(`✅ Daily note file uploaded successfully: ${file.name}`)
          console.log('💾 Saved file record to database:', {
            id: fileRecord.id,
            original_filename: fileRecord.original_filename,
            cdn_url: fileRecord.cdn_url,
            backblaze_file_id: fileRecord.backblaze_file_id
          })
          uploadResults.push({ 
            success: true, 
            data: fileRecord 
          })
        }

      } catch (fileError) {
        console.error('Individual file upload error:', fileError)
        await logFileSizeError(user.id, 'upload_failed', file.size, file.name)
        uploadResults.push({ 
          success: false, 
          error: `Failed to upload ${file.name}: ${fileError}`,
          errorType: 'upload_failed'
        })
      }
    }

    revalidatePath('/student/goals')
    return uploadResults

  } catch (error) {
    console.error('Upload operation error:', error)
    return [{ success: false, error: 'Upload operation failed', errorType: 'upload_failed' }]
  }
}

// Get files for a daily note
export async function getDailyNoteFiles(dailyNoteId: string): Promise<DailyNoteFile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('daily_note_files')
    .select('*')
    .eq('daily_note_id', dailyNoteId)
    .eq('user_id', user.id)
    .order('created_at')

  if (error) {
    throw new Error('Failed to get daily note files')
  }

  return data || []
}

// Delete a daily note file
export async function deleteDailyNoteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Get file info first
    const { data: fileRecord, error: fetchError } = await supabase
      .from('daily_note_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !fileRecord) {
      return { success: false, error: 'File not found' }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('daily_note_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id)

    if (deleteError) {
      return { success: false, error: 'Failed to delete file record' }
    }

    // TODO: Delete physical file from filesystem
    // For now, we'll leave the file on disk but remove the database record

    revalidatePath('/student/goals')
    return { success: true }

  } catch (error) {
    console.error('Delete file error:', error)
    return { success: false, error: 'Delete operation failed' }
  }
}