// src/services/student-video-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { 
  StudentVideoData, 
  VideoProgress, 
  Reflection, 
  Quiz, 
  ServiceResult,
  VideoSegment,
  AIMessage,
  AIChat
} from '@/types/domain'

export class StudentVideoService {
  async getVideoWithStudentData(videoId: string): Promise<ServiceResult<StudentVideoData>> {
    if (useMockData) {
      // Return mock data with student features
      return { 
        data: {
          id: videoId,
          courseId: 'course-1',
          title: 'React Hooks Deep Dive',
          description: 'Learn all about React hooks including useState, useEffect, and custom hooks',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
          duration: 1200,
          order: 1,
          aiContextEnabled: true,
          progress: {
            userId: 'user-1',
            videoId: videoId,
            watchedSeconds: 540,
            totalSeconds: 1200,
            percentComplete: 45,
            lastWatchedAt: new Date().toISOString(),
            reflectionCount: 2
          },
          reflections: [
            {
              id: 'ref-1',
              userId: 'user-1',
              videoId: videoId,
              content: 'I understand hooks are functions that let us use state in functional components',
              timestamp: 120,
              timeInSeconds: 120,
              type: 'text',
              sentiment: 'positive',
              status: 'responded',
              response: 'Exactly right! Hooks revolutionized React development.',
              createdAt: new Date().toISOString()
            }
          ],
          quizzes: [
            {
              id: 'quiz-1',
              videoId: videoId,
              timestamp: 300,
              question: 'What is the primary purpose of useState?',
              options: [
                'To fetch data from an API',
                'To manage local component state',
                'To handle side effects',
                'To optimize performance'
              ],
              correctAnswer: 1,
              explanation: 'useState is specifically designed to manage local state in functional components',
              difficulty: 'easy'
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as StudentVideoData
      }
    }

    const response = await apiClient.get<StudentVideoData>(`/api/student/videos/${videoId}`)
    return response.error 
      ? { error: response.error }
      : { data: response.data }
  }

  async saveReflection(reflection: Partial<Reflection>): Promise<ServiceResult<Reflection>> {
    if (useMockData) {
      return { 
        data: { 
          ...reflection, 
          id: `ref-${Date.now()}`,
          userId: 'user-1',
          videoId: reflection.videoId || '',
          content: reflection.content || '',
          timestamp: reflection.timestamp || 0,
          timeInSeconds: reflection.timeInSeconds || 0,
          type: reflection.type || 'text',
          status: 'unresponded',
          createdAt: new Date().toISOString() 
        } as Reflection
      }
    }

    const response = await apiClient.post<Reflection>('/api/reflections', reflection)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async submitQuizAnswer(
    quizId: string, 
    answer: number
  ): Promise<ServiceResult<{ correct: boolean; explanation: string }>> {
    if (useMockData) {
      return { 
        data: { 
          correct: answer === 1, 
          explanation: answer === 1 
            ? 'Correct! useState is indeed for managing local component state.' 
            : 'Not quite. useState is specifically for managing local component state.'
        }
      }
    }

    const response = await apiClient.post(`/api/quizzes/${quizId}/answer`, { answer })
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async updateProgress(progress: Partial<VideoProgress>): Promise<ServiceResult<void>> {
    if (useMockData) {
      // Just log in dev
      console.log('Progress update:', progress)
      return { data: undefined }
    }

    const response = await apiClient.post('/api/progress', progress)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  async createVideoSegment(segment: VideoSegment): Promise<ServiceResult<VideoSegment>> {
    if (useMockData) {
      console.log('Creating video segment:', segment)
      return { data: segment }
    }

    const response = await apiClient.post<VideoSegment>('/api/segments', segment)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async sendAIMessage(
    videoId: string, 
    message: string, 
    context?: VideoSegment
  ): Promise<ServiceResult<AIMessage>> {
    if (useMockData) {
      // Simulate AI response
      const aiResponse: AIMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're asking about the video segment from ${context?.inPoint || 0} to ${context?.outPoint || 0} seconds. Let me help you understand this concept better.`,
        timestamp: new Date().toISOString(),
        videoContext: context,
        intent: 'conceptual'
      }
      return { data: aiResponse }
    }

    const response = await apiClient.post<AIMessage>('/api/ai/chat', {
      videoId,
      message,
      context
    })
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getAIChatHistory(videoId: string): Promise<ServiceResult<AIChat>> {
    if (useMockData) {
      return {
        data: {
          id: `chat-${videoId}`,
          userId: 'user-1',
          videoId,
          messages: [],
          contextSegments: [],
          createdAt: new Date().toISOString()
        }
      }
    }

    const response = await apiClient.get<AIChat>(`/api/ai/chats/${videoId}`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
}

export const studentVideoService = new StudentVideoService()