import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface VideoSummary {
  id: string
  content: string
  keyTopics: string[]
  mainConcepts: string[]
  duration: number
  summaryLength: string
  generatedAt: string
}

export function useVideoSummary(videoId: string | null) {
  return useQuery({
    queryKey: ['video-summary', videoId],
    queryFn: async (): Promise<VideoSummary | null> => {
      // DISABLED: AI summary feature not needed for now
      // Prevents 400 error from trying to select non-existent ai_summary column
      console.log('[VIDEO SUMMARY] Feature disabled - ai_summary column not available')
      return null
    },
    enabled: false, // Completely disable the query
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60 * 24,
  })
}