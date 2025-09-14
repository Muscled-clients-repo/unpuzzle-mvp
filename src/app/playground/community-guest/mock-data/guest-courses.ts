export interface GuestCourse {
  id: string
  title: string
  description: string
  duration: string
  videos: number
  progress: number
  completed: boolean
  completedDate?: string
  goalTrack: 'agency' | 'saas'
  goalLevel: string
  instructor: string
  thumbnail?: string
  category: 'sales' | 'service-delivery' | 'marketing'
  order: number
  actions: string[]
  isLocked: boolean
}

export interface GuestCoursesByGoal {
  goalTitle: string
  goalLevel: string
  status: 'completed' | 'current' | 'upcoming'
  courses: GuestCourse[]
}

export const guestCoursesByGoal: GuestCoursesByGoal[] = [
  {
    goalTitle: 'Goal: $5K Shopify Agency',
    goalLevel: '$5K',
    status: 'current',
    courses: [
      {
        id: '7',
        title: 'Advanced Shopify Development',
        description: 'Master complex Shopify customizations and advanced features for high-value clients',
        duration: '4h 30m',
        videos: 12,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$5K',
        instructor: 'Mahtab Alam',
        category: 'service-delivery',
        order: 1,
        actions: ['Watch videos', 'Complete quizzes', 'Build portfolio project', 'Submit reflection', 'Practice with real client'],
        isLocked: true
      },
      {
        id: '8',
        title: 'Agency Scaling Systems',
        description: 'Build systems and processes to scale your agency to $5K+ monthly revenue',
        duration: '3h 15m',
        videos: 10,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$5K',
        instructor: 'Mahtab Alam',
        category: 'service-delivery',
        order: 2,
        actions: ['Learn scaling frameworks', 'Create SOPs', 'Set up team structure', 'Build client pipeline', 'Track metrics'],
        isLocked: true
      },
      {
        id: '9',
        title: 'Team Building & Management',
        description: 'Hire and manage remote developers to handle increased workload',
        duration: '2h 45m',
        videos: 8,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$5K',
        instructor: 'Mahtab Alam',
        category: 'service-delivery',
        order: 3,
        actions: ['Hire remote developers', 'Create job descriptions', 'Interview candidates', 'Onboard team members', 'Manage projects'],
        isLocked: true
      }
    ]
  },
  {
    goalTitle: 'Goal: $3K Shopify Agency',
    goalLevel: '$3K',
    status: 'completed',
    courses: [
      {
        id: '4',
        title: 'Client Acquisition Mastery',
        description: 'Learn proven strategies to find and close your first clients consistently',
        duration: '3h 45m',
        videos: 11,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$3K',
        instructor: 'Mahtab Alam',
        category: 'sales',
        order: 1,
        actions: ['Create sales funnel', 'Write proposals', 'Practice cold outreach', 'Track conversion rates', 'Follow up with leads'],
        isLocked: true
      },
      {
        id: '5',
        title: 'Shopify Store Optimization',
        description: 'Master conversion optimization and performance improvements for client stores',
        duration: '4h 20m',
        videos: 13,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$3K',
        instructor: 'Mahtab Alam',
        category: 'service-delivery',
        order: 2,
        actions: ['Analyze store performance', 'Optimize conversion rates', 'Improve page speed', 'A/B test elements', 'Report improvements'],
        isLocked: true
      }
    ]
  },
  {
    goalTitle: 'Goal: $1K Shopify Agency',
    goalLevel: '$1K',
    status: 'completed',
    courses: [
      {
        id: '1',
        title: 'Claude Code Fundamentals',
        description: 'Master the basics of AI-assisted development with Claude Code',
        duration: '2h 30m',
        videos: 8,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$1K',
        instructor: 'Mahtab Alam',
        category: 'service-delivery',
        order: 1,
        actions: ['Watch fundamentals', 'Practice with examples', 'Complete exercises', 'Build first project'],
        isLocked: true
      },
      {
        id: '2',
        title: 'First Client Success',
        description: 'Everything you need to successfully deliver your first paid project',
        duration: '3h 15m',
        videos: 10,
        progress: 0,
        completed: false,
        goalTrack: 'agency',
        goalLevel: '$1K',
        instructor: 'Mahtab Alam',
        category: 'sales',
        order: 2,
        actions: ['Find first client', 'Create proposal', 'Deliver project', 'Get testimonial', 'Ask for referral'],
        isLocked: true
      }
    ]
  }
]