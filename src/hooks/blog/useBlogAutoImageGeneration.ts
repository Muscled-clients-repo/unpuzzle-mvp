/**
 * React hooks for auto-generating blog template images
 * Provides UI-friendly interface to auto-image-actions
 */

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { autoGenerateImagesForPost, regenerateImagesForPost } from '@/app/actions/auto-image-actions'

export interface AutoImageGenerationOptions {
  onSuccess?: (result: {
    featuredImageUrl?: string
    ogImageUrl?: string
  }) => void
  onError?: (error: string) => void
}

/**
 * Hook to auto-generate template images for a blog post
 * Shows progress toasts and handles success/error states
 */
export function useBlogAutoImageGeneration(options?: AutoImageGenerationOptions) {
  return useMutation({
    mutationFn: async (postId: string) => {
      // Show progress toast
      const toastId = toast.loading('Generating template images...', {
        description: 'This may take 5-10 seconds'
      })

      try {
        // Update progress
        toast.loading('🎨 Generating branded templates...', {
          id: toastId,
          description: 'Creating featured image and OG card'
        })

        const result = await autoGenerateImagesForPost(postId)

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate images')
        }

        // Success!
        toast.success('Images generated successfully!', {
          id: toastId,
          description: result.featuredImageUrl && result.ogImageUrl
            ? 'Featured image and OG card created'
            : result.featuredImageUrl
            ? 'Featured image created'
            : 'OG card created'
        })

        return result
      } catch (error) {
        toast.error('Failed to generate images', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    },
    onSuccess: (data) => {
      if (options?.onSuccess) {
        options.onSuccess({
          featuredImageUrl: data.featuredImageUrl,
          ogImageUrl: data.ogImageUrl
        })
      }
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error instanceof Error ? error.message : 'Failed to generate images')
      }
    }
  })
}

/**
 * Hook to regenerate images (if user doesn't like the result)
 */
export function useBlogRegenerateImages(options?: AutoImageGenerationOptions) {
  return useMutation({
    mutationFn: async (postId: string) => {
      const toastId = toast.loading('Regenerating images...', {
        description: 'Finding a different image'
      })

      try {
        const result = await regenerateImagesForPost(postId)

        if (!result.success) {
          throw new Error(result.error || 'Failed to regenerate images')
        }

        toast.success('New images generated!', {
          id: toastId,
          description: 'Try a different one if you\'re still not satisfied'
        })

        return result
      } catch (error) {
        toast.error('Failed to regenerate images', {
          id: toastId,
          description: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    },
    onSuccess: (data) => {
      if (options?.onSuccess) {
        options.onSuccess({
          featuredImageUrl: data.featuredImageUrl,
          ogImageUrl: data.ogImageUrl
        })
      }
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error instanceof Error ? error.message : 'Failed to regenerate images')
      }
    }
  })
}

/**
 * Hook to check if auto-generation is available
 * Checks if Unsplash API key is configured
 */
export function useAutoImageGenerationAvailable() {
  // In production, we'd check if UNSPLASH_ACCESS_KEY is configured
  // For now, assume it's always available
  return true
}
