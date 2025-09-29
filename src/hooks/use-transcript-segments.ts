import { useQuery } from '@tanstack/react-query'

interface TranscriptSegment {
  start: number  // seconds
  end: number    // seconds
  text: string
}

interface TranscriptData {
  id: string
  text: string
  segments: TranscriptSegment[] | null
  filePath: string | null
  status: string
  createdAt: string
}

interface TranscriptResponse {
  success: boolean
  hasTranscript: boolean
  transcript?: TranscriptData
  message?: string
  status?: string
}

async function fetchTranscriptSegments(videoId: string): Promise<TranscriptSegment[]> {
  const response = await fetch(`/api/transcription/${videoId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch transcript')
  }

  const data: TranscriptResponse = await response.json()

  if (!data.success || !data.hasTranscript || !data.transcript) {
    return []
  }

  // Return segments if available, otherwise return empty array
  return data.transcript.segments || []
}

export function useTranscriptSegments(videoId: string | null) {
  return useQuery({
    queryKey: ['transcript-segments', videoId],
    queryFn: () => fetchTranscriptSegments(videoId!),
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Utility function to extract transcript text between two time points
export function extractTranscriptSegment(
  segments: TranscriptSegment[],
  startTime: number,
  endTime: number
): { text: string; segments: TranscriptSegment[] } {
  if (!segments || segments.length === 0) {
    return { text: '', segments: [] }
  }

  // Find segments that overlap with the specified time range
  const relevantSegments = segments.filter(segment => {
    // Include segment if it overlaps with [startTime, endTime]
    return segment.start < endTime && segment.end > startTime
  })

  // If no segments found, return empty
  if (relevantSegments.length === 0) {
    return { text: '', segments: [] }
  }

  // Sort by start time to ensure proper order
  relevantSegments.sort((a, b) => a.start - b.start)

  // Extract text from relevant segments
  const extractedText = relevantSegments
    .map(segment => segment.text.trim())
    .join(' ')
    .trim()

  return {
    text: extractedText,
    segments: relevantSegments
  }
}