"use client"

import { useMutation } from '@tanstack/react-query'
import { uploadBlogImageAction, deleteBlogImageAction } from '@/app/actions/blog-image-actions'
import { toast } from 'sonner'

/**
 * Hook for uploading blog images (featured, OG, and in-content images)
 * Follows the same pattern as media upload system
 */
export function useBlogImageUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return await uploadBlogImageAction(formData)
    },

    onSuccess: (result, file) => {
      if (result.success) {
        toast.success(`✅ ${file.name} uploaded successfully`)
        console.log('✅ [BLOG IMAGE] Upload successful:', {
          fileId: result.fileId,
          fileName: result.fileName,
          cdnUrl: result.cdnUrl?.substring(0, 80) + '...'
        })
      } else {
        toast.error(`❌ Upload failed: ${result.error}`)
      }
    },

    onError: (error, file) => {
      console.error('❌ [BLOG IMAGE] Upload mutation error:', error)
      toast.error(`❌ Failed to upload ${file.name}`)
    }
  })
}

/**
 * Hook for deleting blog images
 */
export function useBlogImageDelete() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      return await deleteBlogImageAction(fileId)
    },

    onSuccess: (result) => {
      if (result.success) {
        toast.success('✅ Image deleted successfully')
      } else {
        toast.error(`❌ Delete failed: ${result.error}`)
      }
    },

    onError: (error) => {
      console.error('❌ [BLOG IMAGE] Delete mutation error:', error)
      toast.error('❌ Failed to delete image')
    }
  })
}
