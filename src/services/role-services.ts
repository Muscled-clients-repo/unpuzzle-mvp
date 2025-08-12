// src/services/role-services.ts
// Central export for all role-specific services

// Video Services
export { studentVideoService } from './student-video-service'
export { instructorVideoService } from './instructor-video-service'

// Course Services  
export { studentCourseService } from './student-course-service'
export { instructorCourseService } from './instructor-course-service'

// Re-export types that services use
export type { 
  ServiceResult,
  StudentVideoData,
  InstructorVideoData,
  StudentActivity,
  Reflection,
  VideoProgress,
  VideoMetrics,
  Course,
  CourseProgress
} from '@/types/domain'