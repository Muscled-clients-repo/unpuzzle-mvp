'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getBlogService } from '@/services/blog/blog-service-factory'
import type {
  BlogPost,
  BlogCategory,
  BlogTag,
  CreatePostInput,
  UpdatePostInput,
  CreateCategoryInput,
  CreateTagInput
} from '@/services/blog/types'

// Result types for better type safety
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
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
export async function createBlogPostAction(data: CreatePostInput): Promise<ActionResult<BlogPost>> {
  try {
    await requireAuth()
    const blogService = await getBlogService()

    const post = await blogService.createPost(data)

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
    await requireAuth()
    const blogService = await getBlogService()

    const post = await blogService.getPost(postId)
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
  categoryId?: string
}): Promise<ActionResult<BlogPost[]>> {
  try {
    const user = await requireAuth()
    const blogService = await getBlogService()

    const result = await blogService.listPosts({
      status: filters?.status,
      categoryId: filters?.categoryId,
      authorId: user.id,
      limit: 100 // Get all posts for admin
    })

    return { success: true, data: result.items }
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
  data: UpdatePostInput
): Promise<ActionResult<BlogPost>> {
  try {
    await requireAuth()
    const blogService = await getBlogService()

    const updatedPost = await blogService.updatePost(postId, data)

    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath('/admin/blog')
    revalidatePath('/blog') // Revalidate blog listing page
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
    await requireAuth()
    const blogService = await getBlogService()

    // Validate post exists and has required fields
    const post = await blogService.getPost(postId)
    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    if (!post.title || !post.excerpt || !post.content) {
      return {
        success: false,
        error: 'Post must have title, excerpt, and content before publishing'
      }
    }

    // Publish
    const publishedPost = await blogService.publishPost(postId)

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
    await requireAuth()
    const blogService = await getBlogService()

    const post = await blogService.unpublishPost(postId)

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
    await requireAuth()
    const blogService = await getBlogService()

    // Get post to retrieve slug for revalidation
    const post = await blogService.getPost(postId)
    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    await blogService.deletePost(postId)

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
    const blogService = await getBlogService()
    const categories = await blogService.listCategories()

    return { success: true, data: categories }
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
export async function createBlogCategoryAction(data: CreateCategoryInput): Promise<ActionResult<BlogCategory>> {
  try {
    await requireAuth()
    const blogService = await getBlogService()

    const category = await blogService.createCategory(data)

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
    const blogService = await getBlogService()
    const tags = await blogService.listTags()

    return { success: true, data: tags }
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
export async function createBlogTagAction(data: CreateTagInput): Promise<ActionResult<BlogTag>> {
  try {
    await requireAuth()
    const blogService = await getBlogService()

    const tag = await blogService.createTag(data)

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
    await requireAuth()
    const blogService = await getBlogService()

    // Remove existing tags first
    const existingTags = await blogService.getPostTags(postId)
    if (existingTags.length > 0) {
      await blogService.removeTagsFromPost(
        postId,
        existingTags.map(tag => tag.id)
      )
    }

    // Add new tags
    if (tagIds.length > 0) {
      await blogService.addTagsToPost(postId, tagIds)
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
