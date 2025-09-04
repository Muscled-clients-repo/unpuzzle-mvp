'use server'

import { createClient } from '@/lib/supabase/server'

export async function publishCourse(courseId: string) {
  const supabase = await createClient()
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('You do not have permission to publish this course')
    }
    
    // Update course status to published
    const { data, error } = await supabase
      .from('courses')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    console.log('[Server Action] Course published successfully:', courseId)
    return { success: true, course: data }
    
  } catch (error) {
    console.error('[Server Action] Failed to publish course:', error)
    throw error
  }
}