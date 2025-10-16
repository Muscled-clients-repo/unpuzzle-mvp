'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { BlogPost } from '@/app/actions/blog-actions'

export interface BlogFilters {
  status?: 'draft' | 'published' | 'archived'
  category_id?: string
  search?: string
}

/**
 * Hook to fetch all blog posts for the current user
 * Uses TanStack Query for caching and automatic refetching
 */
export function useBlogPosts(filters?: BlogFilters) {
  return useQuery({
    queryKey: ['blog', 'posts', filters],
    queryFn: async () => {
      const supabase = createClient()

      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (*)
        `)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as BlogPost[]
    }
  })
}

/**
 * Hook to fetch a single blog post by ID
 */
export function useBlogPost(postId: string | null) {
  return useQuery({
    queryKey: ['blog', 'post', postId],
    queryFn: async () => {
      if (!postId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (*),
          blog_post_tags (
            blog_tags (*)
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error
      return data as BlogPost
    },
    enabled: !!postId
  })
}
