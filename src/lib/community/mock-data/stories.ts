import { PlaygroundCommunity } from '../types'

export const mockSuccessStories: PlaygroundCommunity.SuccessStory[] = [
  {
    id: '1',
    memberName: 'Member A',
    achievement: 'First $10k Month',
    earnings: '$12,450',
    goalType: 'shopify',
    date: '2025-09-10',
    story: 'Built my first Shopify app using Claude Code in just 2 weeks. Client loved it so much they hired me for ongoing development. The AI-assisted workflow is a game changer!'
  },
  {
    id: '2',
    memberName: 'Member B',
    achievement: 'Landed Dream Client',
    earnings: '$8,500',
    goalType: 'ai',
    date: '2025-09-08',
    story: 'Used the proposal templates and sales call recordings from the community. Closed my biggest client yet - an AI automation project for a Fortune 500 company.'
  },
  {
    id: '3',
    memberName: 'Member C',
    achievement: 'First SaaS Revenue',
    earnings: '$2,100 MRR',
    goalType: 'saas',
    date: '2025-09-05',
    story: 'Followed the SaaS track courses and built my MVP in 3 weeks. Already have 42 paying customers and growing fast. The community feedback was invaluable.'
  },
  {
    id: '4',
    memberName: 'Member D',
    achievement: 'Team Scaling Success',
    earnings: '$15,200',
    goalType: 'shopify',
    date: '2025-09-03',
    story: 'Hired 3 developers at $2/hr using the team building playbook. Now handling 5x more projects while maintaining 80% profit margins just like Mahtab taught us.'
  },
  {
    id: '5',
    memberName: 'Member E',
    achievement: 'Career Transition',
    earnings: '$6,800',
    goalType: 'ai',
    date: '2025-09-01',
    story: 'Went from corporate job to full-time AI freelancer in 4 months. The Claude Code mastery course gave me skills that put me ahead of 95% of developers out there.'
  }
]

export const mockDiscussions: PlaygroundCommunity.Discussion[] = [
  {
    id: '1',
    author: 'Alex M.',
    content: 'Just hit my first $5k month! The key was following the exact proposal templates and really understanding client pain points. Thanks to everyone who helped review my sales calls.',
    goalType: 'shopify',
    replies: 23,
    likes: 47,
    date: '2025-09-11'
  },
  {
    id: '2',
    author: 'Sarah L.',
    content: 'Has anyone tried the new Claude 3.5 Sonnet for app development? Seeing 30% faster development times compared to the previous version. Game changing for client projects.',
    goalType: 'ai',
    replies: 15,
    likes: 32,
    date: '2025-09-11'
  },
  {
    id: '3',
    author: 'Member X',
    content: 'Scaling update: Now managing 8 developers across 3 time zones. The systems from the team building course made this possible. Happy to share my hiring process with anyone interested.',
    goalType: 'shopify',
    replies: 41,
    likes: 89,
    date: '2025-09-10'
  },
  {
    id: '4',
    author: 'David K.',
    content: 'My SaaS just crossed $10k MRR! Started from zero 6 months ago. The community accountability and weekly check-ins kept me focused when I wanted to quit.',
    goalType: 'saas',
    replies: 28,
    likes: 76,
    date: '2025-09-10'
  },
  {
    id: '5',
    author: 'Maria R.',
    content: 'Client presentation tips that worked: Always lead with their ROI, show before/after demos, and record everything for future proposals. Closed 4/5 pitches this week.',
    goalType: 'ai',
    replies: 19,
    likes: 54,
    date: '2025-09-09'
  }
]

export const mockCommunityStats: PlaygroundCommunity.CommunityStats = {
  totalMembers: 2847,
  activeThisWeek: 1247,
  totalEarnings: '$12.4M+',
  avgLearnRate: 42,
  goalBreakdown: {
    shopify: 1234,
    ai: 856,
    saas: 423,
    learning: 334
  }
}