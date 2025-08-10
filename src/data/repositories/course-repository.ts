import { mockCourses } from '@/data/mock'
import { BaseRepository } from './base-repository'
import type { Course, CourseFilters } from '@/services/course-service'

export interface CourseRepositoryInterface {
  findAll(filters?: CourseFilters): Promise<Course[]>
  findById(id: string): Promise<Course | null>
  findByInstructor(instructorId: string): Promise<Course[]>
  findByCategory(category: string): Promise<Course[]>
  search(query: string): Promise<Course[]>
  findPopular(limit?: number): Promise<Course[]>
  findRecent(limit?: number): Promise<Course[]>
}

export class CourseRepository extends BaseRepository implements CourseRepositoryInterface {
  constructor() {
    super({
      cacheEnabled: true,
      defaultTTL: 10 * 60 * 1000, // 10 minutes for course data
      maxCacheSize: 50
    })
  }

  async findAll(filters?: CourseFilters): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'all', JSON.stringify(filters || {}))
    
    // Try cache first
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(200) // Simulate network delay

    let courses = [...mockCourses]

    // Apply filters
    if (filters) {
      if (filters.category) {
        courses = courses.filter(course => 
          course.category.toLowerCase().includes(filters.category!.toLowerCase())
        )
      }

      if (filters.level) {
        courses = courses.filter(course => course.level === filters.level)
      }

      if (filters.instructor) {
        courses = courses.filter(course => 
          course.instructor.name.toLowerCase().includes(filters.instructor!.toLowerCase())
        )
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        courses = courses.filter(course =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm) ||
          course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }

      if (filters.duration) {
        courses = courses.filter(course => {
          // Convert duration string to minutes for comparison
          const durationMatch = course.duration.match(/(\d+)/)
          const courseDuration = durationMatch ? parseInt(durationMatch[1]) : 0
          return courseDuration >= (filters.duration!.min || 0) && 
                 courseDuration <= (filters.duration!.max || Infinity)
        })
      }
    }

    // Transform and validate data
    const transformedCourses = this.transform(courses, this.transformCourseData)
    const validCourses = transformedCourses.filter(course => 
      this.validate(course, this.validateCourseData)
    )

    // Cache the results
    this.setCache(cacheKey, validCourses)

    return validCourses
  }

  async findById(id: string): Promise<Course | null> {
    const cacheKey = this.getCacheKey('course', id)
    
    // Try cache first
    const cached = this.getFromCache<Course>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(150)

    const course = mockCourses.find(c => c.id === id)
    if (!course) {
      return null
    }

    const transformedCourse = this.transformCourseData(course)
    
    if (this.validateCourseData(transformedCourse)) {
      this.setCache(cacheKey, transformedCourse)
      return transformedCourse
    }

    return null
  }

  async findByInstructor(instructorId: string): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'instructor', instructorId)
    
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(180)

    const courses = mockCourses.filter(course => course.instructor.id === instructorId)
    const transformedCourses = this.transform(courses, this.transformCourseData)
    
    this.setCache(cacheKey, transformedCourses)
    return transformedCourses
  }

  async findByCategory(category: string): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'category', category)
    
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(160)

    const courses = mockCourses.filter(course => 
      course.category.toLowerCase() === category.toLowerCase()
    )
    const transformedCourses = this.transform(courses, this.transformCourseData)
    
    this.setCache(cacheKey, transformedCourses)
    return transformedCourses
  }

  async search(query: string): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'search', query.toLowerCase())
    
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(250)

    const searchTerm = query.toLowerCase()
    const courses = mockCourses.filter(course =>
      course.title.toLowerCase().includes(searchTerm) ||
      course.description.toLowerCase().includes(searchTerm) ||
      course.instructor.name.toLowerCase().includes(searchTerm) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )

    const transformedCourses = this.transform(courses, this.transformCourseData)
    
    // Cache search results for shorter time
    this.setCache(cacheKey, transformedCourses, 2 * 60 * 1000) // 2 minutes
    return transformedCourses
  }

  async findPopular(limit: number = 10): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'popular', limit)
    
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(200)

    // Sort by rating and enrollment count
    const popularCourses = [...mockCourses]
      .sort((a, b) => {
        const aScore = a.rating * 0.6 + (a.enrolledCount / 1000) * 0.4
        const bScore = b.rating * 0.6 + (b.enrolledCount / 1000) * 0.4
        return bScore - aScore
      })
      .slice(0, limit)

    const transformedCourses = this.transform(popularCourses, this.transformCourseData)
    
    this.setCache(cacheKey, transformedCourses, 30 * 60 * 1000) // 30 minutes for popular courses
    return transformedCourses
  }

  async findRecent(limit: number = 10): Promise<Course[]> {
    const cacheKey = this.getCacheKey('courses', 'recent', limit)
    
    const cached = this.getFromCache<Course[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(180)

    // Mock recent courses (in real app, would sort by creation date)
    const recentCourses = [...mockCourses]
      .reverse() // Simulate recent = reverse order
      .slice(0, limit)

    const transformedCourses = this.transform(recentCourses, this.transformCourseData)
    
    this.setCache(cacheKey, transformedCourses, 15 * 60 * 1000) // 15 minutes
    return transformedCourses
  }

  // Data transformation method
  private transformCourseData = (course: any): Course => {
    return {
      ...course,
      // Ensure consistent data format
      price: typeof course.price === 'string' ? parseFloat(course.price) : course.price,
      rating: Math.min(5, Math.max(0, course.rating)), // Clamp rating between 0-5
      enrolledCount: Math.max(0, course.enrolledCount), // Ensure positive
      // Add computed fields
      videoCount: course.videos?.length || 0,
      tags: course.tags || []
    }
  }

  // Data validation method
  private validateCourseData = (course: Course): boolean => {
    return !!(
      course.id &&
      course.title &&
      course.instructor?.id &&
      course.instructor?.name &&
      course.category &&
      course.level &&
      typeof course.rating === 'number' &&
      course.rating >= 0 &&
      course.rating <= 5
    )
  }

  // Cache invalidation methods
  public invalidateCoursesCache(): void {
    this.invalidateCache('courses')
  }

  public invalidateCourseCache(courseId: string): void {
    this.invalidateCache(courseId)
  }
}

// Export singleton instance
export const courseRepository = new CourseRepository()