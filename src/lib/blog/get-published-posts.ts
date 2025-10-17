import { createPublicClient } from '@/lib/supabase/server'
import type { BlogPost } from '@/app/actions/blog-actions'

export interface PublishedBlogPost extends BlogPost {
  blog_categories?: {
    id: string
    name: string
    slug: string
    color: string | null
  } | null
  author?: {
    full_name: string
    avatar_url: string | null
  } | null
}

/**
 * Server-side function to fetch all published blog posts
 * Used for public blog pages - no authentication required
 */
export async function getPublishedBlogPosts(): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching published blog posts:', error)
      return []
    }

    return (data as PublishedBlogPost[]) || []
  } catch (error) {
    console.error('Error fetching published blog posts:', error)
    return []
  }
}

/**
 * Get a single published blog post by slug
 */
export async function getPublishedBlogPostBySlug(slug: string): Promise<PublishedBlogPost | null> {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        ),
        blog_post_tags (
          blog_tags (
            id,
            name,
            slug,
            color
          )
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('Error fetching blog post by slug:', error)
      return null
    }

    return data as PublishedBlogPost
  } catch (error) {
    console.error('Error fetching blog post by slug:', error)
    return null
  }
}

/**
 * Get published posts by category
 */
export async function getPublishedPostsByCategory(categorySlug: string): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    // First get the category
    const { data: category } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (!category) return []

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        )
      `)
      .eq('status', 'published')
      .eq('category_id', category.id)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts by category:', error)
      return []
    }

    return (data as PublishedBlogPost[]) || []
  } catch (error) {
    console.error('Error fetching posts by category:', error)
    return []
  }
}

/**
 * Get all categories with post counts
 */
export async function getBlogCategories() {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching blog categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching blog categories:', error)
    return []
  }
}

/**
 * Get all tags
 */
export async function getBlogTags() {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('post_count', { ascending: false })

    if (error) {
      console.error('Error fetching blog tags:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return []
  }
}

/**
 * Get published posts by tag
 */
export async function getPublishedPostsByTag(tagSlug: string): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    // First get the tag
    const { data: tag } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('slug', tagSlug)
      .single()

    if (!tag) return []

    // Get posts with this tag
    const { data: postTags, error } = await supabase
      .from('blog_post_tags')
      .select(`
        post_id,
        blog_posts!inner (
          *,
          blog_categories (
            id,
            name,
            slug,
            color
          )
        )
      `)
      .eq('tag_id', tag.id)
      .eq('blog_posts.status', 'published')

    if (error) {
      console.error('Error fetching posts by tag:', error)
      return []
    }

    // Extract and format posts
    const posts = postTags
      ?.map((pt: any) => pt.blog_posts)
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.published_at || a.created_at).getTime()
        const dateB = new Date(b.published_at || b.created_at).getTime()
        return dateB - dateA
      }) || []

    return posts as PublishedBlogPost[]
  } catch (error) {
    console.error('Error fetching posts by tag:', error)
    return []
  }
}

/**
 * Get published posts by year
 */
export async function getPublishedPostsByYear(year: number): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        )
      `)
      .eq('status', 'published')
      .gte('published_at', startDate)
      .lte('published_at', endDate)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts by year:', error)
      return []
    }

    return (data as PublishedBlogPost[]) || []
  } catch (error) {
    console.error('Error fetching posts by year:', error)
    return []
  }
}

/**
 * Get published posts by year and month
 */
export async function getPublishedPostsByYearMonth(year: number, month: number): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        )
      `)
      .eq('status', 'published')
      .gte('published_at', startDate)
      .lte('published_at', endDate)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts by year/month:', error)
      return []
    }

    return (data as PublishedBlogPost[]) || []
  } catch (error) {
    console.error('Error fetching posts by year/month:', error)
    return []
  }
}

/**
 * Search published posts by query
 */
export async function searchPublishedBlogPosts(query: string): Promise<PublishedBlogPost[]> {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (
          id,
          name,
          slug,
          color
        )
      `)
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error searching blog posts:', error)
      return []
    }

    return (data as PublishedBlogPost[]) || []
  } catch (error) {
    console.error('Error searching blog posts:', error)
    return []
  }
}
