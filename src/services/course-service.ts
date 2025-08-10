import { courseRepository } from '@/data/repositories'
import { ServiceResult, FilterOptions, PaginationOptions } from './types'

// Types for course service
export interface CourseFilters extends FilterOptions {
  level?: 'beginner' | 'intermediate' | 'advanced'
  instructor?: string
  duration?: {
    min: number
    max: number
  }
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    avatar: string
  }
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  videoCount: number
  enrolledCount: number
  rating: number
  price: number
  thumbnail: string
  tags: string[]
  videos: Array<{
    id: string
    title: string
    description: string
    duration: string
    videoUrl: string
    transcript?: string
    timestamps?: Array<{
      time: number
      label: string
      type: 'chapter' | 'concept' | 'exercise'
    }>
  }>
}

export interface UserProgress {
  courseId: string
  userId: string
  completedVideos: string[]
  currentVideoId: string | null
  lastWatchedAt: Date
  totalWatchTime: number
  progressPercentage: number
}

// Course service interface
export interface CourseService {
  getCourses(filters?: CourseFilters, pagination?: PaginationOptions): Promise<ServiceResult<Course[]>>
  getCourseById(id: string): Promise<ServiceResult<Course>>
  getUserProgress(userId: string, courseId: string): Promise<ServiceResult<UserProgress>>
  updateProgress(userId: string, courseId: string, videoId: string, progress: number): Promise<ServiceResult<void>>
  searchCourses(query: string): Promise<ServiceResult<Course[]>>
}

// Mock implementation that can be easily replaced with API calls
class MockCourseService implements CourseService {
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getCourses(filters?: CourseFilters, pagination?: PaginationOptions): Promise<ServiceResult<Course[]>> {
    try {
      const courses = await courseRepository.findAll(filters)
      
      // Apply pagination if requested
      let finalCourses = courses
      if (pagination?.limit) {
        const offset = pagination.offset || 0
        finalCourses = courses.slice(offset, offset + pagination.limit)
      }
      
      return { data: finalCourses }
    } catch (error) {
      return { error: 'Failed to fetch courses' }
    }
  }

  async getCourseById(id: string): Promise<ServiceResult<Course>> {
    try {
      const course = await courseRepository.findById(id)
      if (!course) {
        return { error: 'Course not found' }
      }
      
      return { data: course }
    } catch (error) {
      return { error: 'Failed to fetch course details' }
    }
  }

  async getUserProgress(userId: string, courseId: string): Promise<ServiceResult<UserProgress>> {
    try {
      await this.delay(150)
      
      // Mock progress data
      const mockProgress: UserProgress = {
        courseId,
        userId,
        completedVideos: [], // Would come from backend
        currentVideoId: null,
        lastWatchedAt: new Date(),
        totalWatchTime: 0,
        progressPercentage: 0
      }
      
      return { data: mockProgress }
    } catch (error) {
      return { error: 'Failed to fetch user progress' }
    }
  }

  async updateProgress(userId: string, courseId: string, videoId: string, progress: number): Promise<ServiceResult<void>> {
    try {
      await this.delay(100)
      
      // Mock progress update - would send to backend
      console.log('Updating progress:', { userId, courseId, videoId, progress })
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to update progress' }
    }
  }

  async searchCourses(query: string): Promise<ServiceResult<Course[]>> {
    try {
      const results = await courseRepository.search(query)
      return { data: results }
    } catch (error) {
      return { error: 'Search failed' }
    }
  }
}

// Export singleton instance
export const courseService: CourseService = new MockCourseService()