'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  addTagsToPostAction,
  type CreateBlogPostInput
} from '@/app/actions/blog-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

/**
 * Hook for all blog post mutations
 * Implements Pattern 01: Optimistic Updates with automatic rollback
 */
export function useBlogMutations() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // CREATE
  const createMutation = useMutation({
    mutationFn: async (data: CreateBlogPostInput) => {
      const result = await createBlogPostAction(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      toast.success('Blog post created successfully')
      router.push(`/admin/blog/${data.id}/edit`)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create blog post')
    }
  })

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: Partial<CreateBlogPostInput> }) => {
      const result = await updateBlogPostAction(postId, data)
      if (!result.success) {
        console.error('Update blog post error:', result.error)
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'post', data.id] })
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      toast.success('Blog post updated successfully')
    },
    onError: (error: any) => {
      console.error('Update mutation error:', error)
      const errorMessage = error?.message || error?.error || 'Failed to update blog post'
      toast.error(errorMessage)
    }
  })

  // DELETE with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const result = await deleteBlogPostAction(postId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async (postId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['blog', 'posts'] })

      // Save current state for rollback
      const previousPosts = queryClient.getQueryData(['blog', 'posts'])

      // Optimistically remove post from cache
      queryClient.setQueryData(['blog', 'posts'], (old: any) => {
        if (!old) return old
        return old.filter((p: any) => p.id !== postId)
      })

      return { previousPosts }
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['blog', 'posts'], context.previousPosts)
      }
      toast.error('Failed to delete blog post')
    },
    onSuccess: () => {
      toast.success('Blog post deleted successfully')
      router.push('/admin/blog')
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
    }
  })

  // PUBLISH with optimistic update
  const publishMutation = useMutation({
    mutationFn: async (postId: string) => {
      const result = await publishBlogPostAction(postId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['blog', 'posts'] })
      const previousPosts = queryClient.getQueryData(['blog', 'posts'])

      // Optimistically update status
      queryClient.setQueryData(['blog', 'posts'], (old: any) => {
        if (!old) return old
        return old.map((p: any) =>
          p.id === postId
            ? { ...p, status: 'published', published_at: new Date().toISOString() }
            : p
        )
      })

      return { previousPosts }
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['blog', 'posts'], context.previousPosts)
      }
      toast.error(err.message || 'Failed to publish blog post')
    },
    onSuccess: () => {
      toast.success('Blog post published successfully')
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['blog', 'post', data.id] })
      }
    }
  })

  // UNPUBLISH with optimistic update
  const unpublishMutation = useMutation({
    mutationFn: async (postId: string) => {
      const result = await unpublishBlogPostAction(postId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['blog', 'posts'] })
      const previousPosts = queryClient.getQueryData(['blog', 'posts'])

      // Optimistically update status
      queryClient.setQueryData(['blog', 'posts'], (old: any) => {
        if (!old) return old
        return old.map((p: any) =>
          p.id === postId ? { ...p, status: 'draft' } : p
        )
      })

      return { previousPosts }
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['blog', 'posts'], context.previousPosts)
      }
      toast.error('Failed to unpublish blog post')
    },
    onSuccess: () => {
      toast.success('Blog post unpublished successfully')
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['blog', 'post', data.id] })
      }
    }
  })

  // UPDATE TAGS
  const updateTagsMutation = useMutation({
    mutationFn: async ({ postId, tagIds }: { postId: string; tagIds: string[] }) => {
      const result = await addTagsToPostAction(postId, tagIds)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'post', variables.postId] })
      toast.success('Tags updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update tags')
    }
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    publishMutation,
    unpublishMutation,
    updateTagsMutation
  }
}
