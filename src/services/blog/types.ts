/**
 * Universal Blog Types
 * These types work across ALL projects regardless of database implementation
 */

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: any // Tiptap JSON
  status: 'draft' | 'published'
  authorId: string
  categoryId: string | null
  featuredImageUrl: string | null
  ogImageUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date

  // Relations (populated on demand)
  author?: BlogAuthor
  category?: BlogCategory
  tags?: BlogTag[]
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  createdAt: Date
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export interface BlogAuthor {
  id: string
  name: string
  email: string | null
  avatar: string | null
  bio: string | null
}

// Input types for creating/updating

export interface CreatePostInput {
  title: string
  slug?: string // Auto-generated if not provided
  excerpt?: string
  content: any // Tiptap JSON
  categoryId?: string
  featuredImageUrl?: string
  ogImageUrl?: string
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
}

export interface UpdatePostInput {
  title?: string
  slug?: string
  excerpt?: string
  content?: any
  categoryId?: string
  featuredImageUrl?: string
  ogImageUrl?: string
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
}

export interface CreateCategoryInput {
  name: string
  slug?: string // Auto-generated if not provided
  description?: string
  color?: string
}

export interface CreateTagInput {
  name: string
  slug?: string // Auto-generated if not provided
}

// Filter types

export interface PostFilters {
  status?: 'draft' | 'published'
  authorId?: string
  categoryId?: string
  tagIds?: string[]
  search?: string
  limit?: number
  offset?: number
}

// Utility types

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}
