'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { broadcastWebSocketMessage } from '@/lib/websocket-operations'

export interface Track {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

export interface TrackGoal {
  id: string
  track_id: string
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
  is_active: boolean
}


export interface CourseGoalAssignment {
  id: string
  course_id: string
  goal_id: string
  created_at: string
}

// Get all active tracks
export async function getTracks(): Promise<Track[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error('Failed to get tracks')
  }

  return data || []
}

// Get goals for a specific track
export async function getTrackGoals(trackId: string): Promise<TrackGoal[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('track_goals')
    .select('*')
    .eq('track_id', trackId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error('Failed to get track goals')
  }

  return data || []
}


// Get course goal assignments
export async function getCourseGoalAssignments(courseId: string): Promise<CourseGoalAssignment[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('course_goal_assignments')
    .select('*')
    .eq('course_id', courseId)

  if (error) {
    throw new Error('Failed to get course goal assignments')
  }

  return data || []
}


// Assign course to goals
export async function assignCourseToGoals(courseId: string, goalIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Verify user owns the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    throw new Error('Course not found')
  }

  if (course.instructor_id !== user.id) {
    throw new Error('Not authorized to modify this course')
  }

  // Remove existing assignments
  const { error: deleteError } = await supabase
    .from('course_goal_assignments')
    .delete()
    .eq('course_id', courseId)

  if (deleteError) {
    throw new Error('Failed to remove existing goal assignments')
  }

  // Add new assignments if any
  if (goalIds.length > 0) {
    const assignments = goalIds.map(goalId => ({
      course_id: courseId,
      goal_id: goalId
    }))

    const { error: insertError } = await supabase
      .from('course_goal_assignments')
      .insert(assignments)

    if (insertError) {
      throw new Error('Failed to create goal assignments')
    }
  }

  // Get goal names for broadcasting
  const goalNames = []
  if (goalIds.length > 0) {
    const { data: goalDetails } = await supabase
      .from('track_goals')
      .select('id, name')
      .in('id', goalIds)

    goalDetails?.forEach(goal => goalNames.push(goal.name))
  }

  console.log('🔥 [WEBSOCKET] Broadcasting course-goal assignment change for course:', courseId, 'goals:', goalNames)

  // Broadcast WebSocket message for real-time course visibility updates
  await broadcastWebSocketMessage({
    type: 'course-goal-assignment-changed',
    data: {
      courseId,
      goalIds,
      goalNames,
      action: goalIds.length > 0 ? 'assigned' : 'unassigned'
    }
  })

  console.log('✅ [WEBSOCKET] Course-goal assignment broadcast completed')

  revalidatePath('/instructor/courses')
  revalidatePath(`/instructor/course/${courseId}/edit`)
}

// Get course with track and goal assignments
export async function getCourseWithAssignments(courseId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('courses_with_assignments')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error) {
    throw new Error('Failed to get course with assignments')
  }

  return data
}

// Get all courses for admin management
export async function getAllCourses() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      status,
      difficulty,
      total_videos,
      total_duration_minutes
    `)
    .order('title')

  if (error) {
    throw new Error('Failed to get courses')
  }

  return data || []
}