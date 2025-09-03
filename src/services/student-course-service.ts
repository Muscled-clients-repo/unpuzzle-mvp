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

    // When not using mock data, query Supabase directly
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      console.log('Fetching enrollments for userId:', userId)
      
      // Get enrollments with course details
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            instructor_id,
            total_duration_minutes,
            total_videos,
            price,
            is_free,
            status,
            difficulty,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })

      if (error) {
        console.error('Error fetching enrollments:', error)
        return { error: error.message }
      }

      console.log('Enrollments found:', enrollments?.length || 0)

      if (!enrollments || enrollments.length === 0) {
        console.log('No enrollments found for user:', userId)
        return { data: [] }
      }

      // Get videos for each course
      const courseIds = enrollments.map(e => e.course_id).filter(Boolean)
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .in('course_id', courseIds)
        .order('created_at')

      // Group videos by course
      const videosByCourse = videos?.reduce((acc, video) => {
        if (!acc[video.course_id]) acc[video.course_id] = []
        acc[video.course_id].push(video)
        return acc
      }, {} as Record<string, any[]>) || {}

      // Transform to Course type
      const courses: Course[] = enrollments
        .filter(enrollment => enrollment.courses) // Only process if course data exists
        .map(enrollment => ({
          id: enrollment.courses.id,
          title: enrollment.courses.title,
          description: enrollment.courses.description || '',
          thumbnailUrl: enrollment.courses.thumbnail_url || '',
          instructor: {
            id: enrollment.courses.instructor_id,
            name: 'Instructor', // Will be populated from profiles
            email: '',
            avatar: ''
          },
          price: enrollment.courses.price || 0,
          duration: enrollment.courses.total_duration_minutes || 0,
          difficulty: (enrollment.courses.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
          tags: [],  // Will be populated from courses.tags if needed
          videos: videosByCourse[enrollment.course_id] || [],
          enrollmentCount: 0,
          rating: 0,
          isPublished: enrollment.courses.status === 'published',
          isFree: enrollment.courses.is_free || enrollment.courses.price === 0,
          createdAt: enrollment.courses.created_at,
          updatedAt: enrollment.courses.updated_at
        }))

      return { data: courses }
    } catch (error) {
      console.error('Service error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to fetch courses' }
    }
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

    // Query from Supabase instead of API
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get enrollment progress for this course
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .select('progress_percent, completed_videos, total_videos, last_accessed_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single()
      
      if (error || !enrollment) {
        // Return default progress if not found
        return {
          data: {
            userId,
            courseId,
            videosCompleted: 0,
            totalVideos: 0,
            percentComplete: 0,
            lastAccessedAt: new Date().toISOString()
          }
        }
      }
      
      return {
        data: {
          userId,
          courseId,
          videosCompleted: enrollment.completed_videos || 0,
          totalVideos: enrollment.total_videos || 0,
          percentComplete: enrollment.progress_percent || 0,
          lastAccessedAt: enrollment.last_accessed_at || new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error fetching course progress:', error)
      return { error: error instanceof Error ? error.message : 'Failed to fetch progress' }
    }
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
    courseId: string
  ): Promise<ServiceResult<{ success: boolean; message: string }>> {
    if (useMockData) {
      return {
        data: {
          success: true,
          message: 'Successfully enrolled in course'
        }
      }
    }

    const response = await apiClient.post(
      `/api/student/courses/${courseId}/enroll`,
      { userId }
    )
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
    if (useMockData) {
      const course = mockCourses.find(c => c.id === courseId)
      if (!course) return { data: null }

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

    const response = await apiClient.get<Course>(`/api/courses/${courseId}`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
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
}

export const studentCourseService = new StudentCourseService()