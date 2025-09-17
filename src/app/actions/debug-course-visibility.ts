'use server'

import { createClient } from '@/lib/supabase/server'

export async function debugCourseVisibility(studentEmail: string, courseId: string) {
  const supabase = await createClient()

  try {
    console.log(`🔍 Debugging course visibility for ${studentEmail} and course ${courseId}`)

    // 1. Get student's profile and goal assignment
    const { data: studentProfile, error: studentError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        current_goal_id,
        current_track_id,
        track_goals:current_goal_id (
          id,
          name,
          track_id,
          tracks:track_id (
            id,
            name
          )
        )
      `)
      .eq('email', studentEmail)
      .single()

    if (studentError) {
      return { error: `Student not found: ${studentError.message}` }
    }

    // 2. Get course details and goal assignments
    const { data: courseDetails, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        status,
        course_goal_assignments (
          goal_id,
          track_goals:goal_id (
            id,
            name,
            track_id
          )
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError) {
      return { error: `Course not found: ${courseError.message}` }
    }

    // 3. Test the get_user_courses function
    const { data: userCourses, error: functionError } = await supabase
      .rpc('get_user_courses', { user_id: studentProfile.id })

    if (functionError) {
      return { error: `Function error: ${functionError.message}` }
    }

    const courseVisible = userCourses?.some(c => c.id === courseId)

    return {
      success: true,
      debug: {
        student: {
          id: studentProfile.id,
          email: studentProfile.email,
          currentGoalId: studentProfile.current_goal_id,
          currentTrackId: studentProfile.current_track_id,
          goalName: studentProfile.track_goals?.name,
          trackName: studentProfile.track_goals?.tracks?.name
        },
        course: {
          id: courseDetails.id,
          title: courseDetails.title,
          status: courseDetails.status,
          assignedGoals: courseDetails.course_goal_assignments?.map(cga => ({
            goalId: cga.goal_id,
            goalName: cga.track_goals?.name,
            trackId: cga.track_goals?.track_id
          }))
        },
        visibility: {
          courseVisible,
          totalUserCourses: userCourses?.length || 0,
          userCourseIds: userCourses?.map(c => c.id) || []
        }
      }
    }
  } catch (error) {
    return { error: `Debug error: ${error.message}` }
  }
}