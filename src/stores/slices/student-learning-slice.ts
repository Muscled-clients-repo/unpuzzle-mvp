// src/stores/slices/student-learning-slice.ts
// Step 5: Store Integration - Connects UI to Database Service
// This slice manages the state for student learning with full analytics

import { StateCreator } from 'zustand'
import { Course } from '@/types/domain'
import { studentLearningService } from '@/services/student-learning.service'
import { studentCourseService } from '@/services/student-course-service'

// ============================================================
// TYPES FOR ENHANCED LEARNING STATE
// ============================================================

export interface CourseWithAnalytics {
  // Course basic info
  course: Course
  courseId: string
  
  // Progress tracking
  progress: number
  completedLessons: number
  totalLessons: number
  currentLesson: string
  currentVideoId: string | null
  estimatedTimeLeft: string
  lastAccessed: string
  
  // AI & Analytics
  aiInteractionsUsed: number
  strugglingTopics: string[]
  nextMilestone: string
  
  // Enrollment metadata
  enrollmentId: string
  enrolledAt: string
  completedAt: string | null
}

export interface UserLearningStats {
  totalCoursesEnrolled: number
  activeCoursesCount: number
  completedCoursesCount: number
  totalVideosCompleted: number
  totalWatchTimeFormatted: string
  totalAIInteractions: number
  averageCompletionRate: number
}

export interface StudentLearningState {
  // Courses with full analytics
  enrolledCoursesWithAnalytics: CourseWithAnalytics[]
  
  // Original course arrays for compatibility
  enrolledCourses: Course[]
  recommendedCourses: Course[]
  allCourses: Course[]
  
  // Current selections
  currentCourse: Course | null
  currentCourseAnalytics: CourseWithAnalytics | null
  
  // User stats
  userStats: UserLearningStats | null
  
  // UI state
  loading: boolean
  error: string | null
  lastFetch: string | null
  
  // Filters
  activeFilter: 'all' | 'in-progress' | 'completed'
}

export interface StudentLearningActions {
  // Main data loading with analytics
  loadStudentLearningData: (userId: string) => Promise<void>
  
  // Individual loaders (for compatibility)
  loadEnrolledCourses: (userId: string) => Promise<void>
  loadRecommendedCourses: (userId: string) => Promise<void>
  loadAllCourses: () => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>
  loadUserStats: (userId: string) => Promise<void>
  
  // Course actions
  enrollInCourse: (userId: string, courseId: string) => Promise<void>
  updateVideoProgress: (userId: string, courseId: string, videoId: string, percent: number, position: number) => Promise<void>
  
  // AI interactions
  recordAIInteraction: (userId: string, courseId: string, videoId: string | null, type: string, prompt: string, response: string) => Promise<void>
  
  // Learning struggles
  reportStruggle: (userId: string, courseId: string, videoId: string, concept: string) => Promise<void>
  
  // UI actions
  setCurrentCourse: (course: Course | null) => void
  setActiveFilter: (filter: 'all' | 'in-progress' | 'completed') => void
  
  // Computed
  getFilteredCourses: () => CourseWithAnalytics[]
  getCourseAnalytics: (courseId: string) => CourseWithAnalytics | undefined
}

export interface StudentLearningSlice extends StudentLearningState, StudentLearningActions {}

const initialState: StudentLearningState = {
  enrolledCoursesWithAnalytics: [],
  enrolledCourses: [],
  recommendedCourses: [],
  allCourses: [],
  currentCourse: null,
  currentCourseAnalytics: null,
  userStats: null,
  loading: false,
  error: null,
  lastFetch: null,
  activeFilter: 'all'
}

export const createStudentLearningSlice: StateCreator<StudentLearningSlice> = (set, get) => ({
  ...initialState,

  // ============================================================
  // MAIN LOADER - Gets everything in one efficient call
  // ============================================================
  loadStudentLearningData: async (userId: string) => {
    set({ loading: true, error: null })
    
    try {
      // Get enrolled courses with full analytics
      const enrollmentsResult = await studentLearningService.getStudentCoursesWithAnalytics(userId)
      
      if (enrollmentsResult.error) {
        set({ loading: false, error: enrollmentsResult.error })
        return
      }

      const enrollments = enrollmentsResult.data || []
      
      // Transform to UI format
      const coursesWithAnalytics: CourseWithAnalytics[] = enrollments.map(enrollment => ({
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          thumbnailUrl: enrollment.course.thumbnail_url,
          instructor: {
            id: enrollment.course.instructor_id,
            name: 'Instructor', // Will be populated from profiles table
            email: '',
            avatar: ''
          },
          price: enrollment.course.price,
          duration: enrollment.course.total_duration,
          difficulty: enrollment.course.difficulty as 'beginner' | 'intermediate' | 'advanced',
          tags: [],
          videos: enrollment.course.videos || [],
          enrollmentCount: 0,
          rating: 0,
          isPublished: enrollment.course.is_published,
          isFree: enrollment.course.price === 0,
          createdAt: enrollment.course.created_at,
          updatedAt: enrollment.course.updated_at
        },
        courseId: enrollment.course_id,
        progress: enrollment.progress_percent,
        completedLessons: enrollment.completed_videos,
        totalLessons: enrollment.total_videos,
        currentLesson: enrollment.current_lesson_title,
        currentVideoId: enrollment.current_video_id,
        estimatedTimeLeft: enrollment.estimated_time_remaining_formatted,
        lastAccessed: studentLearningService.transformToUIFormat([enrollment])[0].lastAccessed,
        aiInteractionsUsed: enrollment.ai_interactions_count,
        strugglingTopics: enrollment.learning_struggles?.map(s => s.concept_name) || [],
        nextMilestone: enrollment.learning_milestones?.[0]?.title || 'Continue learning',
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolled_at,
        completedAt: enrollment.completed_at
      }))

      // Also set regular enrolledCourses for compatibility
      const courses = coursesWithAnalytics.map(c => c.course)
      
      // Get user stats
      const statsResult = await studentLearningService.getUserLearningStats(userId)
      
      set({ 
        enrolledCoursesWithAnalytics: coursesWithAnalytics,
        enrolledCourses: courses,
        userStats: statsResult.data || null,
        loading: false,
        error: null,
        lastFetch: new Date().toISOString()
      })
      
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load learning data' 
      })
    }
  },

  // ============================================================
  // COMPATIBILITY METHODS (for existing UI)
  // ============================================================
  loadEnrolledCourses: async (userId: string) => {
    // Check if we should use database (import feature flag)
    const { FEATURE_FLAGS } = await import('@/config/features')
    
    if (FEATURE_FLAGS.USE_DB_FOR_ENROLLMENT) {
      // Use the main loader which gets everything from database
      await get().loadStudentLearningData(userId)
    } else {
      // Use existing mock data service
      set({ loading: true, error: null })
      const result = await studentCourseService.getEnrolledCourses(userId)
      
      if (result.error) {
        set({ loading: false, error: result.error })
      } else {
        set({ loading: false, enrolledCourses: result.data || [], error: null })
      }
    }
  },

  loadRecommendedCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    // Use existing service for recommended courses (doesn't need analytics)
    const result = await studentCourseService.getRecommendedCourses(userId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, recommendedCourses: result.data || [], error: null })
    }
  },

  loadAllCourses: async () => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getAllCourses()
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, allCourses: result.data || [], error: null })
    }
  },

  loadCourseById: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getCourseById(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      const course = result.data
      set({ loading: false, currentCourse: course || null, error: null })
      
      // Also set analytics if we have it
      if (course) {
        const analytics = get().getCourseAnalytics(course.id)
        set({ currentCourseAnalytics: analytics || null })
      }
    }
  },

  loadUserStats: async (userId: string) => {
    const result = await studentLearningService.getUserLearningStats(userId)
    
    if (result.data) {
      set({ userStats: result.data })
    }
  },

  // ============================================================
  // COURSE ACTIONS
  // ============================================================
  enrollInCourse: async (userId: string, courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentLearningService.enrollInCourse(userId, courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else if (result.data?.success) {
      // Reload all data after enrollment
      await get().loadStudentLearningData(userId)
    }
  },

  updateVideoProgress: async (userId: string, courseId: string, videoId: string, percent: number, position: number) => {
    const result = await studentLearningService.updateVideoProgress(
      userId,
      courseId,
      videoId,
      percent,
      position
    )
    
    if (result.error) {
      console.error('Failed to update progress:', result.error)
    } else {
      // Optionally reload data to get updated progress
      // For performance, you might want to update local state instead
      await get().loadStudentLearningData(userId)
    }
  },

  // ============================================================
  // AI & LEARNING ANALYTICS
  // ============================================================
  recordAIInteraction: async (userId: string, courseId: string, videoId: string | null, type: string, prompt: string, response: string) => {
    const result = await studentLearningService.recordAIInteraction(
      userId,
      courseId,
      videoId,
      type,
      prompt,
      response
    )
    
    if (!result.error) {
      // Update local state to increment AI interaction count
      const courses = get().enrolledCoursesWithAnalytics
      const updatedCourses = courses.map(c => 
        c.courseId === courseId 
          ? { ...c, aiInteractionsUsed: c.aiInteractionsUsed + 1 }
          : c
      )
      set({ enrolledCoursesWithAnalytics: updatedCourses })
    }
  },

  reportStruggle: async (userId: string, courseId: string, videoId: string, concept: string) => {
    const result = await studentLearningService.detectLearningStruggle(
      userId,
      courseId,
      videoId,
      concept,
      'manual_report'
    )
    
    if (!result.error) {
      // Update local state to add struggling topic
      const courses = get().enrolledCoursesWithAnalytics
      const updatedCourses = courses.map(c => {
        if (c.courseId === courseId && !c.strugglingTopics.includes(concept)) {
          return { ...c, strugglingTopics: [...c.strugglingTopics, concept] }
        }
        return c
      })
      set({ enrolledCoursesWithAnalytics: updatedCourses })
    }
  },

  // ============================================================
  // UI ACTIONS
  // ============================================================
  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course })
    
    // Also set analytics if available
    if (course) {
      const analytics = get().getCourseAnalytics(course.id)
      set({ currentCourseAnalytics: analytics || null })
    } else {
      set({ currentCourseAnalytics: null })
    }
  },

  setActiveFilter: (filter: 'all' | 'in-progress' | 'completed') => {
    set({ activeFilter: filter })
  },

  // ============================================================
  // COMPUTED GETTERS
  // ============================================================
  getFilteredCourses: () => {
    const { enrolledCoursesWithAnalytics, activeFilter } = get()
    
    switch (activeFilter) {
      case 'in-progress':
        return enrolledCoursesWithAnalytics.filter(c => c.progress > 0 && c.progress < 100)
      case 'completed':
        return enrolledCoursesWithAnalytics.filter(c => c.progress >= 100)
      default:
        return enrolledCoursesWithAnalytics
    }
  },

  getCourseAnalytics: (courseId: string) => {
    return get().enrolledCoursesWithAnalytics.find(c => c.courseId === courseId)
  }
})