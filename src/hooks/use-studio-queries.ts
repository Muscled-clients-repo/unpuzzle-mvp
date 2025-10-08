"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveStudioProjectAction,
  getStudioProjectAction,
  getStudioProjectsAction,
  deleteStudioProjectAction,
  saveRecordingToMediaAction,
  exportTimelineToMediaAction,
  publishStudioProjectAction
} from '@/app/actions/studio-actions'
import { toast } from 'sonner'
import { Clip, Track } from '@/lib/video-editor/types'

export interface StudioProject {
  id: string
  instructor_id: string
  title: string
  description: string | null
  timeline_state: {
    clips: Clip[]
    tracks: Track[]
    totalFrames: number
    fps?: number
  }
  is_draft: boolean | null
  last_export_id: string | null
  last_exported_at: string | null
  created_at: string | null
  updated_at: string | null
}

// List projects
export function useStudioProjects(options?: { draftsOnly?: boolean }) {
  return useQuery({
    queryKey: ['studio-projects', options?.draftsOnly],
    queryFn: async () => {
      const result = await getStudioProjectsAction(options)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch studio projects')
      }
      return result.projects
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })
}

// Load single project
export function useStudioProject(projectId: string | null) {
  return useQuery({
    queryKey: ['studio-project', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const result = await getStudioProjectAction(projectId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch studio project')
      }
      return result.project
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })
}

// Save project mutation (auto-save and manual save)
export function useSaveStudioProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id?: string
      title?: string
      description?: string
      timeline_state: {
        clips: Clip[]
        tracks: Track[]
        totalFrames: number
        fps?: number
      }
      is_draft?: boolean
    }) => {
      const result = await saveStudioProjectAction(data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to save project')
      }
      return result.project
    },

    onSuccess: (project, variables) => {
      // Only show toast for manual saves (not auto-saves)
      if (variables.is_draft === false || variables.title) {
        toast.success(`✅ Project "${project.title}" saved successfully`)
      }

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })

      // Update single project cache
      if (project.id) {
        queryClient.setQueryData(['studio-project', project.id], project)
      }
    },

    onError: (error) => {
      console.error('Save studio project error:', error)
      toast.error(`❌ Failed to save project: ${error.message}`)
    }
  })
}

// Delete project mutation
export function useDeleteStudioProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await deleteStudioProjectAction(projectId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }
      return result
    },

    onSuccess: (_, projectId) => {
      toast.success('✅ Project deleted successfully')

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })

      // Remove from single project cache
      queryClient.removeQueries({ queryKey: ['studio-project', projectId] })
    },

    onError: (error) => {
      console.error('Delete studio project error:', error)
      toast.error(`❌ Failed to delete project: ${error.message}`)
    }
  })
}

// Publish project mutation (convert draft to published)
export function usePublishStudioProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await publishStudioProjectAction(projectId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to publish project')
      }
      return result.project
    },

    onSuccess: (project) => {
      toast.success(`✅ Project "${project.title}" published successfully`)

      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })

      // Update single project cache
      if (project.id) {
        queryClient.setQueryData(['studio-project', project.id], project)
      }
    },

    onError: (error) => {
      console.error('Publish studio project error:', error)
      toast.error(`❌ Failed to publish project: ${error.message}`)
    }
  })
}

// Save recording to media library
export function useSaveRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      blob,
      metadata
    }: {
      blob: Blob
      metadata: {
        name: string
        track_type: 'video' | 'audio'
        duration_ms: number
        clip_id: string
        project_id?: string
      }
    }) => {
      const formData = new FormData()
      const file = new File([blob], `${metadata.name}.webm`, { type: blob.type })
      formData.append('file', file)

      const result = await saveRecordingToMediaAction(formData, metadata)
      if (!result.success) {
        throw new Error(result.error || 'Failed to save recording')
      }
      return result
    },

    onSuccess: (result, { metadata }) => {
      toast.success(`✅ Recording "${metadata.name}" saved to media library`)

      // Invalidate media files to show new recording
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    },

    onError: (error, { metadata }) => {
      console.error('Save recording error:', error)
      toast.error(`❌ Failed to save recording "${metadata.name}": ${error.message}`)
    }
  })
}

// Export timeline to media library
export function useExportTimeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      blob,
      metadata
    }: {
      blob: Blob
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
    }) => {
      const formData = new FormData()
      const file = new File([blob], `${metadata.title}.mp4`, { type: 'video/mp4' })
      formData.append('file', file)

      const result = await exportTimelineToMediaAction(formData, metadata)
      if (!result.success) {
        throw new Error(result.error || 'Failed to export timeline')
      }
      return result
    },

    onSuccess: (result, { metadata }) => {
      toast.success(`✅ Timeline "${metadata.title}" exported to media library`)

      // Invalidate media files to show new export
      queryClient.invalidateQueries({ queryKey: ['media-files'] })

      // Invalidate studio projects to update last_export_id
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })

      // Update single project cache if project_id provided
      if (metadata.project_id) {
        queryClient.invalidateQueries({ queryKey: ['studio-project', metadata.project_id] })
      }
    },

    onError: (error, { metadata }) => {
      console.error('Export timeline error:', error)
      toast.error(`❌ Failed to export timeline "${metadata.title}": ${error.message}`)
    }
  })
}
