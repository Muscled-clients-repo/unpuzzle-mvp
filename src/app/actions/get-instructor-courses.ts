'use server'

import { createClient } from '@/lib/supabase/server'
import { InstructorCourse } from '@/types/domain'

export async function getInstructorCourses(instructorId: string): Promise<InstructorCourse[]> {
  const supabase = await createClient()
  
  try {
    // Query the view that returns UI-ready format with all field names matching InstructorCourse
    const { data, error } = await supabase
      .from('instructor_courses_view')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('[Server Action] Error fetching courses:', error)
      throw error
    }
    
    console.log('[Server Action] Fetched courses from Supabase:', data?.length || 0)
    
    return data || []
  } catch (error) {
    console.error('[Server Action] Failed to fetch courses:', error)
    return []
  }
}