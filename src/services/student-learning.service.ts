// src/services/student-learning.service.ts
// Step 4: Student Learning Service - Backend Connection
// This service queries the real database tables created in migrations 005-007

// Removed client import - now uses server actions
import type { ServiceResult } from '@/types/domain'

// ============================================================
// TYPES FOR DATABASE RESPONSE
// ============================================================

// ============================================================
// SERVICE CLASS
// ============================================================
export class StudentLearningService {
  // No longer needs direct Supabase client - uses server actions



  /**
   * Update video progress and trigger calculations
   */
  async updateVideoProgress(
    userId: string,
    courseId: string,
    videoId: string,
    progressPercent: number,
    positionSeconds: number
  ): Promise<ServiceResult<void>> {
    try {
      // Use server action instead of direct client query
      const { updateVideoProgress } = await import('@/app/actions/student-learning-actions')
      const success = await updateVideoProgress(videoId, positionSeconds, positionSeconds * 100 / progressPercent)
      
      if (!success) {
        return { error: 'Failed to update progress' }
      }

      return { data: undefined }
    } catch (error) {
      console.error('Progress update error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to update progress' }
    }
  }

}

// Export singleton instance
export const studentLearningService = new StudentLearningService()