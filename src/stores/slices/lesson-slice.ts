import { StateCreator } from 'zustand'

export interface Lesson {
  id: string
  title: string
  description: string
  videoUrl?: string
  youtubeUrl?: string
  thumbnailUrl?: string
  duration?: string
  tags: string[]
  status: 'draft' | 'published' | 'processing'
  visibility: 'public' | 'unlisted' | 'private'
  isFree: boolean
  
  // Analytics
  views: number
  aiInteractions: number
  avgWatchTime: number
  completionRate: number
  
  // AI Features
  transcriptEnabled: boolean
  confusionsEnabled: boolean
  segmentSelectionEnabled: boolean
  
  // Marketing
  ctaText?: string
  ctaLink?: string
  relatedCourseId?: string
  
  // Metadata
  createdAt: Date
  publishedAt?: Date
  lastModified: Date
  uploadProgress?: number
}

export interface LessonAnalytics {
  lessonId: string
  totalViews: number
  uniqueViews: number
  aiInteractionsCount: number
  averageWatchTime: string
  completionRate: number
  topConfusionPoints: Array<{
    timestamp: string
    count: number
    topic: string
  }>
  conversionRate: number // to course enrollment
  shareCount: number
}

export interface LessonSlice {
  lessons: Lesson[]
  currentLesson: Lesson | null
  lessonAnalytics: LessonAnalytics[]
  uploadingLesson: Lesson | null
  isUploading: boolean
  
  // CRUD Actions
  createLesson: (lesson: Partial<Lesson>) => string
  updateLesson: (id: string, updates: Partial<Lesson>) => void
  deleteLesson: (id: string) => void
  publishLesson: (id: string) => Promise<void>
  
  // Upload Actions
  uploadLessonVideo: (file: File, lessonId: string) => void
  setYoutubeUrl: (lessonId: string, url: string) => void
  updateUploadProgress: (lessonId: string, progress: number) => void
  
  // View/Edit Actions
  setCurrentLesson: (lesson: Lesson | null) => void
  loadLessons: () => void
  loadLessonAnalytics: (lessonId: string) => void
  
  // Marketing Actions
  generateShareLink: (lessonId: string) => string
  trackView: (lessonId: string) => void
  trackAiInteraction: (lessonId: string) => void
}

export const createLessonSlice: StateCreator<LessonSlice> = (set, get) => ({
  lessons: [],
  currentLesson: null,
  lessonAnalytics: [],
  uploadingLesson: null,
  isUploading: false,
  
  createLesson: (lessonData) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: lessonData.title || 'Untitled Lesson',
      description: lessonData.description || '',
      tags: lessonData.tags || [],
      status: 'draft',
      visibility: 'public',
      isFree: true,
      views: 0,
      aiInteractions: 0,
      avgWatchTime: 0,
      completionRate: 0,
      transcriptEnabled: true,
      confusionsEnabled: true,
      segmentSelectionEnabled: true,
      createdAt: new Date(),
      lastModified: new Date(),
      ...lessonData
    }
    
    set(state => ({
      lessons: [...state.lessons, newLesson],
      currentLesson: newLesson
    }))
    
    return newLesson.id
  },
  
  updateLesson: (id, updates) => {
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === id
          ? { ...lesson, ...updates, lastModified: new Date() }
          : lesson
      ),
      currentLesson: state.currentLesson?.id === id
        ? { ...state.currentLesson, ...updates, lastModified: new Date() }
        : state.currentLesson
    }))
  },
  
  deleteLesson: (id) => {
    set(state => ({
      lessons: state.lessons.filter(lesson => lesson.id !== id),
      currentLesson: state.currentLesson?.id === id ? null : state.currentLesson
    }))
  },
  
  publishLesson: async (id) => {
    // Simulate publishing
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === id
          ? { ...lesson, status: 'processing' as const }
          : lesson
      )
    }))
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === id
          ? { 
              ...lesson, 
              status: 'published' as const,
              publishedAt: new Date()
            }
          : lesson
      )
    }))
  },
  
  uploadLessonVideo: (file, lessonId) => {
    set({ isUploading: true })
    
    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        
        set(state => ({
          isUploading: false,
          lessons: state.lessons.map(lesson =>
            lesson.id === lessonId
              ? {
                  ...lesson,
                  videoUrl: `/videos/${lessonId}.mp4`,
                  thumbnailUrl: `/thumbnails/${lessonId}.jpg`,
                  duration: '12:45',
                  status: 'draft' as const,
                  uploadProgress: 100
                }
              : lesson
          )
        }))
      } else {
        get().updateUploadProgress(lessonId, progress)
      }
    }, 500)
  },
  
  setYoutubeUrl: (lessonId, url) => {
    // Extract video ID from YouTube URL
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined
    
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === lessonId
          ? {
              ...lesson,
              youtubeUrl: url,
              thumbnailUrl,
              status: 'draft' as const
            }
          : lesson
      )
    }))
  },
  
  updateUploadProgress: (lessonId, progress) => {
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, uploadProgress: progress }
          : lesson
      )
    }))
  },
  
  setCurrentLesson: (lesson) => {
    set({ currentLesson: lesson })
  },
  
  loadLessons: () => {
    // Initialize with mock data
    set({
      lessons: [
        {
          id: 'lesson-1',
          title: 'Learn React In 30 Minutes',
          description: 'Learn the basics of React in this comprehensive beginner tutorial. Covers components, state, props, and more.',
          youtubeUrl: 'https://www.youtube.com/watch?v=hQAHSlTtcmY',
          thumbnailUrl: 'https://img.youtube.com/vi/hQAHSlTtcmY/maxresdefault.jpg',
          duration: '30:52',
          tags: ['React', 'JavaScript', 'Web Development', 'Frontend'],
          status: 'published' as const,
          visibility: 'public' as const,
          isFree: true,
          views: 1234,
          aiInteractions: 89,
          avgWatchTime: 7.5,
          completionRate: 72,
          transcriptEnabled: true,
          confusionsEnabled: true,
          segmentSelectionEnabled: true,
          ctaText: 'Master Your Coding Flow',
          ctaLink: '/course/productive-programming',
          createdAt: new Date('2024-01-15'),
          publishedAt: new Date('2024-01-16'),
          lastModified: new Date('2024-01-16')
        },
        {
          id: 'lesson-2',
          title: 'CSS Grid Explained',
          description: 'Master CSS Grid in this single comprehensive lesson',
          videoUrl: '/videos/lesson-2.mp4',
          thumbnailUrl: '/thumbnails/lesson-2.jpg',
          duration: '15:20',
          tags: ['CSS', 'Grid', 'Web Design'],
          status: 'published' as const,
          visibility: 'public' as const,
          isFree: true,
          views: 892,
          aiInteractions: 45,
          avgWatchTime: 9.2,
          completionRate: 65,
          transcriptEnabled: true,
          confusionsEnabled: true,
          segmentSelectionEnabled: true,
          createdAt: new Date('2024-01-10'),
          publishedAt: new Date('2024-01-11'),
          lastModified: new Date('2024-01-11')
        },
        {
          id: 'lesson-3',
          title: 'TypeScript Basics',
          description: 'Get started with TypeScript in your React projects',
          status: 'draft' as const,
          visibility: 'public' as const,
          isFree: true,
          views: 0,
          aiInteractions: 0,
          avgWatchTime: 0,
          completionRate: 0,
          tags: ['TypeScript', 'React'],
          transcriptEnabled: true,
          confusionsEnabled: true,
          segmentSelectionEnabled: true,
          createdAt: new Date('2024-01-20'),
          lastModified: new Date('2024-01-20')
        }
      ]
    })
  },
  
  loadLessonAnalytics: (lessonId) => {
    // Mock analytics data
    const mockAnalytics: LessonAnalytics = {
      lessonId,
      totalViews: 1234,
      uniqueViews: 890,
      aiInteractionsCount: 89,
      averageWatchTime: '7:30',
      completionRate: 72,
      topConfusionPoints: [
        { timestamp: '3:45', count: 23, topic: 'useState vs useEffect' },
        { timestamp: '5:20', count: 18, topic: 'Dependency array' },
        { timestamp: '8:10', count: 12, topic: 'Cleanup functions' }
      ],
      conversionRate: 15,
      shareCount: 45
    }
    
    set(state => ({
      lessonAnalytics: [
        ...state.lessonAnalytics.filter(a => a.lessonId !== lessonId),
        mockAnalytics
      ]
    }))
  },
  
  generateShareLink: (lessonId) => {
    return `${window.location.origin}/student/courses/learn/${lessonId}`
  },
  
  trackView: (lessonId) => {
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, views: lesson.views + 1 }
          : lesson
      )
    }))
  },
  
  trackAiInteraction: (lessonId) => {
    set(state => ({
      lessons: state.lessons.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, aiInteractions: lesson.aiInteractions + 1 }
          : lesson
      )
    }))
  }
})