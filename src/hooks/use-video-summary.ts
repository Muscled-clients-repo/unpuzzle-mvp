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
      if (!videoId) return null

      const supabase = createClient()

      const { data, error } = await supabase
        .from('videos')
        .select('ai_summary')
        .eq('id', videoId)
        .single()

      if (error) {
        console.error('Error fetching video summary:', error)
        return null
      }

      if (!data?.ai_summary) {
        return null
      }

      return data.ai_summary as VideoSummary
    },
    enabled: !!videoId,
    staleTime: 1000 * 60 * 60, // 1 hour - summaries don't change often
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}