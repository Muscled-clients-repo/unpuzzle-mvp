"use server"

import { BackblazeService } from "@/services/video/backblaze-service"
import { revalidatePath } from "next/cache"
import { broadcastWebSocketMessage } from "@/lib/websocket-operations"

export interface MediaUploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  fileId?: string
  error?: string
}

export async function uploadMediaFileAction(
  formData: FormData,
  operationId?: string
): Promise<MediaUploadResult> {
  try {
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

    // Broadcast completion
    broadcastWebSocketMessage({
      type: 'media-upload-progress',
      operationId: finalOperationId,
      data: {
        fileName: file.name,
        progress: 100,
        status: 'completed',
        fileId: uploadResult.fileId,
        fileUrl: uploadResult.fileUrl
      }
    })

    // Revalidate the media page to show new uploads
    revalidatePath('/instructor/media')

    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: uploadResult.fileId
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
    // TODO: Replace with actual database query
    // For now, return empty array so uploaded files show properly
    const mediaFiles: any[] = []

    return { success: true, media: mediaFiles }
  } catch (error) {
    console.error('❌ Failed to fetch media files:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch media',
      media: []
    }
  }
}

export async function deleteMediaFileAction(fileId: string) {
  try {
    // TODO: Implement actual file deletion from Backblaze and database
    console.log('🗑️ Deleting file:', fileId)
    
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