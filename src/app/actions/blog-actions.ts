'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Result types for better type safety
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Type definitions for blog entities
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: any // Tiptap JSON format
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  canonical_url: string | null
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  author_id: string
  category_id: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  view_count: number
  like_count: number
  reading_time: number | null
  created_at: string
  updated_at: string
}

export interface CreateBlogPostInput {
  title: string
  slug?: string
  excerpt?: string
  content?: any
  meta_title?: string
  meta_description?: string
  og_image_url?: string
  canonical_url?: string
  category_id?: string
  featured_image_url?: string
  featured_image_alt?: string
  reading_time?: number
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  meta_title: string | null
  meta_description: string | null
  color: string | null
  icon: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  color: string | null
  post_count: number
  created_at: string
  updated_at: string
}

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}

// =====================================================
// BLOG POSTS ACTIONS
// =====================================================

/**
 * Create a new blog post
 */
export async function createBlogPostAction(data: CreateBlogPostInput): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const postData = {
      title: data.title,
      slug: data.slug || '',
      excerpt: data.excerpt || null,
      content: data.content || null,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      og_image_url: data.og_image_url || null,
      canonical_url: data.canonical_url || null,
      category_id: data.category_id ? data.category_id : null, // Convert empty string to null
      featured_image_url: data.featured_image_url || null,
      featured_image_alt: data.featured_image_alt || null,
      reading_time: data.reading_time || null,
      author_id: user.id,
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert(postData)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/blog')
    revalidatePath(`/admin/blog/${post.id}`)

    return { success: true, data: post }
  } catch (error) {
    console.error('Create blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create blog post'
    }
  }
}

/**
 * Get a single blog post with relations
 */
export async function getBlogPostAction(postId: string): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (*),
        profiles!blog_posts_author_id_fkey (*),
        blog_post_tags (
          blog_tags (*)
        )
      `)
      .eq('id', postId)
      .eq('author_id', user.id)
      .single()

    if (error) throw error
    if (!post) throw new Error('Blog post not found')

    return { success: true, data: post }
  } catch (error) {
    console.error('Get blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blog post'
    }
  }
}

/**
 * Get all blog posts for the current user
 */
export async function getBlogPostsAction(filters?: {
  status?: 'draft' | 'published' | 'archived'
  category_id?: string
}): Promise<ActionResult<BlogPost[]>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (*),
        profiles!blog_posts_author_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    const { data: posts, error } = await query

    if (error) throw error

    return { success: true, data: posts || [] }
  } catch (error) {
    console.error('Get blog posts error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blog posts',
      data: []
    }
  }
}

/**
 * Update a blog post
 */
export async function updateBlogPostAction(
  postId: string,
  data: Partial<CreateBlogPostInput>
): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership
    const { data: post } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', postId)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    if (post.author_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (data.title !== undefined) updateData.title = data.title
    // Only update slug if it's provided and not empty
    if (data.slug !== undefined && data.slug !== '') updateData.slug = data.slug
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.content !== undefined) updateData.content = data.content
    if (data.meta_title !== undefined) updateData.meta_title = data.meta_title
    if (data.meta_description !== undefined) updateData.meta_description = data.meta_description
    if (data.og_image_url !== undefined) updateData.og_image_url = data.og_image_url
    if (data.canonical_url !== undefined) updateData.canonical_url = data.canonical_url
    // Handle category_id: convert empty string to null
    if (data.category_id !== undefined) updateData.category_id = data.category_id || null
    if (data.featured_image_url !== undefined) updateData.featured_image_url = data.featured_image_url
    if (data.featured_image_alt !== undefined) updateData.featured_image_alt = data.featured_image_alt
    if (data.reading_time !== undefined) updateData.reading_time = data.reading_time

    // Update with ownership check at DB level
    const { data: updatedPost, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', postId)
      .eq('author_id', user.id) // Double-check ownership
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath('/admin/blog')
    if (updatedPost.slug) {
      revalidatePath(`/blog/${updatedPost.slug}`)
    }

    return { success: true, data: updatedPost }
  } catch (error) {
    console.error('Update blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update blog post'
    }
  }
}

/**
 * Publish a blog post
 */
export async function publishBlogPostAction(postId: string): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch and validate
    const { data: post } = await supabase
      .from('blog_posts')
      .select()
      .eq('id', postId)
      .eq('author_id', user.id)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    // Validate business rules
    if (!post.title || !post.excerpt || !post.content) {
      return {
        success: false,
        error: 'Post must have title, excerpt, and content before publishing'
      }
    }

    // Publish
    const { data: publishedPost, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('author_id', user.id)
      .select()
      .single()

    if (error) throw error

    // Revalidate all affected paths
    revalidatePath('/admin/blog')
    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath(`/blog/${publishedPost.slug}`)
    revalidatePath('/blog')

    return { success: true, data: publishedPost }
  } catch (error) {
    console.error('Publish blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish blog post'
    }
  }
}

/**
 * Unpublish a blog post
 */
export async function unpublishBlogPostAction(postId: string): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('author_id', user.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath('/admin/blog')
    revalidatePath(`/blog/${post.slug}`)
    revalidatePath('/blog')

    return { success: true, data: post }
  } catch (error) {
    console.error('Unpublish blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unpublish blog post'
    }
  }
}

/**
 * Delete a blog post
 */
export async function deleteBlogPostAction(postId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership
    const { data: post } = await supabase
      .from('blog_posts')
      .select('author_id, slug')
      .eq('id', postId)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    if (post.author_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id)

    if (error) throw error

    revalidatePath('/admin/blog')
    revalidatePath(`/blog/${post.slug}`)
    revalidatePath('/blog')

    return { success: true, message: 'Blog post deleted successfully' }
  } catch (error) {
    console.error('Delete blog post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete blog post'
    }
  }
}

// =====================================================
// BLOG CATEGORIES ACTIONS
// =====================================================

/**
 * Get all blog categories
 */
export async function getBlogCategoriesAction(): Promise<ActionResult<BlogCategory[]>> {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error

    return { success: true, data: categories || [] }
  } catch (error) {
    console.error('Get blog categories error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blog categories',
      data: []
    }
  }
}

/**
 * Create a blog category (admin only)
 */
export async function createBlogCategoryAction(data: {
  name: string
  slug?: string
  description?: string
  color?: string
  icon?: string
}): Promise<ActionResult<BlogCategory>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('blog_categories')
      .insert({
        name: data.name,
        slug: data.slug || '',
        description: data.description || null,
        color: data.color || null,
        icon: data.icon || null
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/blog')

    return { success: true, data: category }
  } catch (error) {
    console.error('Create blog category error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create blog category'
    }
  }
}

// =====================================================
// BLOG TAGS ACTIONS
// =====================================================

/**
 * Get all blog tags
 */
export async function getBlogTagsAction(): Promise<ActionResult<BlogTag[]>> {
  try {
    const supabase = await createClient()

    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('post_count', { ascending: false })

    if (error) throw error

    return { success: true, data: tags || [] }
  } catch (error) {
    console.error('Get blog tags error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get blog tags',
      data: []
    }
  }
}

/**
 * Create a blog tag (admin only)
 */
export async function createBlogTagAction(data: {
  name: string
  slug?: string
  color?: string
}): Promise<ActionResult<BlogTag>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data: tag, error } = await supabase
      .from('blog_tags')
      .insert({
        name: data.name,
        slug: data.slug || '',
        color: data.color || null
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: tag }
  } catch (error) {
    console.error('Create blog tag error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create blog tag'
    }
  }
}

/**
 * Add tags to a blog post
 */
export async function addTagsToPostAction(
  postId: string,
  tagIds: string[]
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership
    const { data: post } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', postId)
      .single()

    if (!post || post.author_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Remove existing tags
    await supabase
      .from('blog_post_tags')
      .delete()
      .eq('post_id', postId)

    // Add new tags
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('blog_post_tags')
        .insert(
          tagIds.map(tagId => ({
            post_id: postId,
            tag_id: tagId
          }))
        )

      if (error) throw error
    }

    revalidatePath(`/admin/blog/${postId}`)

    return { success: true, message: 'Tags updated successfully' }
  } catch (error) {
    console.error('Add tags to post error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tags'
    }
  }
}

/**
 * Increment view count for a blog post
 */
export async function incrementBlogPostViewAction(postId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .rpc('increment', { row_id: postId })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Increment view count error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to increment view count'
    }
  }
}
