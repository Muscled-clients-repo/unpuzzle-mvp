// src/services/student-learning.service.ts
// Step 4: Student Learning Service - Backend Connection
// This service queries the real database tables created in migrations 005-007

// Removed client import - now uses server actions
import type { ServiceResult } from '@/types/domain'

// ============================================================
// TYPES FOR DATABASE RESPONSE
// ============================================================
interface EnrollmentWithAnalytics {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  progress_percent: number
  completed_videos: number
  total_videos: number
  current_lesson_title: string
  current_video_id: string | null
  estimated_time_remaining_formatted: string
  ai_interactions_count: number
  last_accessed_at: string
  completed_at: string | null
  
  // Relations
  course: {
    id: string
    title: string
    description: string
    thumbnail_url: string
    instructor_id: string
    total_duration: number
    difficulty: string
    price: number
    is_published: boolean
    created_at: string
    updated_at: string
    videos: Array<{
      id: string
      title: string
      duration: number
      sequence_num: number
    }>
  }
  
  // Aggregated analytics
  learning_struggles?: Array<{
    concept_name: string
    difficulty_level: number
    status: string
  }>
  
  learning_milestones?: Array<{
    title: string
    is_achieved: boolean
    progress_percent: number
  }>
}

interface VideoProgressData {
  id: string
  user_id: string
  video_id: string
  course_id: string
  progress_percent: number
  last_position_seconds: number
  total_watch_time_seconds: number
  completed_at: string | null
  updated_at: string
}

interface UserLearningStatsData {
  user_id: string
  total_courses_enrolled: number
  active_courses_count: number
  completed_courses_count: number
  total_videos_completed: number
  total_watch_time_formatted: string
  total_ai_interactions: number
  average_completion_rate: number
  updated_at: string
}

// ============================================================
// SERVICE CLASS
// ============================================================
export class StudentLearningService {
  // No longer needs direct Supabase client - uses server actions

  /**
   * Get all enrolled courses with full analytics for a student
   * This replaces the mock data in the student courses page
   */
  async getStudentCoursesWithAnalytics(userId: string): Promise<ServiceResult<EnrollmentWithAnalytics[]>> {
    try {
      // Use server action instead of direct client query
      const { getEnrolledCoursesWithAnalytics } = await import('@/app/actions/student-learning-actions')
      const data = await getEnrolledCoursesWithAnalytics()
      
      return {
        success: true,
        data: data as EnrollmentWithAnalytics[]
      }
    } catch (error) {
      console.error('Service error:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
  }

  /**
   * Get or create enrollment for a course
   */
  async enrollInCourse(userId: string, courseId: string): Promise<ServiceResult<{ success: boolean; enrollmentId: string }>> {
    try {
      // Use server action instead of direct client query
      const { enrollInCourse } = await import('@/app/actions/student-learning-actions')
      const result = await enrollInCourse(courseId)
      
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to enroll in course' }
    }
  }

  /**
   * Update video progress and trigger calculations
   */
  async updateVideoProgress(
    userId: string,
    courseId: string,
    videoId: string,
    progressPercent: number,
    positionSeconds: number
  ): Promise<ServiceResult<void>> {
    try {
      // Use server action instead of direct client query
      const { updateVideoProgress } = await import('@/app/actions/student-learning-actions')
      const success = await updateVideoProgress(videoId, positionSeconds, positionSeconds * 100 / progressPercent)
      
      if (!success) {
        return { error: 'Failed to update progress' }
      }

      return { data: undefined }
    } catch (error) {
      console.error('Progress update error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to update progress' }
    }
  }

  /**
   * Get user learning statistics
   */
  async getUserLearningStats(userId: string): Promise<ServiceResult<UserLearningStatsData | null>> {
    try {
      // Use server action instead of direct client query
      const { getUserLearningStats } = await import('@/app/actions/student-learning-actions')
      const data = await getUserLearningStats()
      
      return { data }
    } catch (error) {
      console.error('Stats fetch error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to fetch stats' }
    }
  }

  /**
   * Record AI interaction
   */
  async recordAIInteraction(
    userId: string,
    courseId: string,
    videoId: string | null,
    interactionType: string,
    prompt: string,
    response: string
  ): Promise<ServiceResult<void>> {
    try {
      // Use server action instead of direct client query
      const { recordAIInteraction } = await import('@/app/actions/student-learning-actions')
      const result = await recordAIInteraction(courseId, '', videoId || '', prompt, response, interactionType)
      
      if (!result) {
        return { error: 'Failed to record interaction' }
      }

      return { data: undefined }
    } catch (error) {
      console.error('AI interaction error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to record interaction' }
    }
  }

  /**
   * Detect and record learning struggle
   */
  async detectLearningStruggle(
    userId: string,
    courseId: string,
    videoId: string,
    conceptName: string,
    evidenceType: 'multiple_rewinds' | 'pause_duration' | 'ai_help_requests' | 'quiz_failures' | 'slow_progress'
  ): Promise<ServiceResult<void>> {
    try {
      // Use server action instead of direct client query
      const { detectLearningStruggle } = await import('@/app/actions/student-learning-actions')
      const result = await detectLearningStruggle(courseId, videoId, conceptName, evidenceType)
      
      if (!result) {
        return { error: 'Failed to record struggle' }
      }

      return { data: undefined }
    } catch (error) {
      console.error('Struggle detection error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to record struggle' }
    }
  }

  /**
   * Transform enrollment data to match UI expectations
   * This maps database structure to the format expected by the UI components
   */
  transformToUIFormat(enrollments: EnrollmentWithAnalytics[]) {
    return enrollments.map(enrollment => ({
      courseId: enrollment.course_id,
      progress: enrollment.progress_percent,
      lastAccessed: this.formatTimeAgo(enrollment.last_accessed_at),
      completedLessons: enrollment.completed_videos,
      totalLessons: enrollment.total_videos,
      currentLesson: enrollment.current_lesson_title,
      estimatedTimeLeft: enrollment.estimated_time_remaining_formatted,
      aiInteractionsUsed: enrollment.ai_interactions_count,
      strugglingTopics: enrollment.learning_struggles?.map(s => s.concept_name) || [],
      nextMilestone: enrollment.learning_milestones?.[0]?.title || 'Continue learning',
      
      // Course details
      course: enrollment.course
    }))
  }

  /**
   * Format timestamp to "X hours/days ago" format
   */
  private formatTimeAgo(timestamp: string): string {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return `${Math.floor(diffDays / 7)} weeks ago`
  }
}

// Export singleton instance
export const studentLearningService = new StudentLearningService()