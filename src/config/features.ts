// src/config/features.ts
import React from 'react'
import { UserRole } from '@/types/domain'

export interface FeatureFlags {
  // Student-specific features
  aiChat: boolean
  reflections: boolean
  quizzes: boolean
  videoSegments: boolean
  aiHints: boolean
  
  // Instructor-specific features
  analytics: boolean
  studentResponses: boolean
  engagementDashboard: boolean
  confusionTracking: boolean
  
  // Shared features with role differences
  comments: boolean
  videoDownload: boolean
  communityAccess: boolean
  
  // System features
  betaFeatures: boolean
  debugMode: boolean
}

/**
 * Get feature flags based on user role and environment variables
 */
export function getFeatureFlags(role: UserRole): FeatureFlags {
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Base flags that apply to all roles
  const baseFlags: Partial<FeatureFlags> = {
    comments: process.env.NEXT_PUBLIC_ENABLE_COMMENTS !== 'false',
    communityAccess: process.env.NEXT_PUBLIC_ENABLE_COMMUNITY !== 'false',
    betaFeatures: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true',
    debugMode: !isProduction && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  }
  
  switch (role) {
    case 'student':
      return {
        ...baseFlags,
        // Student AI features
        aiChat: process.env.NEXT_PUBLIC_ENABLE_STUDENT_AI_CHAT !== 'false',
        reflections: process.env.NEXT_PUBLIC_ENABLE_STUDENT_REFLECTIONS !== 'false',
        quizzes: process.env.NEXT_PUBLIC_ENABLE_STUDENT_QUIZZES !== 'false',
        videoSegments: process.env.NEXT_PUBLIC_ENABLE_VIDEO_SEGMENTS !== 'false',
        aiHints: process.env.NEXT_PUBLIC_ENABLE_AI_HINTS !== 'false',
        
        // Student cannot access instructor features
        analytics: false,
        studentResponses: false,
        engagementDashboard: false,
        confusionTracking: false,
        
        // Student-specific shared features
        videoDownload: false, // Students don't download
      } as FeatureFlags
    
    case 'instructor':
      return {
        ...baseFlags,
        // Instructors don't use AI features (they see student activity instead)
        aiChat: false,
        reflections: false,
        quizzes: false,
        videoSegments: false,
        aiHints: false,
        
        // Instructor-specific features
        analytics: process.env.NEXT_PUBLIC_ENABLE_INSTRUCTOR_ANALYTICS !== 'false',
        studentResponses: process.env.NEXT_PUBLIC_ENABLE_INSTRUCTOR_RESPONSES !== 'false',
        engagementDashboard: process.env.NEXT_PUBLIC_ENABLE_ENGAGEMENT_DASHBOARD !== 'false',
        confusionTracking: process.env.NEXT_PUBLIC_ENABLE_CONFUSION_TRACKING !== 'false',
        
        // Instructor-specific shared features
        videoDownload: process.env.NEXT_PUBLIC_ENABLE_VIDEO_DOWNLOAD === 'true',
      } as FeatureFlags
    
    case 'moderator':
      return {
        ...baseFlags,
        // Moderators have limited feature access
        aiChat: false,
        reflections: false,
        quizzes: false,
        videoSegments: false,
        aiHints: false,
        
        // Limited instructor features for moderation
        analytics: process.env.NEXT_PUBLIC_ENABLE_MODERATOR_ANALYTICS === 'true',
        studentResponses: true, // Moderators respond to student questions
        engagementDashboard: false,
        confusionTracking: true, // Moderators help with confusion
        
        videoDownload: false,
      } as FeatureFlags
    
    case 'admin':
      return {
        ...baseFlags,
        // Admins have access to all features for testing
        aiChat: true,
        reflections: true,
        quizzes: true,
        videoSegments: true,
        aiHints: true,
        analytics: true,
        studentResponses: true,
        engagementDashboard: true,
        confusionTracking: true,
        videoDownload: true,
      } as FeatureFlags
    
    default:
      // Public/unauthenticated users get minimal access
      return {
        ...baseFlags,
        aiChat: false,
        reflections: false,
        quizzes: false,
        videoSegments: false,
        aiHints: false,
        analytics: false,
        studentResponses: false,
        engagementDashboard: false,
        confusionTracking: false,
        videoDownload: false,
      } as FeatureFlags
  }
}

/**
 * Hook for accessing feature flags in components
 */
export function useFeatureFlags(role: UserRole) {
  return getFeatureFlags(role)
}

/**
 * Component wrapper for feature flag conditional rendering
 */
interface FeatureGateProps {
  role: UserRole
  feature: keyof FeatureFlags
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ role, feature, children, fallback = null }: FeatureGateProps) {
  const flags = getFeatureFlags(role)
  
  if (flags[feature]) {
    return React.createElement(React.Fragment, null, children)
  }
  
  return React.createElement(React.Fragment, null, fallback)
}

/**
 * Higher-order component for feature flag protection
 */
export function withFeatureFlag<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  feature: keyof FeatureFlags
) {
  return function FeatureFlaggedComponent(props: T & { userRole: UserRole }) {
    const { userRole, ...componentProps } = props
    const flags = getFeatureFlags(userRole)
    
    if (!flags[feature]) {
      return null
    }
    
    return React.createElement(WrappedComponent, componentProps as T)
  }
}

/**
 * Utility for checking features in non-component code
 */
export function hasFeature(role: UserRole, feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags(role)
  return flags[feature]
}

/**
 * Development helper to log all feature flags for a role
 */
export function debugFeatureFlags(role: UserRole) {
  if (process.env.NODE_ENV === 'development') {
    const flags = getFeatureFlags(role)
    console.group(`🏁 Feature Flags for ${role}`)
    Object.entries(flags).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value}`)
    })
    console.groupEnd()
  }
}