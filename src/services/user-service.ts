import { mockUsers } from '@/data/mock'
import { ServiceResult } from './types'

// User service types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin'
  preferences: UserPreferences
  profile: UserProfile
  subscription: UserSubscription
}

export interface UserPreferences {
  language: string
  timezone: string
  videoQuality: 'auto' | '480p' | '720p' | '1080p'
  playbackSpeed: number
  autoplay: boolean
  captions: boolean
  theme: 'light' | 'dark' | 'auto'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

export interface UserProfile {
  bio?: string
  interests: string[]
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  goals: string[]
  joinedAt: Date
  lastActiveAt: Date
  totalWatchTime: number
  coursesCompleted: number
  certificatesEarned: number
}

export interface UserSubscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise'
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  startDate: Date
  endDate?: Date
  features: string[]
  usage: {
    videosWatched: number
    aiInteractions: number
    storageUsed: number
  }
}

export interface UserLearningPath {
  id: string
  userId: string
  name: string
  description: string
  courses: Array<{
    courseId: string
    order: number
    status: 'not_started' | 'in_progress' | 'completed'
    startedAt?: Date
    completedAt?: Date
  }>
  estimatedDuration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  createdAt: Date
}

export interface UserAchievement {
  id: string
  title: string
  description: string
  icon: string
  type: 'course_completion' | 'watch_time' | 'engagement' | 'skill_mastery'
  criteria: any
  earnedAt?: Date
  progress?: number
}

// User service interface
export interface UserService {
  getCurrentUser(): Promise<ServiceResult<User>>
  getUserById(id: string): Promise<ServiceResult<User>>
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<ServiceResult<void>>
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<ServiceResult<void>>
  getUserLearningPaths(userId: string): Promise<ServiceResult<UserLearningPath[]>>
  createLearningPath(userId: string, path: Omit<UserLearningPath, 'id' | 'userId' | 'createdAt'>): Promise<ServiceResult<UserLearningPath>>
  getUserAchievements(userId: string): Promise<ServiceResult<UserAchievement[]>>
  updateUserActivity(userId: string, activity: { videoId?: string, courseId?: string, duration: number }): Promise<ServiceResult<void>>
}

// Mock implementation
class MockUserService implements UserService {
  private currentUser: User | null = null

  private delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private initializeCurrentUser(): User {
    if (!this.currentUser) {
      // Initialize with mock learner data
      const mockLearner = mockUsers.learners[0]
      this.currentUser = {
        id: mockLearner.id,
        email: mockLearner.email,
        name: mockLearner.name,
        avatar: mockLearner.avatar,
        role: 'student',
        preferences: {
          language: 'en',
          timezone: 'America/New_York',
          videoQuality: 'auto',
          playbackSpeed: 1.0,
          autoplay: false,
          captions: true,
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        },
        profile: {
          interests: ['Web Development', 'JavaScript', 'React'],
          skillLevel: 'intermediate',
          goals: ['Learn React', 'Build a portfolio', 'Get a job'],
          joinedAt: new Date('2024-01-01'),
          lastActiveAt: new Date(),
          totalWatchTime: 14400, // 4 hours in seconds
          coursesCompleted: 2,
          certificatesEarned: 1
        },
        subscription: {
          plan: 'premium',
          status: 'active',
          startDate: new Date('2024-01-01'),
          features: ['HD Video', 'Offline Downloads', 'AI Tutor', 'Certificates'],
          usage: {
            videosWatched: 25,
            aiInteractions: 150,
            storageUsed: 1.2 // GB
          }
        }
      }
    }
    return this.currentUser
  }

  async getCurrentUser(): Promise<ServiceResult<User>> {
    try {
      await this.delay(200)
      
      const user = this.initializeCurrentUser()
      return { data: user }
    } catch (error) {
      return { error: 'Failed to fetch current user' }
    }
  }

  async getUserById(id: string): Promise<ServiceResult<User>> {
    try {
      await this.delay(250)
      
      // Check if requesting current user
      if (id === this.initializeCurrentUser().id) {
        return { data: this.currentUser! }
      }
      
      // Mock other users
      const mockUser: User = {
        id,
        email: `user-${id}@example.com`,
        name: `User ${id}`,
        role: 'student',
        preferences: {
          language: 'en',
          timezone: 'UTC',
          videoQuality: 'auto',
          playbackSpeed: 1.0,
          autoplay: false,
          captions: false,
          theme: 'light',
          notifications: {
            email: true,
            push: false,
            sms: false
          }
        },
        profile: {
          interests: [],
          skillLevel: 'beginner',
          goals: [],
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          totalWatchTime: 0,
          coursesCompleted: 0,
          certificatesEarned: 0
        },
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          features: ['Basic Video Access'],
          usage: {
            videosWatched: 0,
            aiInteractions: 0,
            storageUsed: 0
          }
        }
      }
      
      return { data: mockUser }
    } catch (error) {
      return { error: 'Failed to fetch user' }
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<ServiceResult<void>> {
    try {
      await this.delay(300)
      
      const user = this.initializeCurrentUser()
      if (user.id === userId) {
        user.preferences = { ...user.preferences, ...preferences }
      }
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to update preferences' }
    }
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<ServiceResult<void>> {
    try {
      await this.delay(250)
      
      const user = this.initializeCurrentUser()
      if (user.id === userId) {
        user.profile = { ...user.profile, ...profile }
      }
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to update profile' }
    }
  }

  async getUserLearningPaths(userId: string): Promise<ServiceResult<UserLearningPath[]>> {
    try {
      await this.delay(400)
      
      const mockPaths: UserLearningPath[] = [
        {
          id: this.generateId(),
          userId,
          name: 'Full-Stack Web Development',
          description: 'Complete path from beginner to full-stack developer',
          courses: [
            { courseId: '1', order: 1, status: 'completed', startedAt: new Date('2024-01-01'), completedAt: new Date('2024-02-01') },
            { courseId: '2', order: 2, status: 'in_progress', startedAt: new Date('2024-02-01') },
            { courseId: '3', order: 3, status: 'not_started' }
          ],
          estimatedDuration: 120, // hours
          difficulty: 'intermediate',
          createdAt: new Date('2024-01-01')
        }
      ]
      
      return { data: mockPaths }
    } catch (error) {
      return { error: 'Failed to fetch learning paths' }
    }
  }

  async createLearningPath(userId: string, path: Omit<UserLearningPath, 'id' | 'userId' | 'createdAt'>): Promise<ServiceResult<UserLearningPath>> {
    try {
      await this.delay(500)
      
      const newPath: UserLearningPath = {
        ...path,
        id: this.generateId(),
        userId,
        createdAt: new Date()
      }
      
      return { data: newPath }
    } catch (error) {
      return { error: 'Failed to create learning path' }
    }
  }

  async getUserAchievements(userId: string): Promise<ServiceResult<UserAchievement[]>> {
    try {
      await this.delay(350)
      
      const mockAchievements: UserAchievement[] = [
        {
          id: this.generateId(),
          title: 'First Course Complete',
          description: 'Completed your first course',
          icon: '🎓',
          type: 'course_completion',
          criteria: { coursesCompleted: 1 },
          earnedAt: new Date('2024-02-01')
        },
        {
          id: this.generateId(),
          title: 'Night Owl',
          description: 'Watched 5 hours of content',
          icon: '🦉',
          type: 'watch_time',
          criteria: { watchTime: 18000 }, // 5 hours in seconds
          earnedAt: new Date('2024-02-15')
        },
        {
          id: this.generateId(),
          title: 'AI Enthusiast',
          description: 'Used AI tutor 50 times',
          icon: '🤖',
          type: 'engagement',
          criteria: { aiInteractions: 50 },
          progress: 30 // 30/50
        }
      ]
      
      return { data: mockAchievements }
    } catch (error) {
      return { error: 'Failed to fetch achievements' }
    }
  }

  async updateUserActivity(userId: string, activity: { videoId?: string, courseId?: string, duration: number }): Promise<ServiceResult<void>> {
    try {
      await this.delay(150)
      
      const user = this.initializeCurrentUser()
      if (user.id === userId) {
        user.profile.totalWatchTime += activity.duration
        user.profile.lastActiveAt = new Date()
        user.subscription.usage.videosWatched += 1
      }
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to update user activity' }
    }
  }
}

// Export singleton instance
export const userService: UserService = new MockUserService()