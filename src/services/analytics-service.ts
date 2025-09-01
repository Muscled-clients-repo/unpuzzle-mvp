import { apiClient } from '@/lib/api-client'

export interface LearningAnalytics {
  period: string
  summary: {
    total_learning_time_minutes: number
    courses_in_progress: number
    courses_completed: number
    lessons_completed: number
    quizzes_taken: number
    average_quiz_score: number
    certificates_earned: number
  }
  daily_activity: Array<{
    date: string
    minutes_learned: number
    lessons_completed: number
    quizzes_taken: number
  }>
  course_progress: Array<{
    course_id: string
    course_title: string
    progress_percentage: number
    time_spent_minutes: number
    last_activity: string
  }>
  achievements: Array<{
    type: string
    title: string
    description: string
    earned_at: string
    icon_url?: string
  }>
}

class AnalyticsService {
  private baseUrl = '/api/v1/analytics'

  async getLearningAnalytics(period?: 'week' | 'month' | 'year' | 'all_time', courseId?: string): Promise<LearningAnalytics> {
    try {
      let endpoint = `${this.baseUrl}/learning/`
      const params: string[] = []
      if (period) params.push(`period=${period}`)
      if (courseId) params.push(`course_id=${courseId}`)
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`
      }

      const response = await apiClient.get(endpoint)
      
      const data = response.data as any
      if (!data) {
        throw new Error('Invalid analytics response')
      }
      
      return data as LearningAnalytics
    } catch (error: any) {
      console.error('Failed to fetch learning analytics:', error)
      throw new Error(error.response?.data?.error || 'Failed to load analytics.')
    }
  }
}

export const analyticsService = new AnalyticsService()