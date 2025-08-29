// src/services/instructor-course-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { 
  Course, 
  Video,
  Lesson,
  // InstructorLessonData,  // TODO: Currently unused - no UI calls this
  ServiceResult,
  StudentActivity
} from '@/types/domain'
import { mockCourses } from '@/data/mock/courses'

// Interface for course update data
interface CourseUpdateData {
  title?: string
  description?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  price?: number
  chapters?: unknown[]
  videos?: unknown[]
  status?: string
}

export class InstructorCourseService {
  private cache = new Map<string, { data: unknown, timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private clearCoursesCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('courses-')) {
        this.cache.delete(key)
      }
    }
  }

  async getInstructorCourses(forceRefresh = false): Promise<ServiceResult<Course[]>> {
    console.log('🌐 getInstructorCourses service called:', { forceRefresh, useMockData })
    console.log('📍 useMockData type:', typeof useMockData, 'value:', useMockData)
    const cacheKey = 'instructor-courses'
    
    // Return cached data if fresh
    if (!forceRefresh && !useMockData) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('💾 Returning cached data')
        return { data: cached.data }
      }
    }
    if (useMockData) {
      console.log('🎭 Using mock data')
      // Transform mock courses to match domain Course type
      const transformedCourses: Course[] = mockCourses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail,
        instructor: {
          id: 'mock-instructor-1',
          name: course.instructor.name,
          email: `${course.instructor.name.toLowerCase().replace(' ', '.')}@example.com`,
          avatar: course.instructor.avatar
        },
        price: course.price,
        duration: parseInt(course.duration) || 0,
        difficulty: course.level,
        tags: [course.category],
        videos: course.videos.map(v => ({
          id: v.id,
          courseId: course.id,
          title: v.title,
          description: v.description,
          duration: parseInt(v.duration) || 600,
          order: parseInt(v.id),
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl,
          transcript: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })),
        enrollmentCount: course.students,
        rating: course.rating,
        isPublished: true,
        isFree: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      return { data: transformedCourses }
    }

    console.log('🚀 Making API call to: /api/v1/instructor/courses')
    const response = await apiClient.get<Course[]>(`/api/v1/instructor/courses`)
    console.log('📡 API response:', response)
    
    // Cache successful response
    if (!response.error && response.data) {
      console.log('💾 Caching response data')
      this.cache.set(cacheKey, { data: response.data, timestamp: Date.now() })
    }
    
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getCourseAnalytics(courseId: string): Promise<ServiceResult<{
    enrollments: number
    completionRate: number
    avgProgress: number
    revenueTotal: number
    revenueThisMonth: number
    totalStudents?: number
    studentEngagement: {
      active: number
      inactive: number
      struggling: number
    }
    topPerformers: Array<{
      studentId: string
      studentName: string
      progress: number
    }>
    strugglingStudents: Array<{
      studentId: string
      studentName: string
      progress: number
      lastActive: string
    }>
  }>> {
    if (useMockData) {
      return {
        data: {
          enrollments: 234,
          completionRate: 0.68,
          avgProgress: 0.45,
          revenueTotal: 18420,
          revenueThisMonth: 3200,
          totalStudents: 45,
          studentEngagement: {
            active: 156,
            inactive: 45,
            struggling: 33
          },
          topPerformers: [
            { studentId: 'student-1', studentName: 'Sarah Chen', progress: 0.95 },
            { studentId: 'student-2', studentName: 'Alex Rivera', progress: 0.88 },
            { studentId: 'student-3', studentName: 'Jamie Park', progress: 0.82 }
          ],
          strugglingStudents: [
            { 
              studentId: 'student-4', 
              studentName: 'Mike Johnson', 
              progress: 0.12,
              lastActive: '5 days ago'
            },
            { 
              studentId: 'student-5', 
              studentName: 'Emma Wilson', 
              progress: 0.08,
              lastActive: '1 week ago'
            }
          ]
        }
      }
    }

    const response = await apiClient.get(`/api/v1/instructor/courses/${courseId}/analytics`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async createCourse(course: Partial<Course>): Promise<ServiceResult<Course>> {
    if (useMockData) {
      const newCourse: Course = {
        id: `course-${Date.now()}`,
        title: course.title || 'New Course',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || 'https://via.placeholder.com/400x225',
        instructor: course.instructor || {
          id: 'inst-1',
          name: 'Instructor Name',
          email: 'instructor@example.com',
          avatar: ''
        },
        price: course.price || 0,
        duration: course.duration || 0,
        difficulty: course.difficulty || 'beginner',
        tags: course.tags || [],
        videos: [],
        enrollmentCount: 0,
        rating: 0,
        isPublished: false,
        isFree: course.isFree || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return { data: newCourse }
    }

    const response = await apiClient.post<Course>('/api/v1/instructor/courses', course)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async updateCourse(
    courseId: string,
    updates: Partial<Course>
  ): Promise<ServiceResult<Course>> {
    if (useMockData) {
      const course = mockCourses.find(c => c.id === courseId)
      if (!course) return { error: 'Course not found' }
      
      return { 
        data: { 
          ...course, 
          ...updates,
          updatedAt: new Date().toISOString()
        }
      }
    }

    const response = await apiClient.put<Course>(
      `/api/v1/instructor/courses/${courseId}`,
      updates
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async deleteCourse(courseId: string): Promise<ServiceResult<{ success: boolean }>> {
    if (useMockData) {
      return { data: { success: true } }
    }

    const response = await apiClient.delete(`/api/v1/instructor/courses/${courseId}`)
    
    // Clear cache on deletion
    if (!response.error) {
      this.clearCoursesCache()
    }
    
    return response.error
      ? { error: response.error }
      : { data: { success: true } }
  }

  async duplicateCourse(courseId: string): Promise<ServiceResult<Course>> {
    if (useMockData) {
      const course = mockCourses.find(c => c.id === courseId)
      if (!course) return { error: 'Course not found' }
      
      const duplicatedCourse = {
        ...course,
        id: `course-${Date.now()}`,
        title: `${course.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return { data: duplicatedCourse as any }
    }

    const response = await apiClient.post<Course>(`/api/v1/instructor/courses/${courseId}/duplicate`)
    
    // Clear cache on duplication
    if (!response.error) {
      this.clearCoursesCache()
    }
    
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async publishCourse(courseId: string): Promise<ServiceResult<{ success: boolean }>> {
    if (useMockData) {
      return {
        data: { success: true }
      }
    }

    const response = await apiClient.post(
      `/api/v1/instructor/courses/${courseId}/publish`
    )
    
    // Clear cache on publish
    if (!response.error) {
      this.clearCoursesCache()
    }
    
    return response.error
      ? { error: response.error }
      : { data: response.data || { success: true } }
  }

  async unpublishCourse(courseId: string): Promise<ServiceResult<{ success: boolean }>> {
    if (useMockData) {
      return {
        data: { success: true }
      }
    }

    const response = await apiClient.post(
      `/api/v1/instructor/courses/${courseId}/unpublish`
    )
    
    // Clear cache on unpublish
    if (!response.error) {
      this.clearCoursesCache()
    }
    
    return response.error
      ? { error: response.error }
      : { data: response.data || { success: true } }
  }

  async addVideoToCourse(
    courseId: string,
    video: Partial<Video>
  ): Promise<ServiceResult<Video>> {
    if (useMockData) {
      const newVideo: Video = {
        id: `video-${Date.now()}`,
        title: video.title || 'New Video',
        duration: video.duration || '0:00',
        description: video.description || '',
        thumbnailUrl: video.thumbnailUrl || '',
        videoUrl: video.videoUrl || '',
        transcript: video.transcript || '',
        timestamps: video.timestamps || [],
        quizPoints: video.quizPoints || []
      }
      return { data: newVideo }
    }

    const response = await apiClient.post<Video>(
      `/api/instructor/courses/${courseId}/videos`,
      video
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async reorderVideos(
    courseId: string,
    videoOrders: Array<{ videoId: string; order: number }>
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      console.log('Reordering videos:', videoOrders)
      return { data: undefined }
    }

    const response = await apiClient.put(
      `/api/instructor/courses/${courseId}/videos/reorder`,
      { orders: videoOrders }
    )
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  // TODO: Method disabled - InstructorLessonData type removed (no UI usage)
  // async getInstructorLessonData(lessonId: string): Promise<ServiceResult<InstructorLessonData>> {
  //   if (useMockData) {
  //     const baseLesson: Lesson = {
  //       id: lessonId,
  //       title: 'Learn React In 30 Minutes',
  //       description: 'A comprehensive introduction to React',
  //       duration: 1800,
  //       videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  //       thumbnailUrl: 'https://img.youtube.com/vi/hQAHSlTtcmY/maxresdefault.jpg',
  //       instructor: {
  //         id: 'inst-1',
  //         name: 'Sarah Chen',
  //         email: 'sarah@example.com',
  //         avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  //       },
  //       tags: ['React', 'JavaScript'],
  //       difficulty: 'beginner',
  //       isFree: true,
  //       isPublished: true,
  //       viewCount: 1543,
  //       rating: 4.8,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     }

  //     const instructorData: InstructorLessonData = {
  //       ...baseLesson,
  //       studentActivity: [
  //         {
  //           studentId: 'student-1',
  //           studentName: 'John Doe',
  //           videoId: lessonId,
  //           timestamp: 120,
  //           type: 'reflection',
  //           content: 'Great explanation!',
  //           needsResponse: true
  //         },
  //         {
  //           studentId: 'student-2',
  //           studentName: 'Jane Smith',
  //           videoId: lessonId,
  //           timestamp: 300,
  //           type: 'confusion',
  //           content: 'Lost at this point',
  //           needsResponse: true
  //         }
  //       ],
  //       confusionHotspots: [
  //         {
  //           timestamp: 300,
  //           studentCount: 5,
  //           topic: 'State management',
  //           resolved: false
  //         }
  //       ],
  //       aggregateMetrics: {
  //         totalViews: 1543,
  //         avgWatchTime: 1200,
  //         completionRate: 0.67,
  //         confusionPoints: [],
  //         quizPassRate: 0.75,
  //         reflectionCount: 89
  //       },
  //       earnings: {
  //         totalRevenue: 4200,
  //         monthlyRevenue: 650,
  //         viewsThisMonth: 234
  //       }
  //     }
      
  //     return { data: instructorData }
  //   }

  //   const response = await apiClient.get<InstructorLessonData>(`/api/instructor/lessons/${lessonId}`)
  //   return response.error
  //     ? { error: response.error }
  //     : { data: response.data }
  // }

  async getStudentSubmissions(
    courseId: string,
    assignmentId?: string
  ): Promise<ServiceResult<Array<{
    studentId: string
    studentName: string
    submittedAt: string
    grade?: number
    feedback?: string
    status: 'pending' | 'graded' | 'returned'
  }>>> {
    if (useMockData) {
      return {
        data: [
          {
            studentId: 'student-1',
            studentName: 'Sarah Chen',
            submittedAt: new Date().toISOString(),
            grade: 95,
            feedback: 'Excellent work!',
            status: 'graded'
          },
          {
            studentId: 'student-2',
            studentName: 'Alex Rivera',
            submittedAt: new Date().toISOString(),
            status: 'pending'
          }
        ]
      }
    }

    const endpoint = assignmentId 
      ? `/api/instructor/courses/${courseId}/assignments/${assignmentId}/submissions`
      : `/api/instructor/courses/${courseId}/submissions`
      
    const response = await apiClient.get(endpoint)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async sendAnnouncementToCourse(
    courseId: string,
    announcement: {
      title: string
      content: string
      important: boolean
    }
  ): Promise<ServiceResult<{ success: boolean; recipientCount: number }>> {
    if (useMockData) {
      return {
        data: {
          success: true,
          recipientCount: 234
        }
      }
    }

    const response = await apiClient.post(
      `/api/instructor/courses/${courseId}/announcements`,
      announcement
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async exportCourseAnalytics(
    courseId: string,
    format: 'csv' | 'pdf' | 'json'
  ): Promise<ServiceResult<{ downloadUrl: string }>> {
    if (useMockData) {
      return {
        data: {
          downloadUrl: `/exports/course-${courseId}-analytics.${format}`
        }
      }
    }

    const response = await apiClient.get(
      `/api/instructor/courses/${courseId}/analytics/export?format=${format}`
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  // Edit-specific methods for course editing workflow
  async getCourseForEditing(courseId: string): Promise<ServiceResult<any>> {
    console.log('🔍 Loading course for editing:', courseId)
    
    // Skip cache check - directly fetch the specific course
    // This is more efficient than loading all courses first
    
    if (useMockData) {
      const mockCourseData = {
        id: courseId,
        title: `Course ${courseId}`,
        description: `Description for course ${courseId}`,
        category: 'web-development',
        level: 'intermediate',
        price: 99,
        chapters: [
          {
            id: 'chapter-1',
            title: 'Introduction',
            description: 'Getting started with the course',
            order: 0,
            videos: [],
            duration: '30 min'
          },
          {
            id: 'chapter-2', 
            title: 'Core Concepts',
            description: 'Understanding the fundamentals',
            order: 1,
            videos: [],
            duration: '45 min'
          }
        ],
        videos: [],
        status: 'draft',
        totalDuration: '1h 15min',
        lastSaved: new Date(),
        autoSaveEnabled: false
      }
      return { data: mockCourseData }
    }

    console.log('📡 Making API call to get course:', courseId)
    const response = await apiClient.get<any>(`/api/v1/instructor/courses/${courseId}`)
    console.log('📨 API response:', response)
    
    if (response.error) {
      console.log('❌ API error:', response.error)
      return { error: response.error }
    }

    if (!response.data) {
      console.log('❌ No data in response')
      return { error: 'No course data received' }
    }

    // Transform API Course to CourseCreationData format
    // Handle nested data structure from server
    const course = response.data?.data || response.data
    console.log('🔄 Transforming course data:', course)
    
    const courseCreationData = {
      id: course.id,
      title: course.title || '',
      description: course.description || '',
      category: course.category?.slug || course.tags?.[0] || '',
      level: course.difficulty || 'beginner',
      price: parseFloat(course.price) || 0,
      chapters: course.sections || [], // Sections are chapters
      videos: course.videos || [],
      status: course.is_published ? 'published' : 'draft',
      autoSaveEnabled: false,
      lastSaved: course.updated_at ? new Date(course.updated_at) : new Date()
    }
    
    console.log('✅ Transformed course data:', courseCreationData)
    return { data: courseCreationData }
  }

  async updateCourseDetails(courseId: string, courseData: CourseUpdateData): Promise<ServiceResult<Course>> {
    console.log('💾 Updating course details:', courseId)
    
    if (useMockData) {
      console.log('🎭 Mock update successful')
      return { data: {} as Course }
    }

    // Transform to API format based on Postman collection
    const updatePayload = {
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      difficulty: courseData.level,
      tags: courseData.category ? [courseData.category] : [],
    }

    const response = await apiClient.put<Course>(`/api/v1/instructor/courses/${courseId}`, updatePayload)
    
    if (response.error) {
      return { error: response.error }
    }

    return { data: response.data! }
  }
}

export const instructorCourseService = new InstructorCourseService()