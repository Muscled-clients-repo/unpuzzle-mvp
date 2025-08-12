// Service layer exports - single point of access for all services
export * from './types'
export * from './course-service'  // TO BE REMOVED in Phase 4 after updating stores
export * from './ai-service'

// Re-export service instances for convenience
export { courseService } from './course-service'  // TO BE REMOVED in Phase 4
export { aiService } from './ai-service'

// NOTE: user-service.ts and video-service.ts were removed as they were unused
// New role-specific services are in role-services.ts