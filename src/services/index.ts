// Service layer exports - single point of access for all services
export * from './types'
export * from './course-service'
export * from './video-service'
export * from './ai-service'
export * from './user-service'

// Re-export service instances for convenience
export { courseService } from './course-service'
export { videoService } from './video-service'
export { aiService } from './ai-service'
export { userService } from './user-service'