'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAppStore } from '@/stores/app-store'
import { mockUsers } from '@/data/mock/users'

interface StoreProviderProps {
  children: ReactNode
}

const StoreContext = createContext<typeof useAppStore | null>(null)

export const StoreProvider = ({ children }: StoreProviderProps) => {
  useEffect(() => {
    // Initialize store with mock data
    const initializeStore = async () => {
      const store = useAppStore.getState()
      
      // Set up mock user (first learner)
      const mockUser = mockUsers.learners[0]
      if (mockUser) {
        store.setUser({
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          avatar: mockUser.avatar,
          role: mockUser.role,
          subscription: mockUser.subscription,
        })

        // Initialize user preferences
        store.updatePreferences({
          theme: 'light',
          autoPlay: false,
          playbackRate: 1,
          volume: 1,
          sidebarWidth: 400,
        })

        // Set enrolled courses
        mockUser.enrolledCourses.forEach(courseId => {
          store.enrollInCourse(courseId)
        })
      }

      // Initialize courses from mock data
      try {
        const { mockCourses } = await import('@/data/mock/courses')
        store.setCourses(mockCourses)
      } catch (error) {
        console.error('Failed to load mock courses:', error)
      }

      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Store initialized with mock data')
        console.log('Current user:', store.profile)
        console.log('Enrolled courses:', store.enrolledCourses)
      }
    }

    initializeStore()
  }, [])

  return (
    <StoreContext.Provider value={useAppStore}>
      {children}
    </StoreContext.Provider>
  )
}

// Custom hook to use store context (optional - direct useAppStore works too)
export const useStoreContext = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider')
  }
  return context
}