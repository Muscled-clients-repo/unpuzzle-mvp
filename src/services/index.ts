// Service layer exports - single point of access for all services
export * from './types'
export * from './ai-service'
export * from './student-course-service'
export * from './instructor-course-service'
export * from './student-video-service'
export * from './instructor-video-service'
export * from './reflection-service'

// Re-export service instances for convenience
export { aiService } from './ai-service'
export { studentCourseService } from './student-course-service'
export { instructorCourseService } from './instructor-course-service'
export { studentVideoService } from './student-video-service'
export { instructorVideoService } from './instructor-video-service'
export { reflectionService } from './reflection-service'