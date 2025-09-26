// New Goal-Based Functions to Replace Enrollment System
// File: /src/app/actions/student-learning-actions.ts

'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get courses available to student based on their current goal
 * Replaces: getEnrolledCoursesWithAnalytics()
 */
export async function getGoalBasedCoursesWithAnalytics() {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting goal-based courses for user:', user.id)

    // Step 1: Get user's current goal
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.current_goal_id) {
      console.log('[Server Action] User has no current goal assigned')
      return []
    }

    console.log('[Server Action] User goal ID:', userProfile.current_goal_id)

    // Step 2: Get courses assigned to this goal with analytics
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        status,
        total_videos,
        total_duration_minutes,
        difficulty,
        rating,
        created_at,
        updated_at,
        course_goal_assignments!inner(
          goal_id
        ),
        track_goals!course_goal_assignments(
          id,
          name,
          description,
          track_id,
          tracks(
            id,
            name,
            description
          )
        )
      `)
      .eq('course_goal_assignments.goal_id', userProfile.current_goal_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (coursesError) {
      console.error('[Server Action] Error fetching goal-based courses:', coursesError)
      return []
    }

    // Step 3: Get progress data for each course
    const coursesWithAnalytics = await Promise.all(
      (courses || []).map(async (course) => {
        // Get video progress for this course
        const { data: videoProgress } = await supabase
          .from('video_progress')
          .select('video_id, completed, progress_percentage')
          .eq('user_id', user.id)
          .in('video_id',
            // Get video IDs for this course
            await supabase
              .from('videos')
              .select('id')
              .eq('course_id', course.id)
              .then(res => res.data?.map(v => v.id) || [])
          )

        // Calculate course progress
        const totalVideos = course.total_videos || 0
        const completedVideos = videoProgress?.filter(vp => vp.completed).length || 0
        const progressPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

        // Get AI interactions count (if we keep the table)
        const { data: aiInteractions } = await supabase
          .from('ai_interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', course.id)

        return {
          // Course data
          id: course.id,
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail_url,
          status: course.status,
          totalVideos: course.total_videos,
          duration: course.total_duration_minutes,
          difficulty: course.difficulty,
          rating: course.rating,

          // Goal/Track data
          goalName: course.track_goals?.name,
          goalId: course.track_goals?.id,
          trackName: course.track_goals?.tracks?.name,
          trackId: course.track_goals?.tracks?.id,

          // Analytics data
          progress: progressPercentage,
          completedVideos,
          totalVideos,
          aiInteractionsUsed: aiInteractions?.length || 0,
          lastAccessed: null, // Can add this later if needed

          // Timestamps
          createdAt: course.created_at,
          updatedAt: course.updated_at
        }
      })
    )

    console.log('[Server Action] Found goal-based courses:', coursesWithAnalytics.length)
    return coursesWithAnalytics

  } catch (error) {
    console.error('[Server Action] Failed to get goal-based courses:', error)
    return []
  }
}

/**
 * Check if user has access to a specific course based on their goal
 * Replaces enrollment-based access checks
 */
export async function checkGoalBasedCourseAccess(courseId: string, userId?: string) {
  const supabase = await createClient()

  try {
    // Get user ID from auth if not provided
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return false
      userId = user.id
    }

    // Get user's current goal
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', userId)
      .single()

    if (!userProfile?.current_goal_id) return false

    // Check if course is assigned to user's goal
    const { data: courseGoalAssignment } = await supabase
      .from('course_goal_assignments')
      .select('id')
      .eq('course_id', courseId)
      .eq('goal_id', userProfile.current_goal_id)
      .single()

    return !!courseGoalAssignment

  } catch (error) {
    console.error('[Server Action] Error checking course access:', error)
    return false
  }
}

/**
 * Get user's current goal information
 */
export async function getCurrentGoalInfo() {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: goalInfo, error } = await supabase
      .from('profiles')
      .select(`
        current_goal_id,
        track_goals!current_goal_id(
          id,
          name,
          description,
          sort_order,
          tracks(
            id,
            name,
            description
          )
        )
      `)
      .eq('id', user.id)
      .single()

    if (error || !goalInfo) {
      return null
    }

    return {
      goalId: goalInfo.current_goal_id,
      goalName: goalInfo.track_goals?.name,
      goalDescription: goalInfo.track_goals?.description,
      goalOrder: goalInfo.track_goals?.sort_order,
      trackId: goalInfo.track_goals?.tracks?.id,
      trackName: goalInfo.track_goals?.tracks?.name,
      trackDescription: goalInfo.track_goals?.tracks?.description
    }

  } catch (error) {
    console.error('[Server Action] Failed to get current goal info:', error)
    return null
  }
}