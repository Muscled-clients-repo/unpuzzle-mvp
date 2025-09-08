/**
 * WebSocket Operations Utility
 * 
 * Architecture Compliance:
 * - Operation ID generation and tracking
 * - Multi-operation coordination for complex save scenarios
 * - Success toast timing coordination
 */

export interface OperationMetadata {
  operationId: string
  type: 'single' | 'multi'
  expectedEvents: string[]
  createdAt: number
  courseId: string
}

// Generate unique operation ID
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate course-specific operation ID
export function generateCourseOperationId(courseId: string): string {
  return `course_${courseId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Operation type mapping for different scenarios
export const OperationTypes = {
  // Single operations
  CHAPTER_UPDATE: 'chapter-update-complete',
  VIDEO_UPDATE: 'video-update-complete', 
  CHAPTER_CREATE: 'chapter-create-complete',
  CHAPTER_DELETE: 'chapter-delete-complete',
  VIDEO_DELETE: 'video-delete-complete',
  UPLOAD_COMPLETE: 'upload-complete',
  
  // Batch operations
  VIDEO_BATCH_UPDATE: 'video-batch-update-complete',
  CHAPTER_BATCH_UPDATE: 'chapter-batch-update-complete',
} as const

// Determine expected events for complex operations
export function getExpectedEventsForOperations(operations: {
  videoUpdates?: number
  chapterUpdates?: number  
  chapterCreations?: number
  chapterDeletions?: number
  videoDeletions?: number
  uploads?: number
}): string[] {
  const events: string[] = []
  
  if (operations.videoUpdates) {
    events.push(OperationTypes.VIDEO_BATCH_UPDATE)
  }
  
  if (operations.chapterUpdates) {
    // For multiple chapter updates, we expect one event per chapter
    for (let i = 0; i < operations.chapterUpdates; i++) {
      events.push(OperationTypes.CHAPTER_UPDATE)
    }
  }
  
  if (operations.chapterCreations) {
    for (let i = 0; i < operations.chapterCreations; i++) {
      events.push(OperationTypes.CHAPTER_CREATE)
    }
  }
  
  if (operations.chapterDeletions) {
    for (let i = 0; i < operations.chapterDeletions; i++) {
      events.push(OperationTypes.CHAPTER_DELETE)
    }
  }
  
  if (operations.videoDeletions) {
    for (let i = 0; i < operations.videoDeletions; i++) {
      events.push(OperationTypes.VIDEO_DELETE)
    }
  }
  
  if (operations.uploads) {
    for (let i = 0; i < operations.uploads; i++) {
      events.push(OperationTypes.UPLOAD_COMPLETE)
    }
  }
  
  return events
}

// Create operation metadata for tracking
export function createOperationMetadata(
  courseId: string,
  operations: Parameters<typeof getExpectedEventsForOperations>[0]
): OperationMetadata {
  const operationId = generateCourseOperationId(courseId)
  const expectedEvents = getExpectedEventsForOperations(operations)
  
  return {
    operationId,
    type: expectedEvents.length > 1 ? 'multi' : 'single',
    expectedEvents,
    createdAt: Date.now(),
    courseId
  }
}

// Debug utilities
export function logOperationStart(metadata: OperationMetadata): void {
  console.log(`🚀 Starting ${metadata.type} operation:`, {
    operationId: metadata.operationId,
    courseId: metadata.courseId,
    expectedEvents: metadata.expectedEvents,
    eventCount: metadata.expectedEvents.length
  })
}

export function logOperationComplete(operationId: string, duration: number): void {
  console.log(`✅ Operation completed:`, {
    operationId,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  })
}

// Validation utilities
export function validateOperationId(operationId: string): boolean {
  return /^(op_|course_)[\w_]+$/.test(operationId)
}

export function isOperationExpired(metadata: OperationMetadata, maxAgeMs = 30000): boolean {
  return Date.now() - metadata.createdAt > maxAgeMs
}