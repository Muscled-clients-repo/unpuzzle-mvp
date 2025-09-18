import { useQuery } from '@tanstack/react-query'

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

interface TranscriptData {
  id: string
  text: string
  segments?: TranscriptSegment[]
  wordCount: number
  language: string
  confidence?: number
  createdAt: string
}

interface TranscriptResponse {
  success: boolean
  hasTranscript: boolean
  transcript?: TranscriptData
  message?: string
}

// TanStack Query keys for transcript data
export const transcriptKeys = {
  all: ['transcripts'] as const,
  video: (videoId: string) => [...transcriptKeys.all, 'video', videoId] as const,
}

/**
 * ARCHITECTURE-COMPLIANT: TanStack Query hook for transcript data
 * Responsibilities:
 * - Fetch transcript data from server
 * - Cache transcript data with background refetch
 * - Handle network errors and retry logic
 * - Manage loading and error states
 */
export function useTranscriptQuery(videoId: string) {
  return useQuery({
    queryKey: transcriptKeys.video(videoId),
    queryFn: async (): Promise<TranscriptResponse> => {
      const response = await fetch(`/api/transcription/${videoId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            hasTranscript: false,
            message: 'Video not found'
          }
        }

        if (response.status === 403) {
          throw new Error('Unauthorized access to transcript')
        }

        throw new Error(`Failed to fetch transcript: ${response.status}`)
      }

      return response.json()
    },
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes - transcripts don't change often
    retry: (failureCount, error) => {
      // Don't retry unauthorized errors
      if (error.message.includes('Unauthorized')) {
        return false
      }
      // Retry network errors up to 3 times
      return failureCount < 3
    },
    refetchOnWindowFocus: false, // Transcripts are static once uploaded
  })
}

/**
 * Helper hook to get transcript segments for time-based highlighting
 * Returns null if no segments available (plain text transcript)
 */
export function useTranscriptSegments(videoId: string): TranscriptSegment[] | null {
  const { data } = useTranscriptQuery(videoId)

  if (!data?.hasTranscript || !data.transcript?.segments) {
    return null
  }

  return data.transcript.segments
}

/**
 * Helper hook to get plain transcript text
 */
export function useTranscriptText(videoId: string): string | null {
  const { data } = useTranscriptQuery(videoId)

  if (!data?.hasTranscript || !data.transcript?.text) {
    return null
  }

  return data.transcript.text
}

/**
 * Helper to find active segment based on current video time
 */
export function findActiveSegment(
  segments: TranscriptSegment[] | null,
  currentTime: number
): number | null {
  if (!segments || !Array.isArray(segments)) return null

  const activeIndex = segments.findIndex(
    segment => currentTime >= segment.start && currentTime <= segment.end
  )

  return activeIndex >= 0 ? activeIndex : null
}

/**
 * Helper to extract transcript segments from API response
 * Handles both direct and nested segment structures
 */
export function extractTranscriptSegments(data: TranscriptResponse): TranscriptSegment[] {
  if (!data.success || !data.hasTranscript || !data.transcript?.segments) {
    return []
  }

  // Direct segments structure
  if (Array.isArray(data.transcript.segments)) {
    return data.transcript.segments
  }

  // Nested segments structure
  if (data.transcript.segments.segments && Array.isArray(data.transcript.segments.segments)) {
    return data.transcript.segments.segments
  }

  return []
}

/**
 * Helper to get transcript text for AI context at specific timestamp
 * Used by AI agents to get relevant transcript content
 */
export async function getTranscriptContextForAI(videoId: string, timestamp: number): Promise<string> {
  try {
    const response = await fetch(`/api/transcription/${videoId}`)

    if (!response.ok) {
      if (response.status === 404) return "No transcript available"
      if (response.status === 403) return "Transcript unavailable"
      throw new Error(`Failed to fetch transcript: ${response.status}`)
    }

    const data: TranscriptResponse = await response.json()
    const segments = extractTranscriptSegments(data)

    if (segments.length === 0) {
      return "No transcript available"
    }

    // Find exact segment at timestamp
    const exactSegment = segments.find(s =>
      timestamp >= s.start && timestamp <= s.end
    )

    if (exactSegment) {
      return exactSegment.text
    }

    // Get surrounding context (±10 seconds)
    const contextSegments = segments.filter(s =>
      s.start >= timestamp - 10 && s.start <= timestamp + 10
    )

    if (contextSegments.length > 0) {
      return contextSegments.map(s => s.text).join(' ')
    }

    return "No transcript available"
  } catch (error) {
    console.error('Failed to fetch transcript context for AI:', error)
    return "Transcript unavailable"
  }
}