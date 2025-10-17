/**
 * Blog Service Interface
 * Contract that ANY database implementation must follow
 * This enables swapping databases without changing application code
 */

import {
  BlogPost,
  BlogCategory,
  BlogTag,
  CreatePostInput,
  UpdatePostInput,
  CreateCategoryInput,
  CreateTagInput,
  PostFilters,
  PaginatedResult
} from './types'

export interface IBlogService {
  // Posts
  createPost(data: CreatePostInput): Promise<BlogPost>
  updatePost(id: string, data: UpdatePostInput): Promise<BlogPost>
  getPost(id: string): Promise<BlogPost | null>
  getPostBySlug(slug: string): Promise<BlogPost | null>
  listPosts(filters?: PostFilters): Promise<PaginatedResult<BlogPost>>
  publishPost(id: string): Promise<BlogPost>
  unpublishPost(id: string): Promise<BlogPost>
  deletePost(id: string): Promise<void>

  // Categories
  createCategory(data: CreateCategoryInput): Promise<BlogCategory>
  getCategory(id: string): Promise<BlogCategory | null>
  getCategoryBySlug(slug: string): Promise<BlogCategory | null>
  listCategories(): Promise<BlogCategory[]>
  deleteCategory(id: string): Promise<void>

  // Tags
  createTag(data: CreateTagInput): Promise<BlogTag>
  getTag(id: string): Promise<BlogTag | null>
  getTagBySlug(slug: string): Promise<BlogTag | null>
  listTags(): Promise<BlogTag[]>
  deleteTag(id: string): Promise<void>

  // Tag associations
  addTagsToPost(postId: string, tagIds: string[]): Promise<void>
  removeTagsFromPost(postId: string, tagIds: string[]): Promise<void>
  getPostTags(postId: string): Promise<BlogTag[]>
}
