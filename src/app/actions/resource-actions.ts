'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Resource with metadata
 */
export interface Resource {
  id: string
  created_by: string
  title: string
  description: string | null
  type: string
  category: string
  access: string
  file_url: string
  file_size: number | null
  format: string | null
  mime_type: string | null
  tags: string[] | null
  source_type: string | null
  source_id: string | null
  download_count: number
  rating_average: number
  rating_count: number
  is_popular: boolean
  is_new: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  deleted_at: string | null
}

/**
 * Get all resources (optionally filter by type, category, access)
 */
export async function getResources(filters?: {
  type?: string
  category?: string
  access?: string
  searchQuery?: string
}) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('resources')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.access) {
      query = query.eq('access', filters.access)
    }
    if (filters?.searchQuery) {
      query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
    }

    const { data: resources, error } = await query

    if (error) {
      console.error('Error fetching resources:', error)
      return { error: 'Failed to fetch resources' }
    }

    return { resources: resources as Resource[] }
  } catch (error) {
    console.error('Error in getResources:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get single resource by ID
 */
export async function getResourceById(id: string) {
  try {
    const supabase = await createClient()

    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Error fetching resource:', error)
      return { error: 'Failed to fetch resource' }
    }

    return { resource: resource as Resource }
  } catch (error) {
    console.error('Error in getResourceById:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new resource
 */
export async function createResource(data: {
  title: string
  description?: string
  type: string
  category: string
  access: 'free' | 'member-only'
  file_url: string
  file_size?: number
  format?: string
  mime_type?: string
  tags?: string[]
  source_type?: string
  source_id?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify user is instructor or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
      return { error: 'Only instructors can create resources' }
    }

    const { data: resource, error: createError } = await supabase
      .from('resources')
      .insert({
        created_by: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        category: data.category,
        access: data.access,
        file_url: data.file_url,
        file_size: data.file_size || null,
        format: data.format || null,
        mime_type: data.mime_type || null,
        tags: data.tags || null,
        source_type: data.source_type || null,
        source_id: data.source_id || null,
        published_at: new Date().toISOString() // Auto-publish on create
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating resource:', createError)
      return { error: 'Failed to create resource' }
    }

    revalidatePath('/instructor/resources')
    revalidatePath('/community')
    return { success: true, resource }
  } catch (error) {
    console.error('Error in createResource:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Update a resource
 */
export async function updateResource(
  id: string,
  data: {
    title?: string
    description?: string
    type?: string
    category?: string
    access?: 'free' | 'member-only'
    tags?: string[]
    is_featured?: boolean
  }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify ownership
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('created_by')
      .eq('id', id)
      .eq('created_by', user.id)
      .single()

    if (resourceError || !resource) {
      return { error: 'Resource not found or you do not have permission' }
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.type) updateData.type = data.type
    if (data.category) updateData.category = data.category
    if (data.access) updateData.access = data.access
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured

    const { error: updateError } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id)

    if (updateError) {
      console.error('Error updating resource:', updateError)
      return { error: 'Failed to update resource' }
    }

    revalidatePath('/instructor/resources')
    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in updateResource:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a resource (soft delete)
 */
export async function deleteResource(id: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify ownership with RLS
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('created_by')
      .eq('id', id)
      .eq('created_by', user.id)
      .single()

    if (resourceError || !resource) {
      return { error: 'Resource not found or you do not have permission' }
    }

    // Use service role for UPDATE (same pattern as community posts)
    const adminClient = createServiceClient()

    const { error: deleteError } = await adminClient
      .from('resources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', user.id)

    if (deleteError) {
      console.error('Error deleting resource:', deleteError)
      return { error: 'Failed to delete resource' }
    }

    revalidatePath('/instructor/resources')
    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteResource:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Record a resource download
 */
export async function recordResourceDownload(resourceId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: downloadError } = await supabase.rpc('record_resource_download', {
      p_resource_id: resourceId,
      p_user_id: user.id
    })

    if (downloadError) {
      console.error('Error recording download:', downloadError)
      return { error: 'Failed to record download' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in recordResourceDownload:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Rate a resource
 */
export async function rateResource(
  resourceId: string,
  rating: number,
  review?: string
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    if (rating < 1 || rating > 5) {
      return { error: 'Rating must be between 1 and 5' }
    }

    const { error: ratingError } = await supabase.rpc('record_resource_rating', {
      p_resource_id: resourceId,
      p_user_id: user.id,
      p_rating: rating,
      p_review: review || null
    })

    if (ratingError) {
      console.error('Error rating resource:', ratingError)
      return { error: 'Failed to rate resource' }
    }

    revalidatePath('/instructor/resources')
    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in rateResource:', error)
    return { error: 'An unexpected error occurred' }
  }
}
