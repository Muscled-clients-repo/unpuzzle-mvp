"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { Clip, Track } from "@/lib/video-editor/types"

type StudioProject = Database["public"]["Tables"]["studio_projects"]["Row"]
type StudioProjectInsert = Database["public"]["Tables"]["studio_projects"]["Insert"]
type StudioProjectUpdate = Database["public"]["Tables"]["studio_projects"]["Update"]

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
      },
    }
  )
}

// Save project (auto-save or manual)
export async function saveStudioProjectAction(data: {
  id?: string // If updating existing
  title?: string
  description?: string
  timeline_state: {
    clips: Clip[]
    tracks: Track[]
    totalFrames: number
    fps?: number
  }
  is_draft?: boolean
}) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (data.id) {
      // Update existing (auto-save or manual)
      const updateData: StudioProjectUpdate = {
        timeline_state: data.timeline_state as any,
        updated_at: new Date().toISOString()
      }

      // Only update title/description if provided
      if (data.title !== undefined) {
        updateData.title = data.title
      }
      if (data.description !== undefined) {
        updateData.description = data.description
      }
      if (data.is_draft !== undefined) {
        updateData.is_draft = data.is_draft
      }

      const { data: project, error } = await supabase
        .from('studio_projects')
        .update(updateData)
        .eq('id', data.id)
        .eq('instructor_id', user.id) // Ensure user owns the project
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to update studio project:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Studio project updated:', project.id)
      return { success: true, project }
    }

    // Create new (auto-save creates draft)
    const insertData: StudioProjectInsert = {
      instructor_id: user.id,
      title: data.title || 'Untitled Project',
      description: data.description,
      timeline_state: data.timeline_state as any,
      is_draft: data.is_draft ?? true
    }

    const { data: project, error } = await supabase
      .from('studio_projects')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create studio project:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Studio project created:', project.id)
    return { success: true, project }
  } catch (error) {
    console.error('❌ Save studio project failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project'
    }
  }
}

// Load project
export async function getStudioProjectAction(projectId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: project, error } = await supabase
      .from('studio_projects')
      .select('*')
      .eq('id', projectId)
      .eq('instructor_id', user.id) // Ensure user owns the project
      .single()

    if (error) {
      console.error('❌ Failed to fetch studio project:', error)
      return { success: false, error: error.message }
    }

    return { success: true, project }
  } catch (error) {
    console.error('❌ Get studio project failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch project'
    }
  }
}

// List projects
export async function getStudioProjectsAction(options?: { draftsOnly?: boolean }) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated', projects: [] }
    }

    let query = supabase
      .from('studio_projects')
      .select('id, title, description, is_draft, last_export_id, last_exported_at, created_at, updated_at')
      .eq('instructor_id', user.id)
      .order('updated_at', { ascending: false })

    // Filter by draft status if specified
    if (options?.draftsOnly) {
      query = query.eq('is_draft', true)
    }

    const { data: projects, error } = await query

    if (error) {
      console.error('❌ Failed to fetch studio projects:', error)
      return { success: false, error: error.message, projects: [] }
    }

    return { success: true, projects: projects || [] }
  } catch (error) {
    console.error('❌ Get studio projects failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects',
      projects: []
    }
  }
}

// Delete project
export async function deleteStudioProjectAction(projectId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('studio_projects')
      .delete()
      .eq('id', projectId)
      .eq('instructor_id', user.id) // Ensure user owns the project

    if (error) {
      console.error('❌ Failed to delete studio project:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Studio project deleted:', projectId)
    revalidatePath('/instructor/studio')

    return { success: true }
  } catch (error) {
    console.error('❌ Delete studio project failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete project'
    }
  }
}

// Save recording to media_files
export async function saveRecordingToMediaAction(
  formData: FormData,
  metadata: {
    name: string
    track_type: 'video' | 'audio'
    duration_ms: number
    clip_id: string
    project_id?: string
  }
) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    console.log('📹 Saving recording to media:', metadata.name)

    // Import and use existing uploadMediaFileAction
    const { uploadMediaFileAction } = await import('./media-actions')

    // Create new FormData with the recording file
    const recordingFormData = new FormData()
    recordingFormData.append('file', file)

    const result = await uploadMediaFileAction(recordingFormData)

    if (!result.success || !result.fileId) {
      return { success: false, error: result.error || 'Upload failed' }
    }

    // Update the media file with studio metadata
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        source_type: 'recording',
        studio_metadata: {
          recording_duration_ms: metadata.duration_ms,
          track_type: metadata.track_type,
          original_clip_id: metadata.clip_id,
          project_id: metadata.project_id,
          recorded_at: new Date().toISOString()
        }
      })
      .eq('id', result.fileId)

    if (updateError) {
      console.warn('⚠️ Failed to update studio metadata:', updateError)
      // Don't fail the upload if metadata update fails
    }

    // Generate CDN URL with HMAC token (following Pattern 23)
    const { generateCDNUrlWithToken } = await import('@/services/security/hmac-token-service')

    const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.unpuzzle.co'
    const hmacSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

    if (!hmacSecret) {
      console.error('❌ CDN_AUTH_SECRET or AUTH_SECRET not configured')
      return { success: false, error: 'CDN configuration error' }
    }

    // Extract filename from upload result
    const fileName = result.fileName || file.name
    const cdnUrl = generateCDNUrlWithToken(cdnBaseUrl, `/${fileName}`, hmacSecret)

    console.log('✅ Recording saved to media library:', result.fileId)
    console.log('🔗 CDN URL generated:', cdnUrl)
    revalidatePath('/instructor/media')

    return {
      success: true,
      mediaId: result.fileId,
      fileUrl: cdnUrl  // Return CDN URL with HMAC token
    }
  } catch (error) {
    console.error('❌ Save recording failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save recording'
    }
  }
}

// Export timeline to media_files
export async function exportTimelineToMediaAction(
  formData: FormData,
  metadata: {
    title: string
    description?: string
    project_id?: string
    export_settings?: {
      resolution?: string
      fps?: number
      codec?: string
    }
  }
) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    console.log('🎬 Exporting timeline to media:', metadata.title)

    // Import and use existing uploadMediaFileAction
    const { uploadMediaFileAction } = await import('./media-actions')

    // Create new FormData with the export file
    const exportFormData = new FormData()
    exportFormData.append('file', file)

    const result = await uploadMediaFileAction(exportFormData)

    if (!result.success || !result.fileId) {
      return { success: false, error: result.error || 'Upload failed' }
    }

    // Update the media file with studio metadata
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        source_type: 'export',
        studio_metadata: {
          project_id: metadata.project_id,
          exported_at: new Date().toISOString(),
          export_settings: metadata.export_settings
        }
      })
      .eq('id', result.fileId)

    if (updateError) {
      console.warn('⚠️ Failed to update studio metadata:', updateError)
      // Don't fail the upload if metadata update fails
    }

    // Update project with last export reference
    if (metadata.project_id) {
      const { error: projectUpdateError } = await supabase
        .from('studio_projects')
        .update({
          last_export_id: result.fileId,
          last_exported_at: new Date().toISOString()
        })
        .eq('id', metadata.project_id)
        .eq('instructor_id', user.id)

      if (projectUpdateError) {
        console.warn('⚠️ Failed to update project export reference:', projectUpdateError)
        // Don't fail the export if project update fails
      }
    }

    console.log('✅ Timeline exported to media library:', result.fileId)
    revalidatePath('/instructor/media')
    revalidatePath('/instructor/studio')

    return {
      success: true,
      mediaId: result.fileId,
      fileUrl: result.fileUrl
    }
  } catch (error) {
    console.error('❌ Export timeline failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export timeline'
    }
  }
}

// Publish project (convert from draft to published)
export async function publishStudioProjectAction(projectId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: project, error } = await supabase
      .from('studio_projects')
      .update({ is_draft: false })
      .eq('id', projectId)
      .eq('instructor_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to publish studio project:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Studio project published:', projectId)
    revalidatePath('/instructor/studio')

    return { success: true, project }
  } catch (error) {
    console.error('❌ Publish studio project failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish project'
    }
  }
}

// Get all existing tags across all projects
export async function getProjectTagsAction() {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated', tags: [] }
    }

    // Query all projects and extract unique tags
    const { data: projects, error } = await supabase
      .from('studio_projects')
      .select('tags')
      .eq('instructor_id', user.id)

    if (error) {
      console.error('❌ Failed to get project tags:', error)
      return { success: false, error: error.message, tags: [] }
    }

    // Flatten and deduplicate tags
    const allTags = projects
      ?.flatMap(p => p.tags || [])
      .filter((tag, index, self) => tag && self.indexOf(tag) === index)
      .sort() || []

    return { success: true, tags: allTags }
  } catch (error) {
    console.error('❌ Get project tags failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tags',
      tags: []
    }
  }
}

// Update tags for multiple projects (bulk operation)
export async function updateProjectTagsAction(
  projectIds: string[],
  tags: string[]
) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (projectIds.length === 0) {
      return { success: false, error: 'No projects specified' }
    }

    console.log(`🏷️  Updating tags for ${projectIds.length} projects`)

    // Update all projects in a single query
    const { error } = await supabase
      .from('studio_projects')
      .update({ tags })
      .in('id', projectIds)
      .eq('instructor_id', user.id)

    if (error) {
      console.error('❌ Failed to update project tags:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Project tags updated successfully')
    revalidatePath('/instructor/studio/projects')

    return { success: true }
  } catch (error) {
    console.error('❌ Update project tags failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tags'
    }
  }
}

// Bulk delete projects
export async function bulkDeleteProjectsAction(projectIds: string[]) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (projectIds.length === 0) {
      return { success: false, error: 'No projects specified' }
    }

    console.log(`🗑️  Bulk deleting ${projectIds.length} projects`)

    // Delete all projects in a single query
    const { error } = await supabase
      .from('studio_projects')
      .delete()
      .in('id', projectIds)
      .eq('instructor_id', user.id)

    if (error) {
      console.error('❌ Failed to bulk delete projects:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Projects deleted successfully')
    revalidatePath('/instructor/studio/projects')

    return { success: true }
  } catch (error) {
    console.error('❌ Bulk delete projects failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete projects'
    }
  }
}
