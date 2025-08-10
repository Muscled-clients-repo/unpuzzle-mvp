import { StateCreator } from 'zustand'

export interface ModerationQueue {
  id: string
  type: 'confusion' | 'reflection'
  studentName: string
  studentId: string
  courseId: string
  courseName: string
  timestamp: string
  videoTime: string
  content: string
  priority: 'high' | 'medium' | 'low'
  assignedTo?: string
  status: 'pending' | 'in_review' | 'responded' | 'escalated'
  tags: string[]
}

export interface ModeratorResponse {
  id: string
  queueItemId: string
  moderatorId: string
  moderatorName: string
  response: string
  timestamp: string
  helpfulVotes: number
  endorsedByInstructor: boolean
}

export interface ModeratorLeaderboard {
  moderatorId: string
  moderatorName: string
  responsesThisWeek: number
  avgResponseTime: string
  helpfulVotes: number
  trustScore: number
  specializations: string[]
  rank: number
}

export interface ModeratorSlice {
  moderationQueue: ModerationQueue[]
  myAssignments: ModerationQueue[]
  moderatorResponses: ModeratorResponse[]
  leaderboard: ModeratorLeaderboard[]
  moderatorStats: {
    totalPending: number
    myPending: number
    avgResponseTime: string
    weeklyGoal: number
    weeklyProgress: number
  } | null

  // Actions
  loadModerationQueue: () => void
  claimAssignment: (itemId: string) => void
  submitResponse: (itemId: string, response: string) => void
  escalateToInstructor: (itemId: string, reason: string) => void
  voteHelpful: (responseId: string) => void
  endorseResponse: (responseId: string) => void
  promoteToModerator: (userId: string, specializations: string[]) => void
}

export const createModeratorSlice: StateCreator<ModeratorSlice> = (set, get) => ({
  moderationQueue: [],
  myAssignments: [],
  moderatorResponses: [],
  leaderboard: [],
  moderatorStats: null,

  loadModerationQueue: () => {
    // Initialize with mock data
    set({
      moderationQueue: [
        {
          id: '1',
          type: 'confusion',
          studentName: 'John Smith',
          studentId: 'student1',
          courseId: '1',
          courseName: 'React Masterclass',
          timestamp: '30 mins ago',
          videoTime: '15:45',
          content: "I don't understand why we need to use useEffect cleanup functions. When do they actually run?",
          priority: 'high',
          status: 'pending',
          tags: ['React', 'Hooks', 'useEffect']
        },
        {
          id: '2',
          type: 'reflection',
          studentName: 'Alice Chen',
          studentId: 'student2',
          courseId: '1',
          courseName: 'React Masterclass',
          timestamp: '1 hour ago',
          videoTime: '23:30',
          content: "I realized that custom hooks are just functions that use other hooks. They help us reuse stateful logic!",
          priority: 'medium',
          status: 'pending',
          tags: ['React', 'Custom Hooks']
        },
        {
          id: '3',
          type: 'confusion',
          studentName: 'Bob Wilson',
          studentId: 'student3',
          courseId: '2',
          courseName: 'Python for Data Science',
          timestamp: '2 hours ago',
          videoTime: '8:15',
          content: "What's the difference between loc and iloc in pandas?",
          priority: 'medium',
          status: 'in_review',
          assignedTo: 'moderator1',
          tags: ['Python', 'Pandas', 'Data Manipulation']
        },
        {
          id: '4',
          type: 'confusion',
          studentName: 'Emma Davis',
          studentId: 'student4',
          courseId: '1',
          courseName: 'React Masterclass',
          timestamp: '3 hours ago',
          videoTime: '45:00',
          content: "Why does my component re-render even when I'm using React.memo?",
          priority: 'high',
          status: 'pending',
          tags: ['React', 'Performance', 'React.memo']
        }
      ],
      myAssignments: [],
      moderatorResponses: [
        {
          id: 'resp1',
          queueItemId: '3',
          moderatorId: 'moderator1',
          moderatorName: 'Sarah Expert',
          response: "Great question! `loc` is label-based selection (uses index/column names), while `iloc` is integer position-based (uses numeric positions). Think of `loc` as 'locate by name' and `iloc` as 'locate by index number'.",
          timestamp: '1 hour ago',
          helpfulVotes: 12,
          endorsedByInstructor: true
        }
      ],
      leaderboard: [
        {
          moderatorId: 'mod1',
          moderatorName: 'Sarah Expert',
          responsesThisWeek: 47,
          avgResponseTime: '15 mins',
          helpfulVotes: 234,
          trustScore: 95,
          specializations: ['React', 'JavaScript', 'CSS'],
          rank: 1
        },
        {
          moderatorId: 'mod2',
          moderatorName: 'Mike Helper',
          responsesThisWeek: 38,
          avgResponseTime: '22 mins',
          helpfulVotes: 189,
          trustScore: 88,
          specializations: ['Python', 'Data Science'],
          rank: 2
        },
        {
          moderatorId: 'mod3',
          moderatorName: 'Alex Mentor',
          responsesThisWeek: 35,
          avgResponseTime: '18 mins',
          helpfulVotes: 167,
          trustScore: 85,
          specializations: ['React', 'Node.js'],
          rank: 3
        }
      ],
      moderatorStats: {
        totalPending: 24,
        myPending: 3,
        avgResponseTime: '18 mins',
        weeklyGoal: 50,
        weeklyProgress: 12
      }
    })
  },

  claimAssignment: (itemId: string) => {
    set(state => {
      const item = state.moderationQueue.find(q => q.id === itemId)
      if (!item) return state

      return {
        moderationQueue: state.moderationQueue.map(q =>
          q.id === itemId ? { ...q, status: 'in_review' as const, assignedTo: 'current_moderator' } : q
        ),
        myAssignments: [...state.myAssignments, { ...item, status: 'in_review' as const, assignedTo: 'current_moderator' }]
      }
    })
  },

  submitResponse: (itemId: string, response: string) => {
    set(state => ({
      moderationQueue: state.moderationQueue.map(q =>
        q.id === itemId ? { ...q, status: 'responded' as const } : q
      ),
      myAssignments: state.myAssignments.filter(a => a.id !== itemId),
      moderatorResponses: [
        ...state.moderatorResponses,
        {
          id: `resp${Date.now()}`,
          queueItemId: itemId,
          moderatorId: 'current_moderator',
          moderatorName: 'You',
          response,
          timestamp: 'Just now',
          helpfulVotes: 0,
          endorsedByInstructor: false
        }
      ]
    }))
  },

  escalateToInstructor: (itemId: string, reason: string) => {
    set(state => ({
      moderationQueue: state.moderationQueue.map(q =>
        q.id === itemId ? { ...q, status: 'escalated' as const, priority: 'high' as const } : q
      ),
      myAssignments: state.myAssignments.filter(a => a.id !== itemId)
    }))
  },

  voteHelpful: (responseId: string) => {
    set(state => ({
      moderatorResponses: state.moderatorResponses.map(r =>
        r.id === responseId ? { ...r, helpfulVotes: r.helpfulVotes + 1 } : r
      )
    }))
  },

  endorseResponse: (responseId: string) => {
    set(state => ({
      moderatorResponses: state.moderatorResponses.map(r =>
        r.id === responseId ? { ...r, endorsedByInstructor: true } : r
      )
    }))
  },

  promoteToModerator: (userId: string, specializations: string[]) => {
    // This would typically call an API to update user role
    console.log(`Promoting user ${userId} to moderator with specializations:`, specializations)
  }
})