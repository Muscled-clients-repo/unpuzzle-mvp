export interface GuestGoalDigger {
  id: string
  name: string
  currentGoal: string
  targetAmount: string
  progress: number
  learnRate: number // mins/hr
  executionRate: number // percentage
  ranking: number
  daysActive: number
  completedGoals: number
  totalActions: number
  amountEarned: number // in dollars
  badge?: 'top-performer' | 'consistent' | 'fast-learner' | 'goal-crusher'
}

export const guestGoalDiggers: GuestGoalDigger[] = [
  {
    id: '1',
    name: 's*****h',
    currentGoal: 'Goal: $5K Shopify Agency',
    targetAmount: '$5K',
    progress: 87,
    learnRate: 45,
    executionRate: 96,
    ranking: 1,
    daysActive: 67,
    completedGoals: 2,
    totalActions: 134,
    amountEarned: 4350,
    badge: 'top-performer'
  },
  {
    id: '2',
    name: 'j****n',
    currentGoal: 'Goal: $5K Shopify Agency',
    targetAmount: '$5K',
    progress: 75,
    learnRate: 42,
    executionRate: 94,
    ranking: 2,
    daysActive: 90,
    completedGoals: 3,
    totalActions: 167,
    amountEarned: 3750,
    badge: 'goal-crusher'
  },
  {
    id: '3',
    name: 'm***e',
    currentGoal: 'Goal: $3K Shopify Agency',
    targetAmount: '$3K',
    progress: 92,
    learnRate: 38,
    executionRate: 91,
    ranking: 3,
    daysActive: 45,
    completedGoals: 1,
    totalActions: 89,
    amountEarned: 2760,
    badge: 'fast-learner'
  },
  {
    id: '4',
    name: 'l***a',
    currentGoal: 'Goal: $10K SaaS MVP',
    targetAmount: '$10K',
    progress: 68,
    learnRate: 41,
    executionRate: 89,
    ranking: 4,
    daysActive: 123,
    completedGoals: 4,
    totalActions: 201,
    amountEarned: 6800,
    badge: 'consistent'
  },
  {
    id: '5',
    name: 'a***x',
    currentGoal: 'Goal: $2K Shopify Agency',
    targetAmount: '$2K',
    progress: 83,
    learnRate: 35,
    executionRate: 87,
    ranking: 5,
    daysActive: 78,
    completedGoals: 1,
    totalActions: 98,
    amountEarned: 1660,
    badge: 'consistent'
  }
]