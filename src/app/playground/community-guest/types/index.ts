export namespace PlaygroundCommunity {
  export type GoalType = 'shopify' | 'ai' | 'saas' | 'learning'
  export type EarningsRange = '$0-$1k' | '$1k-$5k' | '$5k-$10k' | '$10k-$25k' | '$25k-$50k' | '$50k+'
  export type Timeframe = 'week' | 'month' | 'year' | 'lifetime'

  export interface Student {
    id: string
    displayName: string
    earningsRange: EarningsRange
    goalType: GoalType
    achievements: string[]
    joinDate: string
    learnRate: number // minutes per hour
    isPublic: boolean
  }

  export interface LeaderboardEntry {
    rank: number
    student: Student
    earnings: EarningsRange
    timeframe: Timeframe
    change: number // position change from previous period
  }

  export interface SuccessStory {
    id: string
    studentName: string // Anonymous like "Student X"
    achievement: string
    earnings?: string
    goalType: GoalType
    date: string
    story: string
  }

  export interface Discussion {
    id: string
    author: string // Anonymous or display name
    content: string
    goalType: GoalType
    replies: number
    likes: number
    date: string
  }

  export interface CommunityStats {
    totalStudents: number
    activeThisWeek: number
    totalEarnings: string
    avgLearnRate: number
    goalBreakdown: Record<GoalType, number>
  }
}