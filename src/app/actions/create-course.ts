'use server'

import { createClient } from '@/lib/supabase/server'
import type { InstructorCourse } from '@/types/domain'

export async function createCourse(courseData: Partial<InstructorCourse>) {
  const supabase = await createClient()
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    // Prepare course data for database
    const dbData = {
      instructor_id: user.id,
      title: courseData.title || 'Untitled Course',
      description: courseData.description || '',
      thumbnail_url: courseData.thumbnail || '/api/placeholder/400/225',
      status: courseData.status || 'draft',
      students: 0,
      completion_rate: 0,
      revenue: 0,
      total_videos: courseData.totalVideos || 0,
      total_duration_minutes: 0,
      pending_confusions: 0,
      price: (courseData as any).price || 0,
      difficulty: (courseData as any).difficulty || 'beginner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insert course
    const { data, error } = await supabase
      .from('courses')
      .insert(dbData)
      .select()
      .single()
    
    if (error) {
      console.error('[Server Action] Error creating course:', error)
      throw error
    }
    
    console.log('[Server Action] Course created successfully:', data.id)
    
    // Convert back to UI format
    return {
      id: data.id,
      title: data.title,
      thumbnail: data.thumbnail_url,
      status: data.status,
      students: data.students,
      completionRate: data.completion_rate,
      revenue: data.revenue,
      lastUpdated: data.updated_at,
      totalVideos: data.total_videos,
      totalDuration: `${Math.floor(data.total_duration_minutes / 60)}h ${data.total_duration_minutes % 60}m`,
      pendingConfusions: data.pending_confusions
    } as InstructorCourse
    
  } catch (error) {
    console.error('[Server Action] Failed to create course:', error)
    throw error
  }
}