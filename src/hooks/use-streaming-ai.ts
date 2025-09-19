import { useState, useCallback } from 'react'

export interface StreamingState {
  isLoading: boolean
  streamedContent: string
  fullContent: string
  error: string | null
  isComplete: boolean
}

export interface AIStreamResult {
  // For quiz
  quiz?: {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }
  // Common
  timestamp?: number
  videoId?: string
}

export function useStreamingAI() {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    streamedContent: '',
    fullContent: '',
    error: null,
    isComplete: false
  })

  const [result, setResult] = useState<AIStreamResult | null>(null)

  const streamRequest = useCallback(async (
    endpoint: string,
    payload: any,
    onProgress?: (content: string) => void
  ) => {
    setState({
      isLoading: true,
      streamedContent: '',
      fullContent: '',
      error: null,
      isComplete: false
    })

    setResult(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split by lines and process each complete line
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                setState(prev => ({
                  ...prev,
                  streamedContent: prev.streamedContent + data.content,
                  fullContent: data.fullContent
                }))

                onProgress?.(data.content)
              } else if (data.type === 'complete') {
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  isComplete: true
                }))

                setResult(data)
              } else if (data.type === 'error') {
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: data.error
                }))
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  const streamQuiz = useCallback((
    videoId: string,
    timestamp: number,
    transcriptSegment: string,
    onProgress?: (content: string) => void
  ) => {
    return streamRequest('/api/ai/quiz', {
      videoId,
      timestamp,
      transcriptSegment
    }, onProgress)
  }, [streamRequest])


  const reset = useCallback(() => {
    setState({
      isLoading: false,
      streamedContent: '',
      fullContent: '',
      error: null,
      isComplete: false
    })
    setResult(null)
  }, [])

  return {
    ...state,
    result,
    streamQuiz,
    reset
  }
}