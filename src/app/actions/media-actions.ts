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
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

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

    // Broadcast completion
    broadcastWebSocketMessage({
      type: 'media-upload-progress',
      operationId: finalOperationId,
      data: {
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
    
    // Broadcast error if we have operationId
    if (operationId) {
      broadcastWebSocketMessage({
        type: 'media-upload-progress',
        operationId,
        data: {
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
      fileUrl: file.cdn_url || file.backblaze_url || '',
      thumbnail: file.thumbnail_url,
      // Include raw data needed for preview functionality
      backblaze_file_id: file.backblaze_file_id,
      backblaze_url: file.backblaze_url,
      file_name: file.name // Store filename for private URL generation
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

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
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