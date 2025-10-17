'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { BlogTag } from '@/app/actions/blog-actions'

/**
 * Hook to fetch all blog tags
 */
export function useBlogTags() {
  return useQuery({
    queryKey: ['blog', 'tags'],
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('post_count', { ascending: false })

      if (error) throw error
      return data as BlogTag[]
    }
  })
}
