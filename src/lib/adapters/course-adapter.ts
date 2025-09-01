// Data adapter layer for course data compatibility
// Ensures Supabase data matches exact format expected by existing UI

export interface MockCourseFormat {
  id: string
  title: string
  thumbnail?: string
  status: 'published' | 'draft' | 'under_review'
  students: number
  completionRate: number
  revenue: number
  lastUpdated: string
  totalVideos: number
  totalDuration: string
  pendingConfusions: number
}

export interface SupabaseCourseFormat {
  id: string
  title: string
  thumbnail_url: string | null
  status: 'published' | 'draft' | 'under_review'
  students: number
  completionRate: number // Note: this comes from the view alias
  revenue: number
  lastUpdated: string    // Note: this comes from the view function
  totalVideos: number
  totalDuration: string  // Note: this comes from the view function
  pendingConfusions: number
  instructor_id: string
  created_at: string
  updated_at: string
}

/**
 * Adapter function to convert Supabase course data to mock format
 * This ensures 100% compatibility with existing UI components
 */
export const adaptSupabaseCourseToMock = (supabaseCourse: SupabaseCourseFormat): MockCourseFormat => {
  return {
    id: supabaseCourse.id,
    title: supabaseCourse.title,
    thumbnail: supabaseCourse.thumbnail_url || '/api/placeholder/400/225',
    status: supabaseCourse.status,
    students: supabaseCourse.students,
    completionRate: supabaseCourse.completionRate,
    revenue: supabaseCourse.revenue,
    lastUpdated: supabaseCourse.lastUpdated,
    totalVideos: supabaseCourse.totalVideos,
    totalDuration: supabaseCourse.totalDuration,
    pendingConfusions: supabaseCourse.pendingConfusions
  }
}

/**
 * Adapter function to convert mock format back to Supabase format for updates
 */
export const adaptMockCourseToSupabase = (
  mockCourse: Partial<MockCourseFormat>, 
  instructorId: string
): Partial<Omit<SupabaseCourseFormat, 'lastUpdated' | 'totalDuration' | 'completionRate'>> => {
  const supabaseCourse: any = {}
  
  if (mockCourse.id) supabaseCourse.id = mockCourse.id
  if (mockCourse.title) supabaseCourse.title = mockCourse.title
  if (mockCourse.thumbnail) supabaseCourse.thumbnail_url = mockCourse.thumbnail
  if (mockCourse.status) supabaseCourse.status = mockCourse.status
  if (mockCourse.students !== undefined) supabaseCourse.students = mockCourse.students
  if (mockCourse.completionRate !== undefined) supabaseCourse.completion_rate = mockCourse.completionRate
  if (mockCourse.revenue !== undefined) supabaseCourse.revenue = mockCourse.revenue
  if (mockCourse.totalVideos !== undefined) supabaseCourse.total_videos = mockCourse.totalVideos
  if (mockCourse.pendingConfusions !== undefined) supabaseCourse.pending_confusions = mockCourse.pendingConfusions
  
  // Always include instructor_id for new courses
  supabaseCourse.instructor_id = instructorId
  
  return supabaseCourse
}

/**
 * Convert duration string to minutes for database storage
 * Examples: "12h 30m" -> 750, "45m" -> 45, "2h" -> 120
 */
export const parseDurationToMinutes = (duration: string): number => {
  const hourMatch = duration.match(/(\d+)h/)
  const minuteMatch = duration.match(/(\d+)m/)
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
  
  return (hours * 60) + minutes
}

/**
 * Convert minutes to duration string format
 * Examples: 750 -> "12h 30m", 45 -> "45m", 120 -> "2h"
 */
export const formatMinutesToDuration = (minutes: number): string => {
  if (minutes === 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Calculate stats that the UI displays in the overview cards
 */
export const calculateCourseStats = (courses: MockCourseFormat[]) => {
  const totalCourses = courses.length
  const publishedCourses = courses.filter(c => c.status === 'published')
  
  const totalStudents = courses.reduce((acc, course) => acc + course.students, 0)
  const totalRevenue = courses.reduce((acc, course) => acc + course.revenue, 0)
  
  const avgCompletionRate = publishedCourses.length > 0 
    ? Math.round(publishedCourses.reduce((acc, course) => acc + course.completionRate, 0) / publishedCourses.length)
    : 0
  
  return {
    totalCourses,
    publishedCount: publishedCourses.length,
    totalStudents,
    totalRevenue,
    avgCompletionRate
  }
}

/**
 * Type guard to check if data is in Supabase format
 */
export const isSupabaseCourseFormat = (course: any): course is SupabaseCourseFormat => {
  return course && typeof course === 'object' && 'instructor_id' in course
}

/**
 * Type guard to check if data is in mock format
 */
export const isMockCourseFormat = (course: any): course is MockCourseFormat => {
  return course && typeof course === 'object' && 'completionRate' in course && !('instructor_id' in course)
}