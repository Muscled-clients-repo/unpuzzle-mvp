"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMediaFilesAction, deleteMediaFileAction, uploadMediaFileAction } from '@/app/actions/media-actions'
import { toast } from 'sonner'

export interface MediaFile {
  id: string
  name: string
  type: string
  size: string
  usage: string
  uploadedAt: string
  fileUrl: string
  thumbnail: string | null
}

export function useMediaFiles() {
  return useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const result = await getMediaFilesAction()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch media files')
      }
      return result.media
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useUploadMediaFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const operationId = `media_upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      const formData = new FormData()
      formData.append('file', file)
      return await uploadMediaFileAction(formData, operationId)
    },
    onSuccess: (result, file) => {
      if (result.success) {
        toast.success(`✅ ${file.name} uploaded successfully`)
        // Invalidate and refetch media files
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      } else {
        toast.error(`❌ Upload failed: ${result.error}`)
      }
    },
    onError: (error, file) => {
      console.error('Upload mutation error:', error)
      toast.error(`❌ Failed to upload ${file.name}`)
    }
  })
}

export function useDeleteMediaFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (fileId: string) => {
      return await deleteMediaFileAction(fileId)
    },
    onSuccess: (result, fileId) => {
      if (result.success) {
        toast.success('✅ File deleted successfully')
        // Invalidate and refetch media files
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      } else {
        toast.error(`❌ Delete failed: ${result.error}`)
      }
    },
    onError: (error) => {
      console.error('Delete mutation error:', error)
      toast.error('❌ Failed to delete file')
    }
  })
}