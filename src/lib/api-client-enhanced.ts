// src/lib/api-client-enhanced.ts
// Step 5: Enhanced API Client with Database Toggle
// Allows gradual migration from mock to database data

import { apiClient as baseApiClient } from './api-client'

// Feature flags for gradual migration
export const DATABASE_FEATURES = {
  USE_DB_FOR_ENROLLMENTS: false,  // Set to true to use database
  USE_DB_FOR_PROGRESS: false,     // Set to true to use database
  USE_DB_FOR_ANALYTICS: false,    // Set to true to use database
  USE_DB_FOR_AI: false,           // Set to true to use database
} as const

// Override the useMockData flag based on feature flags
export const shouldUseMockData = (feature: keyof typeof DATABASE_FEATURES): boolean => {
  // If any database feature is enabled, check specific feature
  if (Object.values(DATABASE_FEATURES).some(v => v)) {
    return !DATABASE_FEATURES[feature]
  }
  
  // Otherwise use global mock data setting
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
}

// Enhanced API client that can gradually switch to database
export const apiClientEnhanced = {
  ...baseApiClient,
  
  // Override for student courses to use database when ready
  async getStudentCourses(userId: string) {
    if (shouldUseMockData('USE_DB_FOR_ENROLLMENTS')) {
      // Use mock data
      return baseApiClient.get(`/api/student/courses`)
    }
    
    // Use database through new service
    const { studentLearningService } = await import('@/services/student-learning.service')
    const result = await studentLearningService.getStudentCoursesWithAnalytics(userId)
    
    if (result.error) {
      return { error: result.error, data: null }
    }
    
    // Transform to API response format
    return { 
      data: result.data?.map(enrollment => ({
        ...enrollment.course,
        progress: enrollment.progress,
        lastAccessed: enrollment.lastAccessed,
        currentLesson: enrollment.currentLesson,
        aiInteractionsUsed: enrollment.aiInteractionsUsed,
        strugglingTopics: enrollment.strugglingTopics,
        nextMilestone: enrollment.nextMilestone
      }))
    }
  }
}

// Gradual migration helper
export const migrateToDatabase = async (feature: keyof typeof DATABASE_FEATURES) => {
  console.log(`🔄 Migrating ${feature} to database...`)
  
  // Enable the feature
  DATABASE_FEATURES[feature] = true
  
  // Clear any cached data
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('unpuzzle-cache')
  }
  
  console.log(`✅ ${feature} now using database`)
}