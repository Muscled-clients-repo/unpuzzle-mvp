import { createClient } from '@/lib/supabase/client'
import { InstructorCourse } from '@/types/domain'
import { parseDurationToMinutes } from '@/lib/adapters/course-adapter'

export class SupabaseCourseService {
  /**
   * Get all courses for an instructor using the view that returns UI-ready format
   */
  async getInstructorCourses(instructorId: string): Promise<InstructorCourse[]> {
    const supabase = createClient()
    
    // Query the view that returns UI-ready format with all field names matching InstructorCourse
    const { data, error } = await supabase
      .from('instructor_courses_view')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('[SupabaseCourseService] Error fetching courses:', error)
      throw error
    }
    
    console.log('[SupabaseCourseService] Fetched courses from Supabase:', data?.length || 0)
    
    // Data from view already matches InstructorCourse interface exactly
    // Fields like completionRate, totalVideos, totalDuration, pendingConfusions come pre-formatted
    return data || []
  }
  
  /**
   * Create a new course with default values matching UI expectations
   */
  async createCourse(instructorId: string, courseData: Partial<InstructorCourse>): Promise<InstructorCourse> {
    const supabase = createClient()
    
    // Convert UI format to database format where needed
    const dbData = {
      instructor_id: instructorId,
      title: courseData.title || 'Untitled Course',
      description: courseData.description || '',
      thumbnail_url: courseData.thumbnail || '/api/placeholder/400/225',
      status: courseData.status || 'draft',
      students: 0,
      completion_rate: 0,
      revenue: 0,
      total_videos: 0,
      total_duration_minutes: courseData.totalDuration 
        ? parseDurationToMinutes(courseData.totalDuration)
        : 0,
      pending_confusions: 0,
      price: courseData.price || 0,
      difficulty: courseData.difficulty || 'beginner',
      is_free: (courseData.price || 0) === 0
    }
    
    const { data, error } = await supabase
      .from('courses')
      .insert(dbData)
      .select()
      .single()
    
    if (error) {
      console.error('[SupabaseCourseService] Error creating course:', error)
      throw error
    }
    
    // Fetch from view to get UI-ready format
    const { data: viewData, error: viewError } = await supabase
      .from('instructor_courses_view')
      .select('*')
      .eq('id', data.id)
      .single()
    
    if (viewError) throw viewError
    
    console.log('[SupabaseCourseService] Created new course:', viewData.id)
    return viewData
  }
  
  /**
   * Update course with partial data
   */
  async updateCourse(courseId: string, updates: Partial<InstructorCourse>): Promise<InstructorCourse> {
    const supabase = createClient()
    
    // Convert UI format to database format where needed
    const dbUpdates: any = {}
    
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.thumbnail !== undefined) dbUpdates.thumbnail_url = updates.thumbnail
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.students !== undefined) dbUpdates.students = updates.students
    if (updates.completionRate !== undefined) dbUpdates.completion_rate = updates.completionRate
    if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue
    if (updates.totalVideos !== undefined) dbUpdates.total_videos = updates.totalVideos
    if (updates.totalDuration !== undefined) {
      dbUpdates.total_duration_minutes = parseDurationToMinutes(updates.totalDuration)
    }
    if (updates.pendingConfusions !== undefined) dbUpdates.pending_confusions = updates.pendingConfusions
    if (updates.price !== undefined) dbUpdates.price = updates.price
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty
    
    const { error } = await supabase
      .from('courses')
      .update(dbUpdates)
      .eq('id', courseId)
    
    if (error) {
      console.error('[SupabaseCourseService] Error updating course:', error)
      throw error
    }
    
    // Fetch updated data from view to get UI-ready format
    const { data: viewData, error: viewError } = await supabase
      .from('instructor_courses_view')
      .select('*')
      .eq('id', courseId)
      .single()
    
    if (viewError) throw viewError
    
    console.log('[SupabaseCourseService] Updated course:', courseId)
    return viewData
  }
  
  /**
   * Update course status (publish/unpublish/draft)
   */
  async updateCourseStatus(courseId: string, status: 'published' | 'draft' | 'under_review'): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('courses')
      .update({ status })
      .eq('id', courseId)
    
    if (error) {
      console.error('[SupabaseCourseService] Error updating course status:', error)
      throw error
    }
    
    console.log('[SupabaseCourseService] Updated course status:', courseId, status)
  }
  
  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
    
    if (error) {
      console.error('[SupabaseCourseService] Error deleting course:', error)
      throw error
    }
    
    console.log('[SupabaseCourseService] Deleted course:', courseId)
  }
}

export const supabaseCourseService = new SupabaseCourseService()