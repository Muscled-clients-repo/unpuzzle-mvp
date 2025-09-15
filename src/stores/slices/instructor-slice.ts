import { StateCreator } from 'zustand'
import { InstructorCourse } from '@/types/domain'
import { FEATURES } from '@/lib/config/features'
import { supabaseCourseService } from '@/services/supabase/course-service'
import { getInstructorCourses } from '@/app/actions/get-instructor-courses'

export interface CourseAnalytics {
  courseId: string
  courseName: string
  totalStudents: number
  activeStudents: number
  totalRevenue: number
  executionRate: number // % of students who started watching
  learnRate: number // % of students actively learning
  completionRate: number
  avgProgress: number
  totalConfusions: number
  totalReflections: number
  satisfactionRate: number // Average rating out of 5
  reviewsSubmitted: number
  totalReviews: number
  strugglingTopics: Array<{
    topic: string
    timestamp: string
    studentCount: number
    resolved: boolean
  }>
  confusions: Array<{
    id: string
    studentName: string
    timestamp: string
    videoTime: string
    message: string
    resolved: boolean
    responseTime?: string
  }>
  revenue: {
    total: number
    thisMonth: number
    pending: number
  }
}

export interface InstructorStats {
  totalStudents: number
  totalRevenue: number
  totalCourses: number
  avgExecutionRate: number
  avgLearnRate: number
  totalConfusions: number
  totalReflections: number
  avgSatisfactionRate: number
  totalReviewsSubmitted: number
  avgResponseTime: string
  monthlyRevenue: number
  lifetimeRevenue: number
}

export interface StudentInsight {
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  learnRate: number
  progress: number
  lastActive: string
  strugglingAt?: string
  needsHelp: boolean
}

export interface ChartDataPoint {
  date: string
  revenue: number
  students: number
  learnRate: number // minutes per hour
  executionPace: number // percentage
}

export interface DateRange {
  from: Date
  to: Date
  preset: 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'custom'
}

export interface InstructorCourse {
  id: string
  title: string
  thumbnail: string
  status: 'published' | 'draft' | 'under_review'
  students: number
  completionRate: number
  revenue: number
  lastUpdated: string
  totalVideos: number
  totalDuration: string
  pendingConfusions: number
}

export interface TopLearner {
  id: string
  name: string
  learnRate: number
  responsesInCommunity: number
  helpfulVotes: number
  reflectionsEndorsed: number
  coursesCompleted: number
  avgScore: number
  strengths: string[]
  joinedDaysAgo: number
  currentPlan: 'basic' | 'premium' | 'enterprise'
}

export interface SimilarConfusion {
  id: string
  studentName: string
  timestamp: string
  message: string
  resolved: boolean
}

export interface InstructorSlice {
  instructorStats: InstructorStats | null
  courseAnalytics: CourseAnalytics[]
  courses: InstructorCourse[]
  studentInsights: StudentInsight[]
  loading: boolean
  error: string | null
  topLearners: TopLearner[]
  similarConfusions: SimilarConfusion[]
  allSpecializations: string[]
  pendingConfusions: Array<{
    id: string
    courseId: string
    studentName: string
    timestamp: string
    videoTime: string
    message: string
    priority: 'high' | 'medium' | 'low'
  }>
  selectedInstructorCourse: string // 'all' or specific courseId
  dateRange: DateRange
  chartData: ChartDataPoint[]
  compareData: ChartDataPoint[] // For year-over-year comparison
  isLoadingChartData: boolean
  
  // Actions
  loadInstructorData: (instructorId?: string) => Promise<void>
  loadCourses: (instructorId?: string) => Promise<void>
  
  // CRUD Operations
  createCourse: (instructorId: string, courseData: Partial<InstructorCourse>) => Promise<InstructorCourse>
  updateCourse: (courseId: string, updates: Partial<InstructorCourse>) => Promise<InstructorCourse>
  deleteCourse: (courseId: string) => Promise<void>
  updateCourseStatus: (courseId: string, status: 'published' | 'draft' | 'under_review') => Promise<void>
  
  respondToConfusion: (confusionId: string, response: string) => void
  markConfusionResolved: (confusionId: string) => void
  getConfusionHeatmap: (courseId: string) => Array<{time: string, count: number}>
  setSelectedInstructorCourse: (courseId: string) => void
  getFilteredAnalytics: () => CourseAnalytics[]
  setDateRange: (range: DateRange) => void
  loadChartData: () => void
  calculateMetricChange: (metric: 'revenue' | 'students' | 'learnRate' | 'executionPace') => number
}

export const createInstructorSlice: StateCreator<InstructorSlice> = (set, get) => ({
  instructorStats: null,
  courseAnalytics: [],
  courses: [],
  studentInsights: [],
  loading: false,
  error: null,
  topLearners: [],
  similarConfusions: [],
  allSpecializations: ['React', 'JavaScript', 'CSS', 'Python', 'Node.js', 'TypeScript', 'Data Science', 'Machine Learning'],
  pendingConfusions: [],
  selectedInstructorCourse: 'all',
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
    preset: '30days'
  },
  chartData: [],
  compareData: [],
  isLoadingChartData: false,

  loadInstructorData: async (instructorId?: string) => {
    console.log('[INSTRUCTOR SLICE] loadInstructorData called with instructorId:', instructorId)
    console.log('[INSTRUCTOR SLICE] USE_REAL_STUDENT_DATA feature flag:', FEATURES.USE_REAL_STUDENT_DATA)
    set({ loading: true, error: null })
    
    try {
      let studentInsights: StudentInsight[] = []
      let topLearners: TopLearner[] = []
      
      // Load real student data if feature flag is enabled
      if (FEATURES.USE_REAL_STUDENT_DATA && instructorId) {
        console.log('[INSTRUCTOR SLICE] Loading students from Supabase for instructor:', instructorId)
        try {
          const { getInstructorStudents } = await import('@/app/actions/get-instructor-students')
          console.log('[INSTRUCTOR SLICE] Imported server action successfully')
          const realStudents = await getInstructorStudents(instructorId)
          console.log('[DATA SOURCE] Loaded', realStudents.length, 'students from Supabase:', realStudents)
        
          // Transform to existing format
          studentInsights = realStudents.map(student => ({
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email, // Include real email
            courseId: student.courseId || '1',
            learnRate: student.learnRate,
            progress: student.progress,
            lastActive: student.lastActive || 'Unknown',
            strugglingAt: student.strugglingAt,
            needsHelp: student.needsHelp
          }))
          
          topLearners = realStudents.slice(0, 5).map(student => ({
            id: student.id,
            name: student.name,
            learnRate: student.learnRate,
            responsesInCommunity: Math.floor(Math.random() * 200),
            helpfulVotes: Math.floor(Math.random() * 1000),
            reflectionsEndorsed: Math.floor(Math.random() * 50),
            coursesCompleted: Math.floor(Math.random() * 5),
            avgScore: 85 + Math.floor(Math.random() * 15),
            strengths: ['React', 'JavaScript', 'CSS'],
            joinedDaysAgo: Math.floor(Math.random() * 200),
            currentPlan: 'basic' as const
          }))
        } catch (serverActionError) {
          console.error('[INSTRUCTOR SLICE] Error calling server action:', serverActionError)
          throw serverActionError
        }
      } else {
        // Use mock data
        console.log('[DATA SOURCE] Loading students from mock data (feature flag:', FEATURES.USE_REAL_STUDENT_DATA, ', instructor ID:', instructorId, ')')
        studentInsights = [
          {
            studentId: '1',
            studentName: 'Sarah Chen',
            studentEmail: 'sarah.chen@email.com',
            courseId: '1',
            learnRate: 52,
            progress: 75,
            lastActive: '10 mins ago',
            strugglingAt: 'useCallback Hook',
            needsHelp: true
          },
          {
            studentId: '2',
            studentName: 'Mike Johnson',
            studentEmail: 'mike.johnson@email.com',
            courseId: '1',
            learnRate: 45,
            progress: 82,
            lastActive: '1 hour ago',
            needsHelp: false
          },
          {
            studentId: '3',
            studentName: 'Emma Wilson',
            studentEmail: 'emma.wilson@email.com',
            courseId: '2',
            learnRate: 38,
            progress: 45,
            lastActive: '5 mins ago',
            strugglingAt: 'NumPy Broadcasting',
            needsHelp: true
          }
        ]
        
        topLearners = [
          {
            id: '1',
            name: 'Sarah Chen',
            learnRate: 52,
            responsesInCommunity: 147,
            helpfulVotes: 892,
            reflectionsEndorsed: 23,
            coursesCompleted: 5,
            avgScore: 94,
            strengths: ['React', 'JavaScript', 'CSS'],
            joinedDaysAgo: 120,
            currentPlan: 'premium'
          },
          {
            id: '2',
            name: 'Mike Johnson',
            learnRate: 48,
            responsesInCommunity: 89,
            helpfulVotes: 456,
            reflectionsEndorsed: 15,
            coursesCompleted: 3,
            avgScore: 91,
            strengths: ['Python', 'Data Science', 'Machine Learning'],
            joinedDaysAgo: 90,
            currentPlan: 'premium'
          },
          {
            id: '3',
            name: 'Emma Wilson',
            learnRate: 45,
            responsesInCommunity: 234,
            helpfulVotes: 1023,
            reflectionsEndorsed: 31,
            coursesCompleted: 4,
            avgScore: 88,
            strengths: ['React', 'Node.js', 'TypeScript'],
            joinedDaysAgo: 150,
            currentPlan: 'basic'
          }
        ]
      }

    // Initialize with mock or real data
    set({
      studentInsights,
      topLearners,
      instructorStats: {
        totalStudents: 2847,
        totalRevenue: 125430,
        totalCourses: 12,
        avgExecutionRate: 78.5,
        avgLearnRate: 65.3,
        totalConfusions: 1234,
        totalReflections: 892,
        avgSatisfactionRate: 4.3,
        totalReviewsSubmitted: 428,
        avgResponseTime: '2.5 hours',
        monthlyRevenue: 18970,
        lifetimeRevenue: 125430
      },
      courseAnalytics: [
        {
          courseId: '1',
          courseName: 'React Masterclass',
          totalStudents: 892,
          activeStudents: 712,
          totalRevenue: 44600,
          executionRate: 92.3,
          learnRate: 78.5,
          completionRate: 67.2,
          avgProgress: 72.5,
          totalConfusions: 234,
          totalReflections: 189,
          satisfactionRate: 4.7,
          reviewsSubmitted: 156,
          totalReviews: 178,
          strugglingTopics: [
            { topic: 'useCallback Hook', timestamp: '12:30', studentCount: 87, resolved: false },
            { topic: 'Custom Hooks', timestamp: '45:20', studentCount: 45, resolved: true },
            { topic: 'Context API', timestamp: '1:02:15', studentCount: 62, resolved: false }
          ],
          confusions: [
            {
              id: '1',
              studentName: 'Sarah Chen',
              timestamp: '2 hours ago',
              videoTime: '12:30',
              message: "Why does useCallback need a dependency array if it's supposed to memoize?",
              resolved: false
            },
            {
              id: '2',
              studentName: 'Mike Johnson',
              timestamp: '5 hours ago',
              videoTime: '45:20',
              message: "When should I use custom hooks vs regular functions?",
              resolved: true,
              responseTime: '1 hour'
            }
          ],
          revenue: {
            total: 25380,
            thisMonth: 4230,
            pending: 582
          }
        },
        {
          courseId: '2',
          courseName: 'JavaScript Fundamentals',
          totalStudents: 567,
          activeStudents: 489,
          totalRevenue: 22680,
          executionRate: 85.7,
          learnRate: 72.3,
          completionRate: 58.9,
          avgProgress: 65.3,
          totalConfusions: 178,
          totalReflections: 134,
          satisfactionRate: 4.5,
          reviewsSubmitted: 98,
          totalReviews: 112,
          strugglingTopics: [
            { topic: 'NumPy Broadcasting', timestamp: '8:45', studentCount: 92, resolved: false },
            { topic: 'Pandas Merge', timestamp: '32:10', studentCount: 57, resolved: false }
          ],
          confusions: [
            {
              id: '3',
              studentName: 'Emma Wilson',
              timestamp: '1 hour ago',
              videoTime: '8:45',
              message: "How does broadcasting work with different shaped arrays?",
              resolved: false
            }
          ],
          revenue: {
            total: 18720,
            thisMonth: 3120,
            pending: 291
          }
        }
      ],
      pendingConfusions: [
        {
          id: '1',
          courseId: '1',
          studentName: 'Sarah Chen',
          timestamp: '2 hours ago',
          videoTime: '12:30',
          message: "Why does useCallback need a dependency array?",
          priority: 'high'
        },
        {
          id: '3',
          courseId: '2',
          studentName: 'Emma Wilson',
          timestamp: '1 hour ago',
          videoTime: '8:45',
          message: "How does broadcasting work?",
          priority: 'high'
        },
        {
          id: '4',
          courseId: '1',
          studentName: 'Alex Kim',
          timestamp: '30 mins ago',
          videoTime: '1:02:15',
          message: "Context API vs Redux?",
          priority: 'medium'
        }
      ],
      similarConfusions: [
        {
          id: '1',
          studentName: 'Alex Kim',
          timestamp: '3 days ago',
          message: 'I also struggled with useCallback dependencies',
          resolved: true
        },
        {
          id: '2',
          studentName: 'Lisa Wang',
          timestamp: '1 week ago',
          message: 'The dependency array concept was confusing initially',
          resolved: true
        }
      ],
      loading: false,
      error: null
    })
    
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error loading instructor data:', error)
      
      // Fallback to mock data on error
      if (FEATURES.FALLBACK_TO_MOCK_ON_ERROR) {
        console.log('[FALLBACK] Using mock data due to error')
        // Set mock data (could call the same function recursively without instructorId)
        // For now, set loading false with empty data
        set({ 
          studentInsights: [],
          topLearners: [],
          loading: false, 
          error: null 
        })
      } else {
        set({ 
          studentInsights: [],
          topLearners: [],
          loading: false, 
          error: error.message || 'Failed to load instructor data' 
        })
      }
    }
  },

  loadCourses: async (instructorId?: string) => {
    // Mock data for fallback
    const mockCourses: InstructorCourse[] = [
      {
        id: '1',
        title: 'React Masterclass',
        thumbnail: '/api/placeholder/400/225',
        status: 'published',
        students: 423,
        completionRate: 67,
        revenue: 25380,
        lastUpdated: '2 days ago',
        totalVideos: 48,
        totalDuration: '12h 30m',
        pendingConfusions: 3
      },
      {
        id: '2',
        title: 'Python for Data Science',
        thumbnail: '/api/placeholder/400/225',
        status: 'published',
        students: 312,
        completionRate: 72,
        revenue: 18720,
        lastUpdated: '1 week ago',
        totalVideos: 36,
        totalDuration: '9h 15m',
        pendingConfusions: 1
      },
      {
        id: '3',
        title: 'Advanced TypeScript',
        thumbnail: '/api/placeholder/400/225',
        status: 'draft',
        students: 0,
        completionRate: 0,
        revenue: 0,
        lastUpdated: '3 hours ago',
        totalVideos: 12,
        totalDuration: '3h 45m',
        pendingConfusions: 0
      }
    ]
    
    // Set loading state
    set({ loading: true, error: null })
    
    try {
      let courses: InstructorCourse[]
      
      // Check feature flag and instructor ID
      if (FEATURES.USE_REAL_COURSES_DATA && instructorId) {
        // Use real Supabase data via server action (no client-side auth)
        console.log('[INSTRUCTOR SLICE] Loading courses from Supabase for instructor:', instructorId)
        courses = await getInstructorCourses(instructorId)
        console.log('[DATA SOURCE] Loaded', courses.length, 'courses from Supabase')
      } else {
        // Use mock data
        console.log('[DATA SOURCE] Loading courses from mock data (feature flag:', FEATURES.USE_REAL_COURSES_DATA, ', instructor ID:', instructorId, ')')
        courses = mockCourses
      }
      
      set({ courses, loading: false, error: null })
      
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error loading courses:', error)
      
      // Fallback to mock data on error
      if (FEATURES.FALLBACK_TO_MOCK_ON_ERROR) {
        console.log('[FALLBACK] Using mock data due to error')
        set({ courses: mockCourses, loading: false, error: null })
      } else {
        set({ 
          courses: [], 
          loading: false, 
          error: error.message || 'Failed to load courses' 
        })
      }
    }
  },

  respondToConfusion: (confusionId: string, response: string) => {
    set(state => ({
      pendingConfusions: state.pendingConfusions.filter(c => c.id !== confusionId),
      courseAnalytics: state.courseAnalytics.map(course => ({
        ...course,
        confusions: course.confusions.map(c => 
          c.id === confusionId 
            ? { ...c, resolved: true, responseTime: 'Just now' }
            : c
        )
      }))
    }))
  },

  markConfusionResolved: (confusionId: string) => {
    set(state => ({
      pendingConfusions: state.pendingConfusions.filter(c => c.id !== confusionId)
    }))
  },

  getConfusionHeatmap: (courseId: string) => {
    const course = get().courseAnalytics.find(c => c.courseId === courseId)
    if (!course) return []
    
    return course.strugglingTopics.map(topic => ({
      time: topic.timestamp,
      count: topic.studentCount
    }))
  },
  
  setSelectedInstructorCourse: (courseId: string) => {
    set({ selectedInstructorCourse: courseId })
  },
  
  getFilteredAnalytics: () => {
    const state = get()
    if (state.selectedInstructorCourse === 'all') {
      return state.courseAnalytics
    }
    return state.courseAnalytics.filter(c => c.courseId === state.selectedInstructorCourse)
  },

  setDateRange: (range: DateRange) => {
    set({ dateRange: range })
    get().loadChartData()
  },

  loadChartData: () => {
    set({ isLoadingChartData: true })
    
    // Generate mock chart data based on date range
    const { dateRange } = get()
    const days = Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    
    const chartData: ChartDataPoint[] = []
    const compareData: ChartDataPoint[] = []
    
    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(dateRange.from.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Generate mock data with some variance
      const baseRevenue = 4000 + Math.random() * 2000
      const baseStudents = 80 + Math.floor(Math.random() * 40)
      const baseLearnRate = 35 + Math.random() * 15 // minutes per hour
      const baseExecutionPace = 70 + Math.random() * 20 // percentage
      
      chartData.push({
        date: dateStr,
        revenue: Math.round(baseRevenue),
        students: baseStudents,
        learnRate: Math.round(baseLearnRate * 10) / 10,
        executionPace: Math.round(baseExecutionPace * 10) / 10
      })
      
      // Compare data (previous period)
      compareData.push({
        date: dateStr,
        revenue: Math.round(baseRevenue * 0.85),
        students: Math.floor(baseStudents * 0.9),
        learnRate: Math.round((baseLearnRate * 0.95) * 10) / 10,
        executionPace: Math.round((baseExecutionPace * 0.92) * 10) / 10
      })
    }
    
    set({ 
      chartData, 
      compareData,
      isLoadingChartData: false 
    })
  },

  calculateMetricChange: (metric: 'revenue' | 'students' | 'learnRate' | 'executionPace') => {
    const { chartData, compareData } = get()
    
    if (chartData.length === 0 || compareData.length === 0) return 0
    
    const currentSum = chartData.reduce((sum, point) => sum + point[metric], 0)
    const compareSum = compareData.reduce((sum, point) => sum + point[metric], 0)
    
    if (compareSum === 0) return 0
    
    const percentChange = ((currentSum - compareSum) / compareSum) * 100
    return Math.round(percentChange * 10) / 10
  },

  // CRUD Operations Implementation
  createCourse: async (instructorId: string, courseData: Partial<InstructorCourse>) => {
    try {
      set({ loading: true, error: null })
      
      if (FEATURES.USE_REAL_COURSE_CREATION) {
        const newCourse = await supabaseCourseService.createCourse(instructorId, courseData)
        
        set(state => ({
          courses: [newCourse, ...state.courses],
          loading: false,
          error: null
        }))
        
        console.log('[INSTRUCTOR SLICE] Created new course:', newCourse.id)
        return newCourse
      } else {
        // Mock implementation for development
        const mockCourse: InstructorCourse = {
          id: Date.now().toString(),
          title: courseData.title || 'New Course',
          thumbnail: '/api/placeholder/400/225',
          status: 'draft',
          students: 0,
          completionRate: 0,
          revenue: 0,
          totalVideos: 0,
          totalDuration: '0m',
          pendingConfusions: 0,
          lastUpdated: 'Just now'
        }
        
        set(state => ({
          courses: [mockCourse, ...state.courses],
          loading: false,
          error: null
        }))
        
        console.log('[INSTRUCTOR SLICE] Created mock course')
        return mockCourse
      }
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error creating course:', error)
      set({ loading: false, error: error.message || 'Failed to create course' })
      throw error
    }
  },

  updateCourse: async (courseId: string, updates: Partial<InstructorCourse>) => {
    try {
      set({ loading: true, error: null })
      
      if (FEATURES.USE_REAL_COURSE_UPDATES) {
        const updatedCourse = await supabaseCourseService.updateCourse(courseId, updates)
        
        set(state => ({
          courses: state.courses.map(course => 
            course.id === courseId ? updatedCourse : course
          ),
          loading: false,
          error: null
        }))
        
        console.log('[INSTRUCTOR SLICE] Updated course:', courseId)
        return updatedCourse
      } else {
        // Mock implementation
        set(state => ({
          courses: state.courses.map(course => 
            course.id === courseId ? { ...course, ...updates, lastUpdated: 'Just now' } : course
          ),
          loading: false,
          error: null
        }))
        
        const updatedCourse = get().courses.find(c => c.id === courseId)!
        console.log('[INSTRUCTOR SLICE] Updated mock course')
        return updatedCourse
      }
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error updating course:', error)
      set({ loading: false, error: error.message || 'Failed to update course' })
      throw error
    }
  },

  deleteCourse: async (courseId: string) => {
    console.log('[INSTRUCTOR SLICE] Deleting course:', courseId)
    
    // Professional pattern: Optimistic update first for instant UI feedback
    const originalCourses = get().courses // Store for potential rollback
    
    // 1. Immediately update UI (optimistic update)
    set(state => ({
      courses: state.courses.filter(course => course.id !== courseId),
      error: null // Clear any previous errors
    }))
    
    // 2. Call Server Action (modern professional pattern - no API routes needed)
    try {
      if (FEATURES.USE_REAL_COURSE_DELETION) {
        // Import and call the server action
        const { deleteCourse } = await import('@/app/actions/course-actions')
        const result = await deleteCourse(courseId)
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete course')
        }
        
        console.log('[INSTRUCTOR SLICE] Course deleted successfully:', result.message)
        console.log(`[INSTRUCTOR SLICE] ${result.videosDeleted} videos cleaned up`)
      } else {
        console.log('[INSTRUCTOR SLICE] Mock deletion completed')
      }
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error deleting course:', error)
      
      // Rollback on failure
      set({
        courses: originalCourses,
        error: error.message || 'Failed to delete course'
      })
      
      throw error
    }
  },

  updateCourseStatus: async (courseId: string, status: 'published' | 'draft' | 'under_review') => {
    try {
      if (FEATURES.USE_REAL_COURSE_UPDATES) {
        await supabaseCourseService.updateCourseStatus(courseId, status)
      }
      
      // Update local state
      set(state => ({
        courses: state.courses.map(course => 
          course.id === courseId 
            ? { ...course, status, lastUpdated: 'Just now' }
            : course
        )
      }))
      
      console.log('[INSTRUCTOR SLICE] Updated course status:', courseId, status)
    } catch (error: any) {
      console.error('[INSTRUCTOR SLICE] Error updating course status:', error)
      throw error
    }
  }
})