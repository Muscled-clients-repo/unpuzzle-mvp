import { mockUsers } from '@/data/mock'
import { BaseRepository } from './base-repository'
import type { User, UserPreferences, UserProfile, UserLearningPath, UserAchievement } from '@/types/domain'

export interface UserRepositoryInterface {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>
  updateProfile(userId: string, profile: Partial<UserProfile>): Promise<void>
  findLearningPaths(userId: string): Promise<UserLearningPath[]>
  createLearningPath(userId: string, path: Omit<UserLearningPath, 'id' | 'userId' | 'createdAt'>): Promise<UserLearningPath>
  findAchievements(userId: string): Promise<UserAchievement[]>
  updateActivity(userId: string, activity: { videoId?: string, courseId?: string, duration: number }): Promise<void>
}

export class UserRepository extends BaseRepository implements UserRepositoryInterface {
  private users: Map<string, User> = new Map()
  private userPaths: Map<string, UserLearningPath[]> = new Map()
  private userAchievements: Map<string, UserAchievement[]> = new Map()

  constructor() {
    super({
      cacheEnabled: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes for user data
      maxCacheSize: 200
    })
    
    // Initialize with mock data
    this.initializeMockData()
  }

  private initializeMockData(): void {
    // Initialize mock users
    mockUsers.learners.forEach(learner => {
      const user: User = {
        id: learner.id,
        email: learner.email,
        name: learner.name,
        avatar: learner.avatar,
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
          totalWatchTime: Math.floor(Math.random() * 50000), // Random watch time
          coursesCompleted: Math.floor(Math.random() * 10),
          certificatesEarned: Math.floor(Math.random() * 5)
        },
        subscription: {
          plan: 'premium',
          status: 'active',
          startDate: new Date('2024-01-01'),
          features: ['HD Video', 'Offline Downloads', 'AI Tutor', 'Certificates'],
          usage: {
            videosWatched: Math.floor(Math.random() * 100),
            aiInteractions: Math.floor(Math.random() * 500),
            storageUsed: Math.random() * 5 // GB
          }
        }
      }
      this.users.set(user.id, user)
    })

    // Initialize mock instructors
    mockUsers.instructors.forEach(instructor => {
      const user: User = {
        id: instructor.id,
        email: `${instructor.name.toLowerCase().replace(' ', '.')}@unpuzzle.com`,
        name: instructor.name,
        avatar: instructor.avatar,
        role: 'instructor',
        preferences: {
          language: 'en',
          timezone: 'America/New_York', 
          videoQuality: '1080p',
          playbackSpeed: 1.0,
          autoplay: false,
          captions: false,
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        },
        profile: {
          bio: instructor.bio,
          interests: instructor.expertise || [],
          skillLevel: 'advanced',
          goals: ['Teach effectively', 'Create quality content'],
          joinedAt: new Date('2023-01-01'),
          lastActiveAt: new Date(),
          totalWatchTime: 0, // Instructors don't watch, they create
          coursesCompleted: 0,
          certificatesEarned: 0
        },
        subscription: {
          plan: 'enterprise',
          status: 'active',
          startDate: new Date('2023-01-01'),
          features: ['All Premium Features', 'Analytics Dashboard', 'Course Creation Tools'],
          usage: {
            videosWatched: 0,
            aiInteractions: 0,
            storageUsed: Math.random() * 20 // Instructors use more storage
          }
        }
      }
      this.users.set(user.id, user)
    })
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('user', id)
    
    const cached = this.getFromCache<User>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(150)

    const user = this.users.get(id)
    if (!user) {
      return null
    }

    const transformedUser = this.transformUserData(user)
    
    if (this.validateUserData(transformedUser)) {
      this.setCache(cacheKey, transformedUser)
      return transformedUser
    }

    return null
  }

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('user', 'email', email)
    
    const cached = this.getFromCache<User>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(180)

    const user = Array.from(this.users.values()).find(u => u.email === email)
    if (!user) {
      return null
    }

    const transformedUser = this.transformUserData(user)
    
    this.setCache(cacheKey, transformedUser)
    return transformedUser
  }

  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    await this.delay(200)

    const user = this.users.get(userId)
    if (user) {
      user.preferences = { ...user.preferences, ...preferences }
      this.users.set(userId, user)
      
      // Invalidate cache for this user
      this.invalidateCache(userId)
    }
  }

  async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    await this.delay(180)

    const user = this.users.get(userId)
    if (user) {
      user.profile = { ...user.profile, ...profile, lastActiveAt: new Date() }
      this.users.set(userId, user)
      
      // Invalidate cache
      this.invalidateCache(userId)
    }
  }

  async findLearningPaths(userId: string): Promise<UserLearningPath[]> {
    const cacheKey = this.getCacheKey('learning_paths', userId)
    
    const cached = this.getFromCache<UserLearningPath[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(250)

    let paths = this.userPaths.get(userId)
    
    if (!paths) {
      // Generate default learning paths
      paths = [
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
          estimatedDuration: 120,
          difficulty: 'intermediate',
          createdAt: new Date('2024-01-01')
        }
      ]
      this.userPaths.set(userId, paths)
    }

    this.setCache(cacheKey, paths, 30 * 60 * 1000) // 30 minutes for learning paths
    return paths
  }

  async createLearningPath(userId: string, path: Omit<UserLearningPath, 'id' | 'userId' | 'createdAt'>): Promise<UserLearningPath> {
    await this.delay(300)

    const newPath: UserLearningPath = {
      ...path,
      id: this.generateId(),
      userId,
      createdAt: new Date()
    }

    const existingPaths = this.userPaths.get(userId) || []
    existingPaths.push(newPath)
    this.userPaths.set(userId, existingPaths)

    // Invalidate learning paths cache
    this.invalidateCache(`learning_paths:${userId}`)

    return newPath
  }

  async findAchievements(userId: string): Promise<UserAchievement[]> {
    const cacheKey = this.getCacheKey('achievements', userId)
    
    const cached = this.getFromCache<UserAchievement[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(200)

    let achievements = this.userAchievements.get(userId)
    
    if (!achievements) {
      // Generate achievements based on user profile
      const user = this.users.get(userId)
      achievements = this.generateUserAchievements(user)
      this.userAchievements.set(userId, achievements)
    }

    this.setCache(cacheKey, achievements, 60 * 60 * 1000) // 1 hour for achievements
    return achievements
  }

  async updateActivity(userId: string, activity: { videoId?: string, courseId?: string, duration: number }): Promise<void> {
    await this.delay(100)

    const user = this.users.get(userId)
    if (user) {
      user.profile.totalWatchTime += activity.duration
      user.profile.lastActiveAt = new Date()
      user.subscription.usage.videosWatched += 1
      
      this.users.set(userId, user)
      
      // Check for new achievements
      await this.checkAndUpdateAchievements(userId, user)
      
      // Invalidate relevant caches
      this.invalidateCache(userId)
      this.invalidateCache(`achievements:${userId}`)
    }
  }

  // Helper methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private generateUserAchievements(user?: User): UserAchievement[] {
    if (!user) return []

    const achievements: UserAchievement[] = []

    // Course completion achievements
    if (user.profile.coursesCompleted >= 1) {
      achievements.push({
        id: this.generateId(),
        title: 'First Course Complete',
        description: 'Completed your first course',
        icon: '🎓',
        type: 'course_completion',
        criteria: { coursesCompleted: 1 },
        earnedAt: new Date()
      })
    }

    // Watch time achievements
    if (user.profile.totalWatchTime >= 18000) { // 5 hours
      achievements.push({
        id: this.generateId(),
        title: 'Night Owl',
        description: 'Watched 5 hours of content',
        icon: '🦉',
        type: 'watch_time',
        criteria: { watchTime: 18000 },
        earnedAt: new Date()
      })
    }

    // AI interaction achievements
    if (user.subscription.usage.aiInteractions >= 50) {
      achievements.push({
        id: this.generateId(),
        title: 'AI Enthusiast',
        description: 'Used AI tutor 50 times',
        icon: '🤖',
        type: 'engagement',
        criteria: { aiInteractions: 50 },
        earnedAt: new Date()
      })
    }

    // Progress towards next achievement
    if (user.subscription.usage.aiInteractions < 50) {
      achievements.push({
        id: this.generateId(),
        title: 'AI Enthusiast',
        description: 'Use AI tutor 50 times',
        icon: '🤖',
        type: 'engagement',
        criteria: { aiInteractions: 50 },
        progress: user.subscription.usage.aiInteractions
      })
    }

    return achievements
  }

  private async checkAndUpdateAchievements(userId: string, user: User): Promise<void> {
    // This would check if user has earned new achievements based on updated activity
    const currentAchievements = this.userAchievements.get(userId) || []
    const newAchievements = this.generateUserAchievements(user)
    
    // Update achievements if there are new ones
    if (newAchievements.length > currentAchievements.length) {
      this.userAchievements.set(userId, newAchievements)
    }
  }

  // Data transformation methods
  private transformUserData = (user: User): User => {
    return {
      ...user,
      profile: {
        ...user.profile,
        totalWatchTime: Math.max(0, user.profile.totalWatchTime),
        coursesCompleted: Math.max(0, user.profile.coursesCompleted),
        certificatesEarned: Math.max(0, user.profile.certificatesEarned)
      }
    }
  }

  // Data validation methods
  private validateUserData = (user: User): boolean => {
    return !!(
      user.id &&
      user.email &&
      user.name &&
      user.role &&
      user.preferences &&
      user.profile &&
      user.subscription
    )
  }

  // Cache invalidation methods
  public invalidateUserCache(userId: string): void {
    this.invalidateCache(userId)
  }

  public invalidateAllUserCaches(): void {
    this.invalidateCache('user')
  }
}

// Export singleton instance
export const userRepository = new UserRepository()