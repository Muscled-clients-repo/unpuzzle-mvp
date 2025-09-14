export interface Post {
  id: string
  author: {
    name: string
    role: 'instructor' | 'member'
    avatar?: string
    goal: string
  }
  content: string
  timestamp: string
  isPinned: boolean
  likes: number
  replies: Reply[]
  isLiked: boolean
}

export interface Reply {
  id: string
  author: {
    name: string
    role: 'instructor' | 'member'
    goal: string
  }
  content: string
  timestamp: string
}

export const guestCommunityPosts: Post[] = [
  {
    id: '1',
    author: { name: 'Mahtab', role: 'instructor', goal: 'Goal: $500K Agency Empire' },
    content: '🎉 Welcome to our founding members! This week we\'re focusing on setting up your first Claude Code project. Don\'t forget to join tomorrow\'s live Q&A at 3 PM EST.',
    timestamp: '2 hours ago',
    isPinned: true,
    likes: 12,
    replies: [
      {
        id: '1-1',
        author: { name: 's*****h', role: 'member', goal: 'Goal: $5K Shopify Agency' },
        content: 'Thanks for the welcome! Excited to get started.',
        timestamp: '1 hour ago'
      }
    ],
    isLiked: false
  },
  {
    id: '2',
    author: { name: 'j****n', role: 'member', goal: 'Goal: $3K Shopify Agency' },
    content: 'Just hit my first milestone! 🎯 The Claude Code techniques are incredible - built my first Shopify app in just 3 days. Thanks to everyone for the support!',
    timestamp: '4 hours ago',
    isPinned: false,
    likes: 28,
    replies: [
      {
        id: '2-1',
        author: { name: 'l***a', role: 'member', goal: 'Goal: $10K SaaS MVP' },
        content: 'Congratulations! That\'s amazing progress.',
        timestamp: '3 hours ago'
      },
      {
        id: '2-2',
        author: { name: 'Mahtab', role: 'instructor', goal: 'Goal: $500K Agency Empire' },
        content: 'Outstanding work! You\'re ahead of schedule - keep it up! 🚀',
        timestamp: '3 hours ago'
      }
    ],
    isLiked: true
  },
  {
    id: '3',
    author: { name: 'l***a', role: 'member', goal: 'Goal: $10K SaaS MVP' },
    content: 'Quick question - what\'s the best way to handle API rate limits when building with Claude Code? Running into some issues with my current project.',
    timestamp: '6 hours ago',
    isPinned: false,
    likes: 5,
    replies: [
      {
        id: '3-1',
        author: { name: 'm***e', role: 'member', goal: 'Goal: $2K Shopify Agency' },
        content: 'I had the same issue! Try implementing exponential backoff - worked great for me.',
        timestamp: '5 hours ago'
      }
    ],
    isLiked: false
  }
]