'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { BackblazeService } from '@/services/video/backblaze-service'

export interface InstructorResponseFile {
  id: string
  instructor_response_id: string
  instructor_id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  backblaze_file_id: string | null
  cdn_url: string | null
  upload_status: 'uploading' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

interface UploadFileResult {
  success: boolean
  data?: InstructorResponseFile
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

// Upload files for an instructor response
export async function uploadInstructorResponseFiles({
  responseId,
  files
}: {
  responseId: string
  files: FormData
}): Promise<UploadFileResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return [{ success: false, error: 'User not authenticated' }]
  }

  // Verify user is an instructor and owns the response
  const serviceClient = createServiceClient()
  const { data: response, error: responseError } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .select('instructor_id')
    .eq('id', responseId)
    .eq('instructor_id', user.id)
    .single()

  if (responseError || !response) {
    return [{ success: false, error: 'Response not found or access denied' }]
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
        const uniqueFilename = `instructor-responses/${user.id}/${timestamp}_${randomStr}.${fileExtension}`

        console.log(`📤 Uploading instructor response file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

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

        // Store the private URL format for signed URL generation
        const privateUrl = uploadResult.fileUrl

        console.log('🔗 Private URL stored for instructor response file:', privateUrl)

        // Save file metadata to database
        const { data: fileRecord, error } = await (serviceClient as any)
          .from('instructor_response_files')
          .insert({
            instructor_response_id: responseId,
            instructor_id: user.id,
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
          console.log(`✅ Instructor response file uploaded successfully: ${file.name}`)
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

// Get files for an instructor response
export async function getInstructorResponseFiles(responseId: string): Promise<InstructorResponseFile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const serviceClient = createServiceClient()
  const { data, error } = await (serviceClient as any)
    .from('instructor_response_files')
    .select('*')
    .eq('instructor_response_id', responseId)
    .order('created_at')

  if (error) {
    throw new Error('Failed to get instructor response files')
  }

  return data || []
}

// Delete an instructor response file
export async function deleteInstructorResponseFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    const serviceClient = createServiceClient()

    // Get file info first and verify ownership
    const { data: fileRecord, error: fetchError } = await (serviceClient as any)
      .from('instructor_response_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('instructor_id', user.id)
      .single()

    if (fetchError || !fileRecord) {
      return { success: false, error: 'File not found or access denied' }
    }

    // Delete from database
    const { error: deleteError } = await (serviceClient as any)
      .from('instructor_response_files')
      .delete()
      .eq('id', fileId)
      .eq('instructor_id', user.id)

    if (deleteError) {
      return { success: false, error: 'Failed to delete file record' }
    }

    revalidatePath('/instructor/student-goals')
    revalidatePath('/student/goals')
    return { success: true }

  } catch (error) {
    console.error('Delete file error:', error)
    return { success: false, error: 'Delete operation failed' }
  }
}