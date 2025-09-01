import { apiClient } from '@/lib/api-client'

export interface UserEnrollment {
  enrollment_id: string
  course: {
    id: string
    title: string
    thumbnail_url?: string
    instructor: string
  }
  status: 'active' | 'completed' | 'cancelled'
  progress_percentage: number
  enrolled_at: string
  last_accessed_at?: string
  completed_at?: string
  certificate?: string
  time_spent_minutes: number
}

export interface EnrollmentResponse {
  count: number
  active_enrollments: number
  completed_courses: number
  results: UserEnrollment[]
}

class EnrollmentService {
  private baseUrl = '/api/v1/enrollments'

  async getUserEnrollments(): Promise<EnrollmentResponse> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/`)
      
      const data = response.data as any
      if (!data) {
        throw new Error('Invalid enrollments response')
      }
      
      return {
        count: data.count || 0,
        active_enrollments: data.active_enrollments || 0,
        completed_courses: data.completed_courses || 0,
        results: data.results || []
      }
    } catch (error: any) {
      console.error('Failed to fetch enrollments:', error)
      throw new Error(error.response?.data?.error || 'Failed to load enrollments.')
    }
  }
}

export const enrollmentService = new EnrollmentService()