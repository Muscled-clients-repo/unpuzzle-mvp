export interface GuestSimilarMember {
  name: string
  progress: number
  days: number
  goal?: string
  rank?: number
}

export interface GuestRecentActivity {
  id: number
  user: string
  action: string
  time: string
  type: 'course' | 'goal' | 'resource' | 'member'
}

export const guestSimilarMembers: GuestSimilarMember[] = [
  { name: 's*****h', progress: 82, days: 45 },
  { name: 'a***x', progress: 65, days: 60 },
  { name: 'l***a', progress: 58, days: 72 }
]

export const guestRecentlyCompletedMembers: GuestSimilarMember[] = [
  { name: 'm***e', goal: '$3K', days: 85, rank: 2 },
  { name: 'j****y', goal: '$2K', days: 120, rank: 7 },
  { name: 't***m', goal: '$3K', days: 95, rank: 4 }
]

export const guestRecentActivities: GuestRecentActivity[] = [
  {
    id: 1,
    user: 'm****r',
    action: 'completed "Building Development Skills"',
    time: '2 mins ago',
    type: 'course'
  },
  {
    id: 2,
    user: 'm****r',
    action: 'reached milestone',
    time: '5 mins ago',
    type: 'goal'
  },
  {
    id: 3,
    user: 'm****r',
    action: 'shared a new resource: "Development Guide"',
    time: '12 mins ago',
    type: 'resource'
  },
  {
    id: 4,
    user: 'm****r',
    action: 'joined the Development Agency track',
    time: '18 mins ago',
    type: 'member'
  },
  {
    id: 5,
    user: 'm****r',
    action: 'completed reflection for Week 3',
    time: '25 mins ago',
    type: 'course'
  }
]