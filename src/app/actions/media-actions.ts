"use server"

import { BackblazeService } from "@/services/video/backblaze-service"
import { revalidatePath } from "next/cache"
// Import removed - will define function locally to match pattern
import { createClient } from "@/lib/supabase/client"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

export interface MediaUploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  fileId?: string
  error?: string
}

type MediaFile = Database["public"]["Tables"]["media_files"]["Row"]

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
      },
    }
  )
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}

// WebSocket broadcasting function for Media Manager
async function broadcastWebSocketMessage(message: {
  type: string
  operationId?: string
  data: any
}) {
  try {
    const fullMessage = {
      ...message,
      timestamp: Date.now()
    }
    
    console.log(`📤 [WEBSOCKET] Broadcasting to server:`, fullMessage.type)
    const response = await fetch('http://localhost:8080/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullMessage)
    })
    
    if (response.ok) {
      console.log(`✅ [WEBSOCKET] Broadcast successful: ${fullMessage.type}`)
    } else {
      console.warn(`⚠️ [WEBSOCKET] Broadcast failed: ${response.status}`)
    }
  } catch (error) {
    console.warn(`⚠️ [WEBSOCKET] Broadcast error:`, error)
  }
}

export async function uploadMediaFileAction(
  formData: FormData,
  operationId?: string
): Promise<MediaUploadResult> {
  let userId: string | undefined
  
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }
    
    userId = user.id

    const file = formData.get('file') as File
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      }
    }

    const finalOperationId = operationId || `media_upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    console.log('📤 Starting upload:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`)

    // Broadcast upload start
    broadcastWebSocketMessage({
      type: 'media-upload-progress',
      operationId: finalOperationId,
      data: {
        userId: user.id,
        fileName: file.name,
        progress: 0,
        status: 'starting'
      }
    })

    const backblazeService = new BackblazeService()
    
    // Upload to Backblaze with private URL format and progress tracking
    const uploadResult = await backblazeService.uploadVideo(
      file, 
      file.name,
      (progress) => {
        // Broadcast progress via WebSocket
        broadcastWebSocketMessage({
          type: 'media-upload-progress', 
          operationId: finalOperationId,
          data: {
            userId: user.id,
            fileName: file.name,
            progress: progress.percentage,
            loaded: progress.loaded,
            total: progress.total,
            status: 'uploading'
          }
        })
      }
    )
    
    console.log('✅ Upload successful:', uploadResult.fileName)

    // Convert Backblaze URL to CDN URL
    const cdnUrl = uploadResult.fileUrl.replace(
      'https://f005.backblazeb2.com',
      'https://cdn.unpuzzle.co'
    )

    // Create private URL format for signed URL system (like course videos)
    const privateUrl = `private:${uploadResult.fileId}:${uploadResult.fileName}`

    console.log('🔗 CDN URL generated:', cdnUrl)
    console.log('🔗 Private URL format:', privateUrl)

    // Save media file to database
    const mediaFileData: Database["public"]["Tables"]["media_files"]["Insert"] = {
      name: uploadResult.fileName,
      original_name: file.name,
      file_type: getFileType(file.type),
      mime_type: file.type,
      file_size: file.size,
      backblaze_file_id: uploadResult.fileId,
      backblaze_url: uploadResult.fileUrl,
      cdn_url: cdnUrl,
      uploaded_by: user.id,
      category: 'uncategorized',
      status: 'active'
    }

    const { data: savedFile, error: dbError } = await supabase
      .from('media_files')
      .insert(mediaFileData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save failed:', dbError)
      return {
        success: false,
        error: `Upload succeeded but failed to save metadata: ${dbError.message}`
      }
    }

    console.log('💾 Media file saved to database:', savedFile.id)

    // Add history entry for file upload
    const { error: historyError } = await supabase.rpc('add_media_file_history', {
      p_media_file_id: savedFile.id,
      p_action: 'uploaded',
      p_description: `File "${file.name}" uploaded (${formatFileSize(file.size)})`,
      p_metadata: {
        file_size: file.size,
        mime_type: file.type,
        original_name: file.name,
        backblaze_file_id: uploadResult.fileId
      }
    })

    if (historyError) {
      console.warn('⚠️ Failed to add history entry:', historyError)
    }

    // Broadcast completion
    broadcastWebSocketMessage({
      type: 'media-upload-progress',
      operationId: finalOperationId,
      data: {
        userId: user.id,
        fileName: file.name,
        progress: 100,
        status: 'completed',
        fileId: uploadResult.fileId,
        fileUrl: uploadResult.fileUrl,
        mediaId: savedFile.id
      }
    })

    // Revalidate the media page to show new uploads
    revalidatePath('/instructor/media')

    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: savedFile.id
    }
  } catch (error) {
    console.error('❌ Upload failed:', error)
    
    // Broadcast error if we have operationId and userId
    if (operationId && userId) {
      broadcastWebSocketMessage({
        type: 'media-upload-progress',
        operationId,
        data: {
          userId: userId,
          fileName: formData.get('file')?.name || 'unknown',
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

export async function getMediaFilesAction() {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        media: []
      }
    }

    const { data: mediaFiles, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('uploaded_by', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Failed to fetch media files:', error)
      return {
        success: false,
        error: error.message,
        media: []
      }
    }

    // Transform database records to match the expected MediaFile interface
    const transformedFiles = mediaFiles.map(file => ({
      id: file.id,
      name: file.name,
      type: file.file_type,
      size: formatFileSize(file.file_size),
      usage: file.usage_count ? `${file.usage_count} uses` : 'Unused',
      uploadedAt: new Date(file.created_at).toLocaleDateString(),
      thumbnail: file.thumbnail_url,
      // Include minimal data needed for preview functionality only
      backblaze_file_id: file.backblaze_file_id,
      backblaze_url: file.backblaze_url,
      file_name: file.name
    }))

    return { success: true, media: transformedFiles }
  } catch (error) {
    console.error('❌ Failed to fetch media files:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch media',
      media: []
    }
  }
}

export async function getMediaFileHistoryAction(fileId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        history: []
      }
    }

    const { data: history, error } = await supabase
      .from('media_file_history')
      .select(`
        id,
        action,
        description,
        metadata,
        created_at,
        media_files!inner(uploaded_by)
      `)
      .eq('media_file_id', fileId)
      .eq('media_files.uploaded_by', user.id) // Ensure user can only see history for their own files
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Failed to fetch file history:', error)
      return {
        success: false,
        error: error.message,
        history: []
      }
    }

    // Transform history data
    const transformedHistory = history.map(entry => ({
      id: entry.id,
      action: entry.action,
      description: entry.description,
      metadata: entry.metadata,
      timestamp: entry.created_at,
      user: 'You' // Since we only show user's own files
    }))

    return { success: true, history: transformedHistory }
  } catch (error) {
    console.error('❌ Failed to fetch file history:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch history',
      history: []
    }
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

export interface BulkDeletePreview {
  operationId: string
  totalItems: number
  totalSize: number
  totalSizeFormatted: string
  affectedCourses: string[]
  warnings: string[]
  estimatedTime: number
}

export async function generateBulkDeletePreviewAction(fileIds: string[]): Promise<{ success: boolean; preview?: BulkDeletePreview; error?: string }> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    if (!fileIds.length) {
      return {
        success: false,
        error: 'No files selected for deletion'
      }
    }

    console.log('🔍 Generating bulk delete preview for', fileIds.length, 'files')

    // Fetch file information for preview
    const { data: files, error: fetchError } = await supabase
      .from('media_files')
      .select(`
        id,
        name,
        file_size,
        file_type,
        usage_count,
        media_usage(
          course_id,
          resource_type,
          resource_id,
          courses(title)
        )
      `)
      .in('id', fileIds)
      .eq('uploaded_by', user.id)
      .eq('status', 'active')

    if (fetchError) {
      console.error('❌ Failed to fetch file info for preview:', fetchError)
      return {
        success: false,
        error: 'Failed to analyze selected files'
      }
    }

    if (!files.length) {
      return {
        success: false,
        error: 'No valid files found for deletion'
      }
    }

    // Calculate totals
    const totalSize = files.reduce((sum, file) => sum + file.file_size, 0)
    const totalSizeFormatted = formatFileSize(totalSize)

    // Find affected courses
    const affectedCourses = Array.from(
      new Set(
        files.flatMap(file => 
          file.media_usage?.map(usage => usage.courses?.title).filter(Boolean) || []
        )
      )
    ) as string[]

    // Generate warnings
    const warnings: string[] = []
    
    // Check for files in use
    const filesInUse = files.filter(file => (file.usage_count || 0) > 0)
    if (filesInUse.length > 0) {
      warnings.push(`${filesInUse.length} file(s) are currently used in courses and will be removed`)
    }

    // Check for large files
    const largeFiles = files.filter(file => file.file_size > 100 * 1024 * 1024) // 100MB
    if (largeFiles.length > 0) {
      warnings.push(`${largeFiles.length} large file(s) selected - deletion may take longer`)
    }

    // Check if this will affect multiple courses
    if (affectedCourses.length > 3) {
      warnings.push(`Files are used across ${affectedCourses.length} courses`)
    }

    // Estimate time (rough calculation: 1 second per file + 0.5 seconds per 10MB)
    const estimatedTime = Math.max(2, files.length + Math.floor(totalSize / (10 * 1024 * 1024) * 0.5))

    const operationId = `bulk_delete_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const preview: BulkDeletePreview = {
      operationId,
      totalItems: files.length,
      totalSize,
      totalSizeFormatted,
      affectedCourses: affectedCourses.slice(0, 5), // Limit to 5 for UI
      warnings,
      estimatedTime
    }

    console.log('✅ Bulk delete preview generated:', preview)

    return {
      success: true,
      preview
    }
  } catch (error) {
    console.error('❌ Failed to generate bulk delete preview:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preview'
    }
  }
}

export async function bulkDeleteMediaFilesAction(fileIds: string[], operationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    if (!fileIds.length) {
      return {
        success: false,
        error: 'No files selected for deletion'
      }
    }

    console.log('🗑️ Starting bulk deletion for', fileIds.length, 'files with operationId:', operationId)

    // Broadcast operation start
    broadcastWebSocketMessage({
      type: 'bulk-delete-progress',
      operationId,
      data: {
        userId: user.id,
        totalItems: fileIds.length,
        completedItems: 0,
        status: 'starting',
        progress: 0
      }
    })

    const results = []
    let completedCount = 0

    // Process files one by one with progress updates
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i]
      
      try {
        // Get file info before deleting
        const { data: fileInfo, error: fetchError } = await supabase
          .from('media_files')
          .select('name, file_size, file_type')
          .eq('id', fileId)
          .eq('uploaded_by', user.id)
          .single()

        if (fetchError) {
          console.error(`❌ Failed to fetch file ${fileId}:`, fetchError)
          results.push({ fileId, success: false, error: 'File not found' })
          continue
        }

        // Remove from media_usage first
        const { error: usageError } = await supabase
          .from('media_usage')
          .delete()
          .eq('media_file_id', fileId)

        if (usageError) {
          console.warn(`⚠️ Failed to remove usage tracking for ${fileId}:`, usageError)
        }

        // Soft delete the media file
        const { error: deleteError } = await supabase
          .from('media_files')
          .update({ status: 'deleted' })
          .eq('id', fileId)
          .eq('uploaded_by', user.id)

        if (deleteError) {
          console.error(`❌ Failed to delete file ${fileId}:`, deleteError)
          results.push({ fileId, success: false, error: deleteError.message })
          continue
        }

        // Add history entry
        const { error: historyError } = await supabase.rpc('add_media_file_history', {
          p_media_file_id: fileId,
          p_action: 'deleted',
          p_description: `File "${fileInfo.name}" bulk deleted (${formatFileSize(fileInfo.file_size)})`,
          p_metadata: {
            file_size: fileInfo.file_size,
            file_type: fileInfo.file_type,
            operation_id: operationId,
            bulk_operation: true
          }
        })

        if (historyError) {
          console.warn(`⚠️ Failed to add history for ${fileId}:`, historyError)
        }

        results.push({ fileId, success: true })
        completedCount++

        console.log(`✅ Deleted file ${i + 1}/${fileIds.length}: ${fileInfo.name}`)

        // Broadcast progress
        const progress = Math.round((completedCount / fileIds.length) * 100)
        broadcastWebSocketMessage({
          type: 'bulk-delete-progress',
          operationId,
          data: {
            userId: user.id,
            totalItems: fileIds.length,
            completedItems: completedCount,
            status: 'processing',
            progress,
            currentFile: fileInfo.name
          }
        })

        // Small delay to prevent overwhelming the database
        if (i < fileIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`❌ Error deleting file ${fileId}:`, error)
        results.push({ 
          fileId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`✅ Bulk deletion complete: ${successCount} succeeded, ${failureCount} failed`)

    // Broadcast completion
    broadcastWebSocketMessage({
      type: 'bulk-delete-progress',
      operationId,
      data: {
        userId: user.id,
        totalItems: fileIds.length,
        completedItems: successCount,
        failedItems: failureCount,
        status: 'complete',
        progress: 100,
        results
      }
    })

    // Revalidate the media page
    revalidatePath('/instructor/media')

    return {
      success: successCount > 0,
      error: failureCount > 0 ? `${failureCount} files failed to delete` : undefined
    }

  } catch (error) {
    console.error('❌ Bulk deletion failed:', error)
    
    // Broadcast error
    broadcastWebSocketMessage({
      type: 'bulk-delete-progress',
      operationId,
      data: {
        userId: user?.id || 'unknown',
        totalItems: fileIds.length,
        completedItems: 0,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Bulk deletion failed'
      }
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk deletion failed'
    }
  }
}

export async function deleteMediaFileAction(fileId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    console.log('🗑️ Deleting file:', fileId)
    
    // Get file info before deleting for history
    const { data: fileInfo, error: fetchError } = await supabase
      .from('media_files')
      .select('name, file_size, file_type')
      .eq('id', fileId)
      .eq('uploaded_by', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch file info:', fetchError)
      return {
        success: false,
        error: 'File not found or access denied'
      }
    }
    
    // Soft delete by updating status to 'deleted'
    const { error } = await supabase
      .from('media_files')
      .update({ status: 'deleted' })
      .eq('id', fileId)
      .eq('uploaded_by', user.id) // Ensure user can only delete their own files

    if (error) {
      console.error('❌ Failed to delete file from database:', error)
      return {
        success: false,
        error: error.message
      }
    }
    
    console.log('✅ File marked as deleted in database')

    // Add history entry for file deletion
    const { error: historyError } = await supabase.rpc('add_media_file_history', {
      p_media_file_id: fileId,
      p_action: 'deleted',
      p_description: `File "${fileInfo.name}" deleted (${formatFileSize(fileInfo.file_size)})`,
      p_metadata: {
        file_size: fileInfo.file_size,
        file_type: fileInfo.file_type,
        deleted_name: fileInfo.name
      }
    })

    if (historyError) {
      console.warn('⚠️ Failed to add history entry:', historyError)
    }
    
    // Revalidate the media page
    revalidatePath('/instructor/media')
    
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to delete file:', error)
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    }
  }
}