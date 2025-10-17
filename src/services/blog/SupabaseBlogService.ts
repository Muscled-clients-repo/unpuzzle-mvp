/**
 * Supabase Blog Service Implementation
 * Maps Unpuzzle's Supabase schema to universal blog types
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { IBlogService } from './IBlogService'
import {
  BlogPost,
  BlogCategory,
  BlogTag,
  BlogAuthor,
  CreatePostInput,
  UpdatePostInput,
  CreateCategoryInput,
  CreateTagInput,
  PostFilters,
  PaginatedResult
} from './types'

type DbBlogPost = Database['public']['Tables']['blog_posts']['Row']
type DbBlogCategory = Database['public']['Tables']['blog_categories']['Row']
type DbBlogTag = Database['public']['Tables']['blog_tags']['Row']

export class SupabaseBlogService implements IBlogService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // Helper: Generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Helper: Map database post to universal BlogPost
  private mapToBlogPost(dbPost: any): BlogPost {
    return {
      id: dbPost.id,
      title: dbPost.title,
      slug: dbPost.slug,
      excerpt: dbPost.excerpt,
      content: dbPost.content,
      status: dbPost.status,
      authorId: dbPost.author_id,
      categoryId: dbPost.category_id,
      featuredImageUrl: dbPost.featured_image_url,
      ogImageUrl: dbPost.og_image_url,
      metaTitle: dbPost.meta_title,
      metaDescription: dbPost.meta_description,
      canonicalUrl: dbPost.canonical_url,
      publishedAt: dbPost.published_at ? new Date(dbPost.published_at) : null,
      createdAt: new Date(dbPost.created_at),
      updatedAt: new Date(dbPost.updated_at),
      // Relations
      author: dbPost.profiles ? this.mapToAuthor(dbPost.profiles) : undefined,
      category: dbPost.blog_categories ? this.mapToCategory(dbPost.blog_categories) : undefined
    }
  }

  private mapToCategory(dbCategory: any): BlogCategory {
    return {
      id: dbCategory.id,
      name: dbCategory.name,
      slug: dbCategory.slug,
      description: dbCategory.description,
      color: dbCategory.color,
      createdAt: new Date(dbCategory.created_at)
    }
  }

  private mapToTag(dbTag: any): BlogTag {
    return {
      id: dbTag.id,
      name: dbTag.name,
      slug: dbTag.slug,
      createdAt: new Date(dbTag.created_at)
    }
  }

  private mapToAuthor(dbProfile: any): BlogAuthor {
    return {
      id: dbProfile.id,
      name: dbProfile.full_name || 'Anonymous',
      email: dbProfile.email,
      avatar: dbProfile.avatar_url,
      bio: dbProfile.bio
    }
  }

  // Posts
  async createPost(data: CreatePostInput): Promise<BlogPost> {
    const slug = data.slug || this.generateSlug(data.title)

    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .insert({
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        category_id: data.categoryId,
        featured_image_url: data.featuredImageUrl,
        og_image_url: data.ogImageUrl,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        canonical_url: data.canonicalUrl,
        status: 'draft'
      })
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .single()

    if (error) throw new Error(`Failed to create post: ${error.message}`)
    return this.mapToBlogPost(post)
  }

  async updatePost(id: string, data: UpdatePostInput): Promise<BlogPost> {
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.content !== undefined) updateData.content = data.content
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId
    if (data.featuredImageUrl !== undefined) updateData.featured_image_url = data.featuredImageUrl
    if (data.ogImageUrl !== undefined) updateData.og_image_url = data.ogImageUrl
    if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle
    if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription
    if (data.canonicalUrl !== undefined) updateData.canonical_url = data.canonicalUrl

    updateData.updated_at = new Date().toISOString()

    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .single()

    if (error) throw new Error(`Failed to update post: ${error.message}`)
    return this.mapToBlogPost(post)
  }

  async getPost(id: string): Promise<BlogPost | null> {
    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get post: ${error.message}`)
    }

    return this.mapToBlogPost(post)
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get post by slug: ${error.message}`)
    }

    return this.mapToBlogPost(post)
  }

  async listPosts(filters?: PostFilters): Promise<PaginatedResult<BlogPost>> {
    let query = this.supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `, { count: 'exact' })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.authorId) {
      query = query.eq('author_id', filters.authorId)
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`)
    }

    // Pagination
    const limit = filters?.limit || 10
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    // Order by
    query = query.order('created_at', { ascending: false })

    const { data: posts, error, count } = await query

    if (error) throw new Error(`Failed to list posts: ${error.message}`)

    return {
      items: (posts || []).map(post => this.mapToBlogPost(post)),
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    }
  }

  async publishPost(id: string): Promise<BlogPost> {
    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .single()

    if (error) throw new Error(`Failed to publish post: ${error.message}`)
    return this.mapToBlogPost(post)
  }

  async unpublishPost(id: string): Promise<BlogPost> {
    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .update({ status: 'draft' })
      .eq('id', id)
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .single()

    if (error) throw new Error(`Failed to unpublish post: ${error.message}`)
    return this.mapToBlogPost(post)
  }

  async deletePost(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Failed to delete post: ${error.message}`)
  }

  // Categories
  async createCategory(data: CreateCategoryInput): Promise<BlogCategory> {
    const slug = data.slug || this.generateSlug(data.name)

    const { data: category, error } = await this.supabase
      .from('blog_categories')
      .insert({
        name: data.name,
        slug,
        description: data.description,
        color: data.color
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create category: ${error.message}`)
    return this.mapToCategory(category)
  }

  async getCategory(id: string): Promise<BlogCategory | null> {
    const { data: category, error } = await this.supabase
      .from('blog_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get category: ${error.message}`)
    }

    return this.mapToCategory(category)
  }

  async getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    const { data: category, error } = await this.supabase
      .from('blog_categories')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get category by slug: ${error.message}`)
    }

    return this.mapToCategory(category)
  }

  async listCategories(): Promise<BlogCategory[]> {
    const { data: categories, error } = await this.supabase
      .from('blog_categories')
      .select('*')
      .order('name')

    if (error) throw new Error(`Failed to list categories: ${error.message}`)
    return (categories || []).map(cat => this.mapToCategory(cat))
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('blog_categories')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Failed to delete category: ${error.message}`)
  }

  // Tags
  async createTag(data: CreateTagInput): Promise<BlogTag> {
    const slug = data.slug || this.generateSlug(data.name)

    const { data: tag, error } = await this.supabase
      .from('blog_tags')
      .insert({
        name: data.name,
        slug
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create tag: ${error.message}`)
    return this.mapToTag(tag)
  }

  async getTag(id: string): Promise<BlogTag | null> {
    const { data: tag, error } = await this.supabase
      .from('blog_tags')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get tag: ${error.message}`)
    }

    return this.mapToTag(tag)
  }

  async getTagBySlug(slug: string): Promise<BlogTag | null> {
    const { data: tag, error } = await this.supabase
      .from('blog_tags')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get tag by slug: ${error.message}`)
    }

    return this.mapToTag(tag)
  }

  async listTags(): Promise<BlogTag[]> {
    const { data: tags, error } = await this.supabase
      .from('blog_tags')
      .select('*')
      .order('name')

    if (error) throw new Error(`Failed to list tags: ${error.message}`)
    return (tags || []).map(tag => this.mapToTag(tag))
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('blog_tags')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Failed to delete tag: ${error.message}`)
  }

  // Tag associations
  async addTagsToPost(postId: string, tagIds: string[]): Promise<void> {
    const inserts = tagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId
    }))

    const { error } = await this.supabase
      .from('blog_post_tags')
      .insert(inserts)

    if (error) throw new Error(`Failed to add tags to post: ${error.message}`)
  }

  async removeTagsFromPost(postId: string, tagIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('blog_post_tags')
      .delete()
      .eq('post_id', postId)
      .in('tag_id', tagIds)

    if (error) throw new Error(`Failed to remove tags from post: ${error.message}`)
  }

  async getPostTags(postId: string): Promise<BlogTag[]> {
    const { data: postTags, error } = await this.supabase
      .from('blog_post_tags')
      .select(`
        blog_tags (id, name, slug, created_at)
      `)
      .eq('post_id', postId)

    if (error) throw new Error(`Failed to get post tags: ${error.message}`)

    return (postTags || [])
      .map(pt => pt.blog_tags)
      .filter(Boolean)
      .map(tag => this.mapToTag(tag))
  }
}
