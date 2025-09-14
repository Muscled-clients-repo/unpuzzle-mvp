import { PlaygroundCommunity } from '../types'

export const mockStudents: PlaygroundCommunity.Student[] = [
  {
    id: '1',
    displayName: 'Alex M.',
    earningsRange: '$25k-$50k',
    goalType: 'shopify',
    achievements: ['First $1k', 'First $5k', 'First $10k', 'First $25k'],
    joinDate: '2025-06-15',
    learnRate: 48,
    isPublic: true
  },
  {
    id: '2',
    displayName: 'Sarah L.',
    earningsRange: '$10k-$25k',
    goalType: 'ai',
    achievements: ['First $1k', 'First $5k', 'First $10k'],
    joinDate: '2025-07-02',
    learnRate: 52,
    isPublic: true
  },
  {
    id: '3',
    displayName: 'Student X',
    earningsRange: '$50k+',
    goalType: 'shopify',
    achievements: ['First $1k', 'First $5k', 'First $10k', 'First $25k', 'First $50k'],
    joinDate: '2025-05-10',
    learnRate: 35,
    isPublic: true
  },
  {
    id: '4',
    displayName: 'David K.',
    earningsRange: '$5k-$10k',
    goalType: 'saas',
    achievements: ['First $1k', 'First $5k'],
    joinDate: '2025-08-01',
    learnRate: 61,
    isPublic: true
  },
  {
    id: '5',
    displayName: 'Maria R.',
    earningsRange: '$10k-$25k',
    goalType: 'ai',
    achievements: ['First $1k', 'First $5k', 'First $10k'],
    joinDate: '2025-06-20',
    learnRate: 44,
    isPublic: true
  }
]

export const mockLeaderboard: PlaygroundCommunity.LeaderboardEntry[] = [
  {
    rank: 1,
    student: mockStudents[2], // Member X
    earnings: '$50k+',
    timeframe: 'lifetime',
    change: 0
  },
  {
    rank: 2,
    student: mockStudents[0], // Alex M.
    earnings: '$25k-$50k',
    timeframe: 'lifetime', 
    change: 1
  },
  {
    rank: 3,
    student: mockStudents[1], // Sarah L.
    earnings: '$10k-$25k',
    timeframe: 'lifetime',
    change: -1
  },
  {
    rank: 4,
    student: mockStudents[4], // Maria R.
    earnings: '$10k-$25k',
    timeframe: 'lifetime',
    change: 2
  },
  {
    rank: 5,
    student: mockStudents[3], // David K.
    earnings: '$5k-$10k',
    timeframe: 'lifetime',
    change: -1
  }
]

export const mockLearnRateLeaderboard: PlaygroundCommunity.LeaderboardEntry[] = [
  {
    rank: 1,
    student: mockStudents[3], // David K.
    earnings: '$5k-$10k',
    timeframe: 'week',
    change: 3
  },
  {
    rank: 2,
    student: mockStudents[1], // Sarah L.
    earnings: '$10k-$25k', 
    timeframe: 'week',
    change: 0
  },
  {
    rank: 3,
    student: mockStudents[0], // Alex M.
    earnings: '$25k-$50k',
    timeframe: 'week',
    change: -1
  },
  {
    rank: 4,
    student: mockStudents[4], // Maria R.
    earnings: '$10k-$25k',
    timeframe: 'week',
    change: 1
  },
  {
    rank: 5,
    student: mockStudents[2], // Member X
    earnings: '$50k+',
    timeframe: 'week',
    change: -3
  }
]