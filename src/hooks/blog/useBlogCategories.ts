'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { BlogCategory } from '@/app/actions/blog-actions'

/**
 * Hook to fetch all blog categories
 */
export function useBlogCategories() {
  return useQuery({
    queryKey: ['blog', 'categories'],
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as BlogCategory[]
    }
  })
}
