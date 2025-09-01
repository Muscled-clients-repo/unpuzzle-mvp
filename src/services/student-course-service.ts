// src/services/student-course-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { 
  Course, 
  Video,
  Lesson,
  // StudentLessonData,  // TODO: Currently unused - no UI calls this
  ServiceResult,
  CourseProgress
} from '@/types/domain'
import { mockCourses } from '@/data/mock/courses'

export class StudentCourseService {
  async getEnrolledCourses(userId: string): Promise<ServiceResult<Course[]>> {
    if (useMockData) {
      // Transform mock courses to match domain Course type
      const transformedCourses: Course[] = mockCourses.slice(0, 2).map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail,
        instructor: {
          id: `inst-${course.id}`,
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
      
      return { 
        data: transformedCourses
      }
    }

    // Use the new API client method with correct endpoint
    const response = await apiClient.getStudentCourses()
    
    // Debug logging
    console.log('Student courses API response:', response)
    
    if (response.error) {
      console.error('Error fetching enrolled courses:', response.error)
      return { error: response.error }
    }
    
    // Ensure we always return an array
    const courses = response.data
    
    // Handle various response formats
    if (!courses) {
      console.log('No courses data in response')
      return { data: [] }
    }
    
    // If the response has a nested structure like { data: courses }
    if (courses && typeof courses === 'object' && !Array.isArray(courses)) {
      // Check for common nested structures
      if ('data' in courses && Array.isArray((courses as any).data)) {
        console.log('Found courses in nested data property')
        return { data: (courses as any).data }
      }
      if ('courses' in courses && Array.isArray((courses as any).courses)) {
        console.log('Found courses in nested courses property')
        return { data: (courses as any).courses }
      }
      
      // If it's a single course object, wrap it in an array
      if ('id' in courses) {
        console.log('Single course object, wrapping in array')
        return { data: [courses as Course] }
      }
      
      console.warn('Unknown response structure:', courses)
      return { data: [] }
    }
    
    // Ensure it's an array
    const coursesArray = Array.isArray(courses) ? courses : []
    console.log(`Returning ${coursesArray.length} courses`)
    
    return { data: coursesArray }
  }

  async getCourseProgress(
    userId: string, 
    courseId: string
  ): Promise<ServiceResult<CourseProgress>> {
    if (useMockData) {
      return {
        data: {
          userId,
          courseId,
          videosCompleted: 2,
          totalVideos: 5,
          percentComplete: 40,
          lastAccessedAt: new Date().toISOString()
        }
      }
    }

    // Use the new API client method with correct endpoint
    const response = await apiClient.getStudentCourseProgress(courseId)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getNextVideo(
    courseId: string,
    currentVideoId: string
  ): Promise<ServiceResult<Video | null>> {
    if (useMockData) {
      const course = mockCourses.find(c => c.id === courseId)
      if (!course) return { data: null }
      
      const currentIndex = course.videos.findIndex(v => v.id === currentVideoId)
      const nextVideo = course.videos[currentIndex + 1]
      
      return { data: nextVideo || null }
    }

    const response = await apiClient.get<Video>(
      `/api/student/courses/${courseId}/videos/${currentVideoId}/next`
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async enrollInCourse(
    userId: string,
    courseId: string,
    paymentData?: { paymentMethod?: string; couponCode?: string }
  ): Promise<ServiceResult<{ success: boolean; message: string; enrollmentId?: string }>> {
    if (useMockData) {
      return {
        data: {
          success: true,
          message: 'Successfully enrolled in course',
          enrollmentId: `enroll-${courseId}-${userId}`
        }
      }
    }

    // Use the new API client method
    const response = await apiClient.enrollInCourse(courseId, paymentData)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getRecommendedCourses(userId: string): Promise<ServiceResult<Course[]>> {
    if (useMockData) {
      // Transform mock courses to match domain Course type
      const transformedCourses: Course[] = mockCourses.slice(2, 5).map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail,
        instructor: {
          id: `inst-${course.id}`,
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
      
      return { 
        data: transformedCourses
      }
    }

    const response = await apiClient.get<Course[]>(`/api/student/courses/recommended`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async unenrollFromCourse(courseId: string): Promise<ServiceResult<void>> {
    if (useMockData) {
      return { data: undefined }
    }

    const response = await apiClient.unenrollFromCourse(courseId)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  async submitCourseReview(
    courseId: string, 
    review: { rating: number; comment: string }
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      return { data: undefined }
    }

    const response = await apiClient.submitCourseReview(courseId, review)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  async getAllCourses(): Promise<ServiceResult<Course[]>> {
    if (useMockData) {
      // Transform ALL mock courses for public browsing
      const transformedCourses: Course[] = mockCourses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail,
        instructor: {
          id: `inst-${course.id}`,
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
      
      return { 
        data: transformedCourses
      }
    }

    const response = await apiClient.get<Course[]>(`/api/courses`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getCourseById(courseId: string): Promise<ServiceResult<Course | null>> {
    console.log('🔍 StudentCourseService.getCourseById called with:', courseId)
    console.log('📊 Available mock courses:', mockCourses.map(c => ({ id: c.id, title: c.title, videosCount: c.videos.length })))
    
    if (useMockData) {
      const course = mockCourses.find(c => c.id === courseId)
      console.log('🎯 Found course:', course ? { id: course.id, title: course.title, videosCount: course.videos.length } : 'NOT FOUND')
      if (!course) {
        console.log('❌ Course not found, returning error')
        return { error: 'Course not found' }
      }

      // Transform the found course to match domain Course type
      const transformedCourse: Course = {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail,
        instructor: {
          id: `inst-${course.id}`,
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
      }
      
      return { 
        data: transformedCourse
      }
    }

    try {
      const response = await apiClient.get<any>(`/api/v1/courses/${courseId}`)
      
      if (response.error) {
        console.log('❌ API error:', response.error)
        return { error: response.error }
      }
      
      if (!response.data) {
        console.log('❌ No data in response')
        return { error: 'Course not found' }
      }
      
      console.log('✅ Raw API response:', response.data)
      
      // Transform API response to frontend Course structure
      const apiCourse = response.data
      const transformedCourse: Course = {
        id: apiCourse.id,
        title: apiCourse.title,
        description: apiCourse.description,
        shortDescription: apiCourse.shortDescription,
        thumbnailUrl: apiCourse.thumbnailUrl,
        instructor: {
          id: apiCourse.instructor.id,
          name: apiCourse.instructor.name,
          email: apiCourse.instructor.email,
          avatar: apiCourse.instructor.avatarUrl
        },
        price: apiCourse.price || 0,
        currency: apiCourse.currency || 'USD',
        duration: apiCourse.duration || 0,
        difficulty: apiCourse.difficulty,
        language: apiCourse.language || 'en',
        tags: apiCourse.tags || [],
        category: apiCourse.category,
        rating: apiCourse.ratingAverage || 0,
        reviewCount: apiCourse.ratingCount || 0,
        enrollmentCount: apiCourse.enrollmentCount || 0,
        isPublished: apiCourse.isPublished,
        isFree: apiCourse.isFree,
        createdAt: apiCourse.createdAt,
        updatedAt: apiCourse.updatedAt,
        // Keep original videos array for backward compatibility (but get videos from sections)
        videos: [],
        sections: apiCourse.sections || []
      }
      
      console.log('✅ Transformed course:', transformedCourse)
      console.log('📊 Sections found:', transformedCourse.sections.length)
      
      return { data: transformedCourse }
    } catch (error) {
      console.error('❌ Error in getCourseById:', error)
      return { error: 'Network error while fetching course' }
    }
  }

  async getPublicLessons(): Promise<ServiceResult<Lesson[]>> {
    if (useMockData) {
      return {
        data: [
          {
            id: 'lesson-1',
            title: 'Learn React In 30 Minutes',
            description: 'A comprehensive introduction to React',
            duration: 1800,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnailUrl: 'https://img.youtube.com/vi/hQAHSlTtcmY/maxresdefault.jpg',
            instructor: {
              id: 'inst-1',
              name: 'Sarah Chen',
              email: 'sarah@example.com',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
            },
            tags: ['React', 'JavaScript', 'Frontend'],
            difficulty: 'beginner',
            isFree: true,
            isPublished: true,
            viewCount: 1543,
            rating: 4.8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'lesson-2',
            title: 'CSS Grid in 20 Minutes',
            description: 'Master CSS Grid layout quickly',
            duration: 1200,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnailUrl: 'https://img.youtube.com/vi/CSS-GRID/maxresdefault.jpg',
            instructor: {
              id: 'inst-2',
              name: 'Alex Rivera',
              email: 'alex@example.com',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
            },
            tags: ['CSS', 'Web Design', 'Frontend'],
            difficulty: 'intermediate',
            isFree: true,
            isPublished: true,
            viewCount: 892,
            rating: 4.6,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
    }

    const response = await apiClient.get<Lesson[]>('/api/lessons/public')
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  // TODO: Method disabled - StudentLessonData type removed (no UI usage)
  // async getStudentLessonData(lessonId: string): Promise<ServiceResult<StudentLessonData>> {
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

  //     const studentData: StudentLessonData = {
  //       ...baseLesson,
  //       aiContextEnabled: true,
  //       hasAccess: true,
  //       progress: {
  //         userId: 'user-1',
  //         videoId: lessonId,
  //         watchedSeconds: 900,
  //         totalSeconds: 1800,
  //         percentComplete: 50,
  //         lastWatchedAt: new Date().toISOString(),
  //         reflectionCount: 3
  //       },
  //       reflections: [
  //         {
  //           id: 'ref-1',
  //           userId: 'user-1',
  //           videoId: lessonId,
  //           content: 'Great explanation of React basics',
  //           timestamp: 120,
  //           timeInSeconds: 120,
  //           type: 'text',
  //           status: 'responded',
  //           response: 'Glad you found it helpful!',
  //           createdAt: new Date().toISOString()
  //         }
  //       ],
  //       quizzes: [
  //         {
  //           id: 'quiz-1',
  //           videoId: lessonId,
  //           timestamp: 300,
  //           question: 'What is JSX?',
  //           options: [
  //             'JavaScript XML',
  //             'Java Syntax Extension',
  //             'JSON XML',
  //             'JavaScript Extension'
  //           ],
  //           correctAnswer: 0,
  //           explanation: 'JSX stands for JavaScript XML',
  //           difficulty: 'easy'
  //         }
  //       ]
  //     }
      
  //     return { data: studentData }
  //   }

  //   const response = await apiClient.get<StudentLessonData>(`/api/student/lessons/${lessonId}`)
  //   return response.error
  //     ? { error: response.error }
  //     : { data: response.data }
  // }

  async markVideoComplete(
    userId: string,
    courseId: string,
    videoId: string
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      console.log('Marking video complete:', { userId, courseId, videoId })
      return { data: undefined }
    }

    const response = await apiClient.post(
      `/api/student/courses/${courseId}/videos/${videoId}/complete`,
      { userId }
    )
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }

  async getCertificate(
    userId: string,
    courseId: string
  ): Promise<ServiceResult<{ certificateUrl: string }>> {
    if (useMockData) {
      return {
        data: {
          certificateUrl: `/certificates/${userId}-${courseId}.pdf`
        }
      }
    }

    const response = await apiClient.get(
      `/api/student/courses/${courseId}/certificate`
    )
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  // New API endpoints from documentation

  async getEnrolledCoursesV2(status?: 'not_started' | 'in_progress' | 'completed', sort?: string): Promise<ServiceResult<any>> {
    if (useMockData) {
      // Filter mock data based on status if provided
      let filteredCourses = mockCourses.slice(0, 3)
      
      if (status === 'in_progress') {
        filteredCourses = filteredCourses.slice(0, 2)
      } else if (status === 'completed') {
        filteredCourses = filteredCourses.slice(2, 3)
      }

      return {
        data: {
          count: filteredCourses.length,
          results: filteredCourses.map(course => ({
            enrollment_id: `enroll_${course.id}`,
            course: {
              id: course.id,
              title: course.title,
              thumbnail_url: course.thumbnail,
              instructor_name: course.instructor.name,
              total_duration_hours: parseInt(course.duration) / 60
            },
            progress: {
              percentage: status === 'completed' ? 100 : status === 'in_progress' ? 45 : 0,
              completed_lessons: status === 'completed' ? 10 : status === 'in_progress' ? 4 : 0,
              total_lessons: 10,
              last_accessed_at: new Date().toISOString(),
              estimated_time_remaining_hours: status === 'completed' ? 0 : 6.8
            },
            enrolled_at: new Date().toISOString(),
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            certificate_url: status === 'completed' ? `/certificates/${course.id}.pdf` : null
          }))
        }
      }
    }

    let endpoint = '/api/v1/student/courses/'
    const params: string[] = []
    if (status) params.push(`status=${status}`)
    if (sort) params.push(`sort=${sort}`)
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`
    }

    const response = await apiClient.get(endpoint)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async getCourseProgressDetailed(courseId: string): Promise<ServiceResult<any>> {
    if (useMockData) {
      return {
        data: {
          course_id: courseId,
          overall_progress: 45,
          sections: [
            {
              section_id: 'section_1',
              title: 'Getting Started',
              progress: 100,
              completed_lessons: 6,
              total_lessons: 6,
              lessons: [
                {
                  lesson_id: 'lesson_1',
                  title: 'Introduction',
                  type: 'video',
                  duration_minutes: 10,
                  is_completed: true,
                  completed_at: new Date().toISOString(),
                  watch_time_seconds: 600
                }
              ]
            }
          ],
          quizzes: {
            total: 8,
            completed: 3,
            average_score: 85
          },
          last_accessed: {
            lesson_id: 'lesson_4',
            lesson_title: 'Variables and Data Types',
            section_id: 'section_2',
            timestamp: new Date().toISOString()
          },
          time_spent: {
            total_minutes: 320,
            this_week_minutes: 45,
            today_minutes: 15
          }
        }
      }
    }

    const response = await apiClient.get(`/api/v1/student/courses/${courseId}/progress/`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async submitCourseReview(courseId: string, rating: number, review: string): Promise<ServiceResult<any>> {
    if (useMockData) {
      return {
        data: {
          id: `review_${Date.now()}`,
          course_id: courseId,
          rating,
          review,
          created_at: new Date().toISOString()
        }
      }
    }

    const response = await apiClient.post(`/api/v1/student/courses/${courseId}/review/`, {
      rating,
      review
    })
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async updateCourseReview(courseId: string, reviewId: string, rating: number, review: string): Promise<ServiceResult<any>> {
    if (useMockData) {
      return {
        data: {
          id: reviewId,
          course_id: courseId,
          rating,
          review,
          updated_at: new Date().toISOString()
        }
      }
    }

    const response = await apiClient.put(`/api/v1/student/courses/${courseId}/review/${reviewId}/`, {
      rating,
      review
    })
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async deleteCourseReview(courseId: string, reviewId: string): Promise<ServiceResult<void>> {
    if (useMockData) {
      return { data: undefined }
    }

    const response = await apiClient.delete(`/api/v1/student/courses/${courseId}/review/${reviewId}/`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
}

export const studentCourseService = new StudentCourseService()