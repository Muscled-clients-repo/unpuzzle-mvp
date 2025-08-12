// src/services/instructor-video-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { 
  InstructorVideoData, 
  StudentActivity, 
  VideoMetrics, 
  ServiceResult,
  ConfusionHotspot,
  Reflection
} from '@/types/domain'

export class InstructorVideoService {
  async getVideoWithInstructorData(
    videoId: string, 
    studentId?: string
  ): Promise<ServiceResult<InstructorVideoData>> {
    if (useMockData) {
      // Mock data for instructor view
      const mockActivities: StudentActivity[] = [
        {
          studentId: 'sarah_chen',
          studentName: 'Sarah Chen',
          videoId,
          timestamp: 135,
          type: 'confusion',
          content: 'Not clear about useCallback vs useMemo',
          needsResponse: true
        },
        {
          studentId: 'alex_rivera',
          studentName: 'Alex Rivera',
          videoId,
          timestamp: 240,
          type: 'reflection',
          content: 'I think useEffect is like componentDidMount and componentDidUpdate combined',
          needsResponse: true
        },
        {
          studentId: 'jamie_park',
          studentName: 'Jamie Park',
          videoId,
          timestamp: 360,
          type: 'quiz_attempt',
          content: 'Quiz completed: 3/4 correct',
          needsResponse: false
        }
      ]

      // Filter by student if specified
      const studentActivity = studentId && studentId !== 'all'
        ? mockActivities.filter(a => a.studentId === studentId)
        : mockActivities

      return {
        data: {
          id: videoId,
          courseId: 'course-1',
          title: 'React Hooks Deep Dive',
          description: 'Learn all about React hooks',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
          duration: 1200,
          order: 1,
          studentActivity,
          confusionHotspots: [
            { 
              timestamp: 135, 
              studentCount: 3, 
              topic: 'useCallback vs useMemo', 
              resolved: false 
            },
            { 
              timestamp: 420, 
              studentCount: 2, 
              topic: 'Custom hooks', 
              resolved: true 
            }
          ],
          aggregateMetrics: {
            totalViews: 45,
            avgWatchTime: 720,
            completionRate: 0.65,
            confusionPoints: [],
            quizPassRate: 0.78,
            reflectionCount: 23
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as InstructorVideoData
      }
    }

    const endpoint = studentId 
      ? `/api/instructor/videos/${videoId}?student=${studentId}`
      : `/api/instructor/videos/${videoId}`
      
    const response = await apiClient.get<InstructorVideoData>(endpoint)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async respondToReflection(
    reflectionId: string, 
    response: string
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      console.log('Response to reflection:', reflectionId, response)
      return { data: undefined }
    }

    const result = await apiClient.post(`/api/reflections/${reflectionId}/respond`, { response })
    return result.error
      ? { error: result.error }
      : { data: undefined }
  }

  async getStudentActivities(
    videoId: string,
    filters?: {
      studentId?: string
      type?: StudentActivity['type']
      needsResponse?: boolean
    }
  ): Promise<ServiceResult<StudentActivity[]>> {
    if (useMockData) {
      // Return filtered mock activities
      let activities: StudentActivity[] = [
        {
          studentId: 'sarah_chen',
          studentName: 'Sarah Chen',
          videoId,
          timestamp: 135,
          type: 'confusion',
          content: 'Not clear about useCallback',
          needsResponse: true
        },
        {
          studentId: 'alex_rivera',
          studentName: 'Alex Rivera',
          videoId,
          timestamp: 240,
          type: 'reflection',
          content: 'Great explanation of hooks',
          needsResponse: false
        }
      ]

      if (filters?.studentId) {
        activities = activities.filter(a => a.studentId === filters.studentId)
      }
      if (filters?.type) {
        activities = activities.filter(a => a.type === filters.type)
      }
      if (filters?.needsResponse !== undefined) {
        activities = activities.filter(a => a.needsResponse === filters.needsResponse)
      }

      return { data: activities }
    }

    const params = new URLSearchParams()
    if (filters?.studentId) params.append('student', filters.studentId)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.needsResponse !== undefined) params.append('needsResponse', String(filters.needsResponse))
    
    const endpoint = `/api/instructor/videos/${videoId}/activities${params.toString() ? `?${params}` : ''}`
    const response = await apiClient.get<StudentActivity[]>(endpoint)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getVideoMetrics(videoId: string): Promise<ServiceResult<VideoMetrics>> {
    if (useMockData) {
      return {
        data: {
          totalViews: 156,
          avgWatchTime: 840,
          completionRate: 0.72,
          confusionPoints: [
            { timestamp: 135, studentCount: 5, topic: 'useCallback', resolved: false },
            { timestamp: 420, studentCount: 3, topic: 'Custom hooks', resolved: true }
          ],
          quizPassRate: 0.81,
          reflectionCount: 42
        }
      }
    }

    const response = await apiClient.get<VideoMetrics>(`/api/instructor/videos/${videoId}/metrics`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async resolveConfusionHotspot(
    videoId: string,
    timestamp: number
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      console.log('Marking confusion hotspot as resolved:', videoId, timestamp)
      return { data: undefined }
    }

    const response = await apiClient.post(`/api/instructor/videos/${videoId}/hotspots/resolve`, {
      timestamp
    })
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  async getStudentReflections(
    videoId: string,
    studentId: string
  ): Promise<ServiceResult<Reflection[]>> {
    if (useMockData) {
      return {
        data: [
          {
            id: 'ref-1',
            userId: studentId,
            videoId,
            content: 'Understanding hooks better now',
            timestamp: 120,
            timeInSeconds: 120,
            type: 'text',
            status: 'responded',
            response: 'Great progress!',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ref-2',
            userId: studentId,
            videoId,
            content: 'Confused about dependency arrays',
            timestamp: 300,
            timeInSeconds: 300,
            type: 'text',
            status: 'unresponded',
            createdAt: new Date().toISOString()
          }
        ]
      }
    }

    const response = await apiClient.get<Reflection[]>(
      `/api/instructor/videos/${videoId}/students/${studentId}/reflections`
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
}

export const instructorVideoService = new InstructorVideoService()