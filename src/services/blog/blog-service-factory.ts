/**
 * Blog Service Factory
 * Creates the appropriate blog service implementation
 * Currently returns SupabaseBlogService, but can be extended for other databases
 */

import { createClient } from '@/lib/supabase/server'
import { IBlogService } from './IBlogService'
import { SupabaseBlogService } from './SupabaseBlogService'

/**
 * Get blog service instance
 * For Unpuzzle, returns Supabase implementation
 * For future projects, can return Prisma, Drizzle, etc.
 */
export async function getBlogService(): Promise<IBlogService> {
  // For Unpuzzle: Use Supabase
  const supabase = await createClient()
  return new SupabaseBlogService(supabase)
}

/**
 * Get blog service for public routes (no auth required)
 * Uses createPublicClient for static generation
 */
export function getPublicBlogService(): IBlogService {
  const { createPublicClient } = require('@/lib/supabase/server')
  const supabase = createPublicClient()
  return new SupabaseBlogService(supabase)
}
