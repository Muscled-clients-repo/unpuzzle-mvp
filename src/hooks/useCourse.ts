import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { useApiRequest } from './baseHook'
import { 
  Course, 
  Video, 
  CourseProgress, 
  VideoProgress,
  AIMessage,
  AIChat,
  ServiceResult,
  UseCourseReturn,
  CourseFilters,
  EnrollmentData,
  CourseReview,
  CourseFormData,
  VideoFormData,
  CourseAnalytics,
  CourseOutline
} from '@/types'



/**
 * Comprehensive hook for course management
 * Handles both student and instructor course operations
 */
export const useCourse = (): UseCourseReturn => {
  const router = useRouter()
  const { apiRequest } = useApiRequest()
  
  // Get user and course state from store
  const { 
    profile: user,
    // Student course state
    enrolledCourses,
    courseProgress,
    loadEnrolledCourses,
    enrollInCourse: storeEnrollInCourse,
    loadCourseProgress,
    
    // Instructor course state
    instructorCourses,
    currentCourse,
    currentCourseAnalytics,
    loadInstructorCourses,
    createCourse: storeCreateCourse,
    updateCourse: storeUpdateCourse,
    setCurrentCourse: storeSetCurrentCourse,
  } = useAppStore()
  
  // Local state
  const [courses, setCourses] = useState<Course[]>([])
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Determine user role
  const isStudent = user?.role === 'student'
  const isInstructor = user?.role === 'instructor'
  
  // ============= STUDENT FUNCTIONS =============
  
  // Get all available courses with filters
  const getAllCourses = useCallback(async (filters?: CourseFilters): Promise<ServiceResult<Course[]>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Build query params
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.priceRange && filters.priceRange !== 'all') params.append('priceRange', filters.priceRange)
      if (filters?.minRating) params.append('minRating', filters.minRating.toString())
      if (filters?.instructor) params.append('instructor', filters.instructor)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      
      const queryString = params.toString()
      const endpoint = `/courses${queryString ? `?${queryString}` : ''}`
      
      const response = await apiRequest<Course[]>(endpoint, { method: 'GET' })
      
      if (response.data) {
        setCourses(response.data)
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch courses')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest])
  
  // Get course by ID
  const getCourseById = useCallback(async (courseId: string): Promise<ServiceResult<Course>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Course>(`/courses/${courseId}`, { method: 'GET' })
      
      if (response.data) {
        storeSetCurrentCourse(response.data)
        return { data: response.data }
      } else {
        throw new Error('Course not found')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest, storeSetCurrentCourse])
  
  // Get enrolled courses for current user
  const getEnrolledCourses = useCallback(async (): Promise<ServiceResult<Course[]>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Course[]>('/student/courses', {
        method: 'GET'
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch enrolled courses')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enrolled courses'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest])
  
  // Enroll in a course
  const enrollInCourse = useCallback(async (data: EnrollmentData): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/courses/${data.courseId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: data.paymentMethod,
          couponCode: data.couponCode
        })
      })
      
      if (response.data) {
        await storeEnrollInCourse(user?.id || '', data.courseId)
        return { data: true }
      } else {
        throw new Error('Failed to enroll in course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, storeEnrollInCourse])
  
  // Unenroll from a course
  const unenrollFromCourse = useCallback(async (courseId: string): Promise<ServiceResult<boolean>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/courses/${courseId}/unenroll`, {
        method: 'POST'
      })
      
      if (response.data) {
        await loadEnrolledCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to unenroll from course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unenroll'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadEnrolledCourses])
  
  // Get course progress
  const getCourseProgress = useCallback(async (courseId: string): Promise<ServiceResult<CourseProgress>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await loadCourseProgress(user?.id || '', courseId)
      return { data: courseProgress || undefined }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progress'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, loadCourseProgress, courseProgress])
  
  // Get video progress
  const getVideoProgress = useCallback(async (videoId: string): Promise<ServiceResult<VideoProgress>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<VideoProgress>(`/videos/${videoId}/progress`, { 
        method: 'GET' 
      })
      
      if (response.data) {
        setVideoProgress(response.data)
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch video progress')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch video progress'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Mark video as complete
  const markVideoComplete = useCallback(async (videoId: string): Promise<ServiceResult<boolean>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/videos/${videoId}/complete`, {
        method: 'POST'
      })
      
      if (response.data) {
        return { data: true }
      } else {
        throw new Error('Failed to mark video complete')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark complete'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Update video progress
  const updateVideoProgress = useCallback(async (
    videoId: string, 
    watchedSeconds: number
  ): Promise<ServiceResult<boolean>> => {
    if (!user) return { error: 'User not authenticated' }
    
    try {
      const response = await apiRequest(`/videos/${videoId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ watchedSeconds })
      })
      
      return response.data ? { data: true } : { error: 'Failed to update progress' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress'
      return { error: errorMessage }
    }
  }, [user, apiRequest])
  
  // Submit quiz answer
  const submitQuizAnswer = useCallback(async (
    videoId: string,
    quizId: string,
    answer: number
  ): Promise<ServiceResult<boolean>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/videos/${videoId}/quiz/${quizId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer })
      })
      
      return response.data ? { data: (response.data as { correct: boolean }).correct } : { error: 'Failed to submit answer' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit quiz answer'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Get recommended courses
  const getRecommendedCourses = useCallback(async (): Promise<ServiceResult<Course[]>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Course[]>('/courses/recommended', { 
        method: 'GET' 
      })
      
      return response.data ? { data: response.data } : { error: 'No recommendations found' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Search courses
  const searchCourses = useCallback(async (query: string): Promise<ServiceResult<Course[]>> => {
    return getAllCourses({ search: query })
  }, [getAllCourses])
  
  // Rate a course
  const rateCourse = useCallback(async (
    courseId: string,
    rating: number,
    comment?: string
  ): Promise<ServiceResult<boolean>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/courses/${courseId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      })
      
      return response.data ? { data: true } : { error: 'Failed to submit review' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Get course reviews
  const getCourseReviews = useCallback(async (courseId: string): Promise<ServiceResult<CourseReview[]>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<CourseReview[]>(`/courses/${courseId}/reviews`, {
        method: 'GET'
      })
      
      return response.data ? { data: response.data } : { error: 'No reviews found' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reviews'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest])
  
  // ============= INSTRUCTOR FUNCTIONS =============
  
  // Get instructor's courses
  const getInstructorCourses = useCallback(async (): Promise<ServiceResult<Course[]>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Make actual API request instead of using mock data
      const response = await apiRequest<Course[]>('/instructor/courses', {
        method: 'GET'
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch instructor courses')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest])
  
  // Create a new course
  const createCourse = useCallback(async (data: CourseFormData): Promise<ServiceResult<Course>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // For test mode or when user is not available, create a mock instructor
      const instructorData = user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      } : {
        id: 'test-instructor-123',
        name: 'Test Instructor',
        email: 'test@example.com',
        avatar: 'https://via.placeholder.com/40'
      }
      
      const courseData = {
        ...data,
        instructor: instructorData
      }
      
      // Only call store functions if user exists (not in test mode)
      if (user && isInstructor) {
        await storeCreateCourse(courseData as Partial<Course>)
      }
      
      const response = await apiRequest<Course>('/instructor/courses', {
        method: 'POST',
        body: JSON.stringify(courseData)
      })
      
      if (response.data) {
        // Only load instructor courses if user exists
        if (user && isInstructor) {
          await loadInstructorCourses(user?.id || '')
        }
        return { data: response.data }
      } else {
        throw new Error('Failed to create course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, storeCreateCourse, loadInstructorCourses])
  
  // Update course
  const updateCourse = useCallback(async (
    courseId: string,
    data: Partial<CourseFormData>
  ): Promise<ServiceResult<Course>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await storeUpdateCourse(courseId, data as Partial<Course>)
      
      const response = await apiRequest<Course>(`/instructor/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: response.data }
      } else {
        throw new Error('Failed to update course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, storeUpdateCourse, loadInstructorCourses])
  
  // Delete course
  const deleteCourse = useCallback(async (courseId: string): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/instructor/courses/${courseId}`, {
        method: 'DELETE'
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to delete course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Publish course
  const publishCourse = useCallback(async (courseId: string): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/instructor/courses/${courseId}/publish`, {
        method: 'POST'
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to publish course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Unpublish course
  const unpublishCourse = useCallback(async (courseId: string): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/instructor/courses/${courseId}/unpublish`, {
        method: 'POST'
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to unpublish course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unpublish course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Duplicate course
  const duplicateCourse = useCallback(async (courseId: string): Promise<ServiceResult<Course>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Course>(`/instructor/courses/${courseId}/duplicate`, {
        method: 'POST'
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: response.data }
      } else {
        throw new Error('Failed to duplicate course')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate course'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // ============= VIDEO MANAGEMENT (INSTRUCTOR) =============
  
  // Add video to course
  const addVideoToCourse = useCallback(async (
    courseId: string,
    video: VideoFormData
  ): Promise<ServiceResult<Video>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Video>(`/instructor/courses/${courseId}/videos`, {
        method: 'POST',
        body: JSON.stringify(video)
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: response.data }
      } else {
        throw new Error('Failed to add video')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add video'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Update video
  const updateVideo = useCallback(async (
    videoId: string,
    data: Partial<VideoFormData>
  ): Promise<ServiceResult<Video>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<Video>(`/instructor/videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: response.data }
      } else {
        throw new Error('Failed to update video')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update video'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Delete video
  const deleteVideo = useCallback(async (videoId: string): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/instructor/videos/${videoId}`, {
        method: 'DELETE'
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to delete video')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete video'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Reorder videos
  const reorderVideos = useCallback(async (
    courseId: string,
    videoIds: string[]
  ): Promise<ServiceResult<boolean>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest(`/instructor/courses/${courseId}/videos/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ videoIds })
      })
      
      if (response.data) {
        await loadInstructorCourses(user?.id || '')
        return { data: true }
      } else {
        throw new Error('Failed to reorder videos')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder videos'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest, loadInstructorCourses])
  
  // Upload video file
  const uploadVideoFile = useCallback(async (file: File): Promise<ServiceResult<string>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('video', file)
      
      const response = await apiRequest<{ url: string }>('/instructor/videos/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Remove Content-Type to let browser set it with boundary
        }
      })
      
      if (response.data?.url) {
        return { data: response.data.url }
      } else {
        throw new Error('Failed to upload video')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // ============= ANALYTICS (INSTRUCTOR) =============
  
  // Get course analytics
  const getCourseAnalytics = useCallback(async (courseId: string): Promise<ServiceResult<CourseAnalytics>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<CourseAnalytics>(`/instructor/courses/${courseId}/analytics`, {
        method: 'GET'
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Get student progress
  const getStudentProgress = useCallback(async (
    courseId: string,
    studentId: string
  ): Promise<ServiceResult<CourseProgress>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<CourseProgress>(
        `/instructor/courses/${courseId}/students/${studentId}/progress`,
        { method: 'GET' }
      )
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch student progress')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progress'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Export analytics
  const exportAnalytics = useCallback(async (
    courseId: string,
    format: 'csv' | 'pdf'
  ): Promise<ServiceResult<string>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<{ url: string }>(
        `/instructor/courses/${courseId}/analytics/export?format=${format}`,
        { method: 'GET' }
      )
      
      if (response.data?.url) {
        // Trigger download
        window.open(response.data.url, '_blank')
        return { data: response.data.url }
      } else {
        throw new Error('Failed to export analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export analytics'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // ============= AI FEATURES =============
  
  // Get AI recommendations
  const getAIRecommendations = useCallback(async (courseId: string): Promise<ServiceResult<string[]>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<{ recommendations: string[] }>(
        `/ai/courses/${courseId}/recommendations`,
        { method: 'GET' }
      )
      
      if (response.data?.recommendations) {
        return { data: response.data.recommendations }
      } else {
        throw new Error('Failed to get AI recommendations')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Generate course outline
  const generateCourseOutline = useCallback(async (topic: string): Promise<ServiceResult<CourseOutline>> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<CourseOutline>(`/ai/courses/generate-outline`, {
        method: 'POST',
        body: JSON.stringify({ topic })
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to generate outline')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate outline'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Get AI chat history
  const getAIChatHistory = useCallback(async (videoId: string): Promise<ServiceResult<AIChat>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<AIChat>(`/ai/videos/${videoId}/chat`, {
        method: 'GET'
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to fetch chat history')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chat'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // Send AI message
  const sendAIMessage = useCallback(async (
    videoId: string,
    message: string
  ): Promise<ServiceResult<AIMessage>> => {
    if (!user) return { error: 'User not authenticated' }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest<AIMessage>(`/ai/videos/${videoId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message })
      })
      
      if (response.data) {
        return { data: response.data }
      } else {
        throw new Error('Failed to send message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [user, apiRequest])
  
  // ============= UTILITY FUNCTIONS =============
  
  // Set current course
  const setCurrentCourse = useCallback((course: Course | null) => {
    storeSetCurrentCourse(course)
  }, [storeSetCurrentCourse])
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Refresh courses
  const refreshCourses = useCallback(async () => {
    if (!user) return
    
    if (isStudent) {
      await loadEnrolledCourses(user?.id || '')
    }
    
    if (isInstructor) {
      await loadInstructorCourses(user.id)
    }
  }, [user, isStudent, isInstructor, loadEnrolledCourses, loadInstructorCourses])
  
  // ============= NAVIGATION HELPERS =============
  
  // Navigate to course
  const navigateToCourse = useCallback((courseId: string) => {
    if (isStudent) {
      router.push(`/student/course/${courseId}`)
    } else if (isInstructor) {
      router.push(`/instructor/course/${courseId}`)
    } else {
      router.push(`/course/${courseId}`)
    }
  }, [router])
  
  // Navigate to video
  const navigateToVideo = useCallback((courseId: string, videoId: string) => {
    if (isStudent) {
      router.push(`/student/course/${courseId}/video/${videoId}`)
    } else {
      router.push(`/course/${courseId}/video/${videoId}`)
    }
  }, [router, isStudent])
  
  // Navigate to course edit
  const navigateToCourseEdit = useCallback((courseId: string) => {
    if (!isInstructor) return
    router.push(`/instructor/course/${courseId}/edit`)
  }, [router])
  
  // Navigate to course analytics
  const navigateToCourseAnalytics = useCallback((courseId: string) => {
    if (!isInstructor) return
    router.push(`/instructor/course/${courseId}/analytics`)
  }, [router])
  
  // Auto-load courses on mount for authenticated users
  useEffect(() => {
    if (user) {
      refreshCourses()
    }
  }, [user, refreshCourses])
  
  return {
    // State
    courses,
    enrolledCourses,
    instructorCourses,
    currentCourse,
    courseProgress,
    videoProgress,
    courseAnalytics: currentCourseAnalytics as CourseAnalytics | null,
    isLoading,
    error,
    
    // Student actions
    getAllCourses,
    getCourseById,
    getEnrolledCourses,
    enrollInCourse,
    unenrollFromCourse,
    getCourseProgress,
    getVideoProgress,
    markVideoComplete,
    updateVideoProgress,
    submitQuizAnswer,
    getRecommendedCourses,
    searchCourses,
    rateCourse,
    getCourseReviews,
    
    // Instructor actions
    getInstructorCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    publishCourse,
    unpublishCourse,
    duplicateCourse,
    
    // Video management
    addVideoToCourse,
    updateVideo,
    deleteVideo,
    reorderVideos,
    uploadVideoFile,
    
    // Analytics
    getCourseAnalytics,
    getStudentProgress,
    exportAnalytics,
    
    // AI features
    getAIRecommendations,
    generateCourseOutline,
    getAIChatHistory,
    sendAIMessage,
    
    // Utility functions
    setCurrentCourse,
    clearError,
    refreshCourses,
    
    // Navigation helpers
    navigateToCourse,
    navigateToVideo,
    navigateToCourseEdit,
    navigateToCourseAnalytics
  }
}

// Helper hook for course pages that require authentication
export const useRequireCourse = (courseId: string) => {
  const course = useCourse()
  
  useEffect(() => {
    if (courseId) {
      course.getCourseById(courseId)
    }
  }, [courseId, course])
  
  return course
}

// Helper hook for instructor course management
export const useInstructorCourses = () => {
  const course = useCourse()
  const { profile: user } = useAppStore()
  const router = useRouter()
  
  useEffect(() => {
    if (!user || user.role !== 'instructor') {
      router.push('/login')
      return
    }
    
    course.getInstructorCourses()
  }, [user, course, router])
  
  return course
}

// Helper hook for student enrolled courses
export const useStudentCourses = () => {
  const course = useCourse()
  const { profile: user } = useAppStore()
  const router = useRouter()
  
  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/login')
      return
    }
    
    course.getEnrolledCourses()
  }, [user, course, router])
  
  return course
}