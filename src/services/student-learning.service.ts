// src/services/student-learning.service.ts
// Step 4: Student Learning Service - Backend Connection
// This service queries the real database tables created in migrations 005-007

import { createClient } from '@/lib/supabase/client'
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
  private supabase = createClient()

  /**
   * Get all enrolled courses with full analytics for a student
   * This replaces the mock data in the student courses page
   */
  async getStudentCoursesWithAnalytics(userId: string): Promise<ServiceResult<EnrollmentWithAnalytics[]>> {
    try {
      // Query enrollments with course details and analytics
      const { data: enrollments, error } = await this.supabase
        .from('enrollments')
        .select(`
          *,
          courses!course_id (
            id,
            title,
            description,
            thumbnail_url,
            instructor_id,
            total_duration,
            difficulty,
            price,
            is_published,
            created_at,
            updated_at,
            videos (
              id,
              title,
              duration,
              sequence_num
            )
          )
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })

      if (error) {
        console.error('Error fetching enrollments:', error)
        return { error: error.message }
      }

      if (!enrollments || enrollments.length === 0) {
        return { data: [] }
      }

      // Get learning struggles for all enrolled courses
      const courseIds = enrollments.map(e => e.course_id).filter(Boolean)
      
      const { data: struggles } = await this.supabase
        .from('learning_struggles')
        .select('course_id, concept_name, difficulty_level, status')
        .eq('user_id', userId)
        .in('course_id', courseIds)
        .eq('status', 'active')

      // Get learning milestones
      const { data: milestones } = await this.supabase
        .from('learning_milestones')
        .select('course_id, title, is_achieved, progress_percent')
        .eq('user_id', userId)
        .in('course_id', courseIds)
        .eq('is_achieved', false)
        .order('sequence_order')
        .limit(1) // Get next milestone for each course

      // Map struggles and milestones to courses
      const enrichedEnrollments = enrollments.map(enrollment => {
        const courseStruggles = struggles?.filter(s => s.course_id === enrollment.course_id) || []
        const courseMilestones = milestones?.filter(m => m.course_id === enrollment.course_id) || []

        return {
          ...enrollment,
          course: enrollment.courses,
          learning_struggles: courseStruggles,
          learning_milestones: courseMilestones
        }
      })

      return { data: enrichedEnrollments as EnrollmentWithAnalytics[] }
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
      // Check if already enrolled
      const { data: existing } = await this.supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single()

      if (existing) {
        return { data: { success: true, enrollmentId: existing.id } }
      }

      // Get total videos for the course
      const { data: videos } = await this.supabase
        .from('videos')
        .select('id')
        .eq('course_id', courseId)

      const totalVideos = videos?.length || 0

      // Create new enrollment
      const { data: enrollment, error } = await this.supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          course_id: courseId,
          total_videos: totalVideos,
          progress_percent: 0,
          completed_videos: 0,
          current_lesson_title: 'Getting Started',
          estimated_time_remaining_formatted: 'Calculating...'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating enrollment:', error)
        return { error: error.message }
      }

      // Initialize learning milestones for the course
      await this.initializeCourseMilestones(userId, courseId)

      return { data: { success: true, enrollmentId: enrollment.id } }
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
      const { error } = await this.supabase
        .from('video_progress')
        .upsert({
          user_id: userId,
          course_id: courseId,
          video_id: videoId,
          progress_percent: progressPercent,
          last_position_seconds: positionSeconds,
          max_position_reached_seconds: positionSeconds,
          completed_at: progressPercent >= 95 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,video_id'
        })

      if (error) {
        console.error('Error updating video progress:', error)
        return { error: error.message }
      }

      // The database triggers will automatically update enrollment progress
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
      const { data, error } = await this.supabase
        .from('user_learning_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user stats:', error)
        return { error: error.message }
      }

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
      const { error } = await this.supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          course_id: courseId,
          video_id: videoId,
          interaction_type: interactionType,
          prompt,
          response,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error recording AI interaction:', error)
        return { error: error.message }
      }

      // The database trigger will automatically increment counters
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
      // Check if struggle already exists
      const { data: existing } = await this.supabase
        .from('learning_struggles')
        .select('id, difficulty_level')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('concept_name', conceptName)
        .eq('status', 'active')
        .single()

      if (existing) {
        // Update existing struggle
        const { error } = await this.supabase
          .from('learning_struggles')
          .update({
            difficulty_level: Math.min(5, existing.difficulty_level + 1),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) return { error: error.message }
      } else {
        // Create new struggle
        const { error } = await this.supabase
          .from('learning_struggles')
          .insert({
            user_id: userId,
            course_id: courseId,
            video_id: videoId,
            concept_name: conceptName,
            evidence_type: evidenceType,
            difficulty_level: 1,
            status: 'active'
          })

        if (error) return { error: error.message }
      }

      return { data: undefined }
    } catch (error) {
      console.error('Struggle detection error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to record struggle' }
    }
  }

  /**
   * Initialize default milestones for a course enrollment
   */
  private async initializeCourseMilestones(userId: string, courseId: string): Promise<void> {
    try {
      // Get course videos count
      const { data: videos } = await this.supabase
        .from('videos')
        .select('id')
        .eq('course_id', courseId)
        .order('sequence_num')

      const totalVideos = videos?.length || 0
      
      // Create default milestones
      const milestones = [
        {
          user_id: userId,
          course_id: courseId,
          milestone_type: 'module_completion',
          title: 'Complete first video',
          target_value: 1,
          current_value: 0,
          sequence_order: 1
        },
        {
          user_id: userId,
          course_id: courseId,
          milestone_type: 'module_completion',
          title: 'Complete 50% of course',
          target_value: Math.floor(totalVideos / 2),
          current_value: 0,
          sequence_order: 2
        },
        {
          user_id: userId,
          course_id: courseId,
          milestone_type: 'course_completion',
          title: 'Complete the course',
          target_value: totalVideos,
          current_value: 0,
          sequence_order: 3
        }
      ]

      await this.supabase
        .from('learning_milestones')
        .insert(milestones)
        
    } catch (error) {
      console.error('Error initializing milestones:', error)
      // Non-critical error, don't fail enrollment
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