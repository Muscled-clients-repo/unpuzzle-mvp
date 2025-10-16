'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Activity Timeline Types
 */
export interface Activity {
  id: string
  user_id: string
  activity_type: string
  content: string | null
  goal_id: string | null
  goal_title: string | null
  media_file_id: string | null
  video_title: string | null
  course_id: string | null
  timestamp_seconds: number | null
  reflection_id: string | null
  quiz_attempt_id: string | null
  ai_conversation_id: string | null
  conversation_message_id: string | null
  metadata: Record<string, any> | null
  is_public: boolean | null
  activity_date: string | null
  created_at: string
  updated_at: string | null
  // Joined profile data
  student_name?: string
  student_email?: string
  student_avatar?: string
}

export interface DailyActivities {
  date: string
  activity_count: number
  activities: Activity[]
}

export interface GoalActivities {
  goal_id: string
  goal_name: string
  goal_started_at: string | null
  goal_achieved_at: string | null
  total_activities: number
  reflections_count: number
  quizzes_count: number
  courses_completed: number
  activities: Activity[]
}

// ============================================================
// USE CASE 1: Student Journey Tab (Instructor Video Page)
// ============================================================

/**
 * Get activities for a specific student on a specific video
 * Used in: Instructor Video Page - Student Journey Tab
 */
export async function getStudentVideoActivities(params: {
  videoId: string
  studentId: string
}): Promise<{ data: Activity[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Access denied' }
    }

    // Fetch activities for specific student on specific video
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select(`
        *,
        profiles!community_activities_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('media_file_id', params.videoId)
      .eq('user_id', params.studentId)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching student video activities:', error)
      return { data: null, error: error.message }
    }

    // Transform data to include student info
    const transformedActivities = activities.map((activity: any) => ({
      ...activity,
      student_name: activity.profiles?.full_name,
      student_email: activity.profiles?.email,
      student_avatar: activity.profiles?.avatar_url,
    }))

    return { data: transformedActivities, error: null }
  } catch (error) {
    console.error('Error in getStudentVideoActivities:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get activities for ALL students on a specific video
 * Used in: Instructor Video Page - Student Journey Tab (View All mode)
 */
export async function getAllStudentsVideoActivities(params: {
  videoId: string
}): Promise<{ data: Activity[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Access denied' }
    }

    // Fetch activities for all students on specific video
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select(`
        *,
        profiles!community_activities_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('media_file_id', params.videoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all students video activities:', error)
      return { data: null, error: error.message }
    }

    // Transform data to include student info
    const transformedActivities = activities.map((activity: any) => ({
      ...activity,
      student_name: activity.profiles?.full_name,
      student_email: activity.profiles?.email,
      student_avatar: activity.profiles?.avatar_url,
    }))

    return { data: transformedActivities, error: null }
  } catch (error) {
    console.error('Error in getAllStudentsVideoActivities:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

// ============================================================
// USE CASE 2: Goal Conversations (Daily Activity View)
// ============================================================

/**
 * Get activities for a specific student on a specific day
 * Used in: Goal Conversations - Daily activity view
 */
export async function getStudentDailyActivities(params: {
  studentId: string
  date: string // YYYY-MM-DD format
}): Promise<{ data: Activity[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is the student or an instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isInstructor = profile && ['instructor', 'admin'].includes(profile.role)
    const isOwnProfile = user.id === params.studentId

    if (!isInstructor && !isOwnProfile) {
      return { data: null, error: 'Access denied' }
    }

    // Fetch activities for specific day
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select('*')
      .eq('user_id', params.studentId)
      .eq('activity_date', params.date)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching student daily activities:', error)
      return { data: null, error: error.message }
    }

    return { data: activities, error: null }
  } catch (error) {
    console.error('Error in getStudentDailyActivities:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get activities grouped by day for a student (past N days)
 * Used in: Goal Conversations - Weekly/monthly overview
 */
export async function getStudentActivitiesByDay(params: {
  studentId: string
  days?: number // Default 7 days
}): Promise<{ data: DailyActivities[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is the student or an instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isInstructor = profile && ['instructor', 'admin'].includes(profile.role)
    const isOwnProfile = user.id === params.studentId

    if (!isInstructor && !isOwnProfile) {
      return { data: null, error: 'Access denied' }
    }

    const daysBack = params.days || 7

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Fetch activities for date range
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select('*')
      .eq('user_id', params.studentId)
      .gte('activity_date', startDateStr)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching student activities by day:', error)
      return { data: null, error: error.message }
    }

    // Group by day
    const grouped = activities.reduce((acc: Record<string, Activity[]>, activity: Activity) => {
      const date = activity.activity_date || 'unknown'
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(activity)
      return acc
    }, {})

    // Transform to array format
    const result: DailyActivities[] = Object.entries(grouped)
      .map(([date, activities]) => ({
        date,
        activity_count: activities.length,
        activities,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return { data: result, error: null }
  } catch (error) {
    console.error('Error in getStudentActivitiesByDay:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

// ============================================================
// USE CASE 3: Community/Goals Page (Activities Per Goal)
// ============================================================

/**
 * PUBLIC ENDPOINT - No authentication required
 * Get activities for ALL featured students in a single query
 * OPTIMIZED: Single database query for all 3 students instead of 3 separate queries
 * Used in: Community/Goals Page - Featured students showcase
 *
 * Security: RLS policies ensure only is_public=true activities are returned.
 * Guest users can view this data as it's meant for public showcase.
 */
export async function getAllFeaturedStudentsActivities(): Promise<{
  data: Record<string, GoalActivities[]> | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // STEP 1: Get featured students (should be cached or fast query with index)
    const { data: featuredStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_featured', true)
      .order('featured_order')

    if (studentsError || !featuredStudents || featuredStudents.length === 0) {
      return { data: null, error: studentsError?.message || 'No featured students found' }
    }

    const studentIds = featuredStudents.map(s => s.id)

    // STEP 2: Fetch stats for ALL featured students in ONE query
    const { data: stats, error: statsError } = await supabase
      .from('goal_activity_stats')
      .select('*')
      .in('user_id', studentIds)

    if (statsError) {
      console.error('Error fetching goal stats:', statsError)
    }

    // STEP 3: Fetch activities for ALL featured students in ONE query
    const { data: activities, error: activitiesError } = await supabase
      .from('community_activities')
      .select('id, user_id, activity_type, goal_id, goal_title, video_title, created_at, timestamp_seconds')
      .in('user_id', studentIds)
      .not('goal_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1500) // 500 per student * 3

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return { data: null, error: activitiesError.message }
    }

    // STEP 4: Group activities by user_id, then by goal_id
    const activitiesByUser: Record<string, Activity[]> = {}
    activities.forEach((activity: Activity) => {
      if (!activitiesByUser[activity.user_id]) {
        activitiesByUser[activity.user_id] = []
      }
      activitiesByUser[activity.user_id].push(activity)
    })

    // STEP 5: Batch fetch goal names from track_goals for any missing titles
    const allGoalIds = [...new Set(activities.map(a => a.goal_id).filter(Boolean) as string[])]
    const { data: goalTitles } = await supabase
      .from('track_goals')
      .select('id, name')
      .in('id', allGoalIds)

    const goalTitlesMap = goalTitles ? new Map(goalTitles.map(g => [g.id, g.name])) : new Map()

    // STEP 6: Transform to GoalActivities format per student
    const statsMap = stats ? new Map(stats.map(s => [`${s.user_id}-${s.goal_id}`, s])) : new Map()
    const result: Record<string, GoalActivities[]> = {}

    for (const studentId of studentIds) {
      const studentActivities = activitiesByUser[studentId] || []

      // Group by goal
      const grouped = studentActivities.reduce((acc: Record<string, Activity[]>, activity: Activity) => {
        const goalId = activity.goal_id || 'unknown'
        if (!acc[goalId]) {
          acc[goalId] = []
        }
        acc[goalId].push(activity)
        return acc
      }, {})

      // Transform to GoalActivities array
      const goalActivities: GoalActivities[] = Object.entries(grouped).map(([goalId, activities]) => {
        const preCalcStats = statsMap.get(`${studentId}-${goalId}`)
        // Get goal name from: activity.goal_title → track_goals → fallback
        const goalName = activities[0]?.goal_title || goalTitlesMap.get(goalId) || `Goal ${goalId.slice(0, 8)}`
        const goalStartActivity = activities.find((a) => a.activity_type === 'new_goal_entered')
        const goalAchievedActivity = activities.find((a) => a.activity_type === 'goal_achieved')

        return {
          goal_id: goalId,
          goal_name: goalName,
          goal_started_at: preCalcStats?.first_activity_at || goalStartActivity?.created_at || activities[0]?.created_at || null,
          goal_achieved_at: goalAchievedActivity?.created_at || null,
          total_activities: preCalcStats?.total_activities || activities.length,
          reflections_count: preCalcStats?.reflections_count || activities.filter((a) =>
            ['text', 'screenshot', 'voice', 'loom'].includes(a.activity_type)
          ).length,
          quizzes_count: preCalcStats?.quizzes_count || activities.filter((a) => a.activity_type === 'quiz').length,
          courses_completed: preCalcStats?.courses_completed || activities.filter((a) => a.activity_type === 'course_completion').length,
          activities,
        }
      })

      // Sort by start date
      goalActivities.sort(
        (a, b) =>
          new Date(a.goal_started_at || 0).getTime() - new Date(b.goal_started_at || 0).getTime()
      )

      result[studentId] = goalActivities
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Error in getAllFeaturedStudentsActivities:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get activities for a specific student's current goal
 * Used in: Community/Goals Page - Current goal timeline
 */
export async function getStudentCurrentGoalActivities(params: {
  studentId: string
}): Promise<{ data: Activity[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Get student's current goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', params.studentId)
      .single()

    if (!profile || !profile.current_goal_id) {
      return { data: [], error: null }
    }

    // Fetch activities for current goal
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select('*')
      .eq('user_id', params.studentId)
      .eq('goal_id', profile.current_goal_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching current goal activities:', error)
      return { data: null, error: error.message }
    }

    return { data: activities, error: null }
  } catch (error) {
    console.error('Error in getStudentCurrentGoalActivities:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get activities grouped by goal for a student (all goals)
 * OPTIMIZED: Uses materialized view for stats, limits activity data
 * Used in: Community/Goals Page - Full goal timeline
 */
export async function getStudentActivitiesByGoal(params: {
  studentId: string
}): Promise<{ data: GoalActivities[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // OPTIMIZATION 1: Fetch pre-calculated stats from materialized view
    const { data: stats, error: statsError } = await supabase
      .from('goal_activity_stats')
      .select('*')
      .eq('user_id', params.studentId)

    if (statsError) {
      console.error('Error fetching goal stats:', statsError)
      // Fallback to direct query if materialized view doesn't exist yet
    }

    // OPTIMIZATION 2: Fetch only essential activity fields (not full content)
    const { data: activities, error } = await supabase
      .from('community_activities')
      .select('id, user_id, activity_type, goal_id, goal_title, video_title, created_at, timestamp_seconds')
      .eq('user_id', params.studentId)
      .not('goal_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500) // OPTIMIZATION 3: Limit to most recent 500 activities

    if (error) {
      console.error('Error fetching student activities by goal:', error)
      return { data: null, error: error.message }
    }

    // Group by goal
    const grouped = activities.reduce((acc: Record<string, Activity[]>, activity: Activity) => {
      const goalId = activity.goal_id || 'unknown'
      if (!acc[goalId]) {
        acc[goalId] = []
      }
      acc[goalId].push(activity)
      return acc
    }, {})

    // OPTIMIZATION 4: Use pre-calculated stats from materialized view
    const statsMap = stats ? new Map(stats.map(s => [s.goal_id, s])) : new Map()

    // OPTIMIZATION 5: Batch fetch goal names from track_goals for any missing titles
    const uniqueGoalIds = Object.keys(grouped).filter(id => id !== 'unknown')
    const { data: goalTitles } = await supabase
      .from('track_goals')
      .select('id, name')
      .in('id', uniqueGoalIds)

    const goalTitlesMap = goalTitles ? new Map(goalTitles.map(g => [g.id, g.name])) : new Map()

    // Transform to array format with stats
    const result: GoalActivities[] = await Promise.all(
      Object.entries(grouped).map(async ([goalId, activities]) => {
        // Get pre-calculated stats or calculate on the fly
        const preCalcStats = statsMap.get(goalId)

        // Get goal name from: activity.goal_title → track_goals → fallback
        const goalName = activities[0]?.goal_title || goalTitlesMap.get(goalId) || `Goal ${goalId.slice(0, 8)}`

        // Find goal milestones
        const goalStartActivity = activities.find((a) => a.activity_type === 'new_goal_entered')
        const goalAchievedActivity = activities.find((a) => a.activity_type === 'goal_achieved')

        return {
          goal_id: goalId,
          goal_name: goalName,
          goal_started_at: preCalcStats?.first_activity_at || goalStartActivity?.created_at || activities[0]?.created_at || null,
          goal_achieved_at: goalAchievedActivity?.created_at || null,
          total_activities: preCalcStats?.total_activities || activities.length,
          reflections_count: preCalcStats?.reflections_count || activities.filter((a) =>
            ['text', 'screenshot', 'voice', 'loom'].includes(a.activity_type)
          ).length,
          quizzes_count: preCalcStats?.quizzes_count || activities.filter((a) => a.activity_type === 'quiz').length,
          courses_completed: preCalcStats?.courses_completed || activities.filter((a) => a.activity_type === 'course_completion').length,
          activities,
        }
      })
    )

    // Sort by start date (oldest first)
    result.sort(
      (a, b) =>
        new Date(a.goal_started_at || 0).getTime() - new Date(b.goal_started_at || 0).getTime()
    )

    return { data: result, error: null }
  } catch (error) {
    console.error('Error in getStudentActivitiesByGoal:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}
