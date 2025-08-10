import { StateCreator } from 'zustand'

// Types
export interface StruggleZone {
  id: string
  topic: string
  course: string
  activeCount: number
  lastHour: number
  difficulty: number
  topHelpers: string[]
  aiSuggestion: string
  joinedUsers?: string[]
}

export interface StudyCircle {
  id: string
  name: string
  members: number
  maxMembers: number
  topic: string
  nextSession: string
  learnRate: number
  status: 'active' | 'enrolling' | 'full'
  memberAvatars?: string[]
}

export interface Reflection {
  id: string
  author: string
  avatar: string
  course: string
  lesson: string
  content: string
  likes: number
  replies: number
  timeAgo: string
  aiHighlight?: string
  instructorFeatured?: boolean
  likedBy?: string[]
}

export interface Breakthrough {
  id: string
  author: string
  avatar: string
  journey: {
    struggle: string
    tryCount: number
    breakthrough: string
    timeToSuccess: string
  }
  helpedBy: string[]
  nowHelping: number
}

export interface TodaysChallenge {
  id: string
  title: string
  description: string
  difficulty: string
  participants: number
  timeLeft: string
  topSolutions: number
  aiHints: number
  joinedUsers?: string[]
}

export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  learnRate: number // minutes of active learning per hour
  executionPace: number // seconds to complete prompted activities
  executionRate: number // % of prompted activities completed
  rank: number
  trend: 'up' | 'down' | 'stable'
  totalStudyTime: number
  currentStreak: number
}

export interface Post {
  id: string
  type: 'post' | 'announcement' | 'achievement' | 'question' | 'milestone'
  author: {
    id: string
    name: string
    avatar: string
    role: 'learner' | 'instructor' | 'admin'
    metrics?: {
      learnRate: number
      executionPace: number
      executionRate: number
    }
  }
  content: string
  media?: {
    type: 'image' | 'video' | 'code'
    url: string
  }
  course?: string
  tags?: string[]
  likes: number
  comments: number
  shares: number
  timestamp: string
  isPinned?: boolean
  achievement?: {
    type: 'streak' | 'completion' | 'metric' | 'help'
    value: string
    icon?: string
  }
  likedBy?: string[]
  bookmarkedBy?: string[]
}

export interface Comment {
  id: string
  postId: string
  author: {
    id: string
    name: string
    avatar: string
  }
  content: string
  timestamp: string
  likes: number
}

export interface CommunityStats {
  totalActiveLearners: number
  currentlyLearning: number
  strugglesResolved: number
  communityLearnRate: number
  avgExecutionPace: number
  avgExecutionRate: number
  activeNowUsers: Array<{
    id: string
    name: string
    topic: string
    course: string
    time: string
    avatar?: string
    learnRate?: number
    executionPace?: number
    executionRate?: number
  }>
}

// State interface
export interface CommunityState {
  // Data
  struggleZones: StruggleZone[]
  studyCircles: StudyCircle[]
  reflections: Reflection[]
  breakthroughs: Breakthrough[]
  todaysChallenge: TodaysChallenge | null
  communityStats: CommunityStats
  leaderboard: {
    learnRate: LeaderboardEntry[]
    executionPace: LeaderboardEntry[]
    executionRate: LeaderboardEntry[]
  }
  posts: Post[]
  pinnedPosts: Post[]
  comments: Comment[]
  
  // UI State
  activeTab: string
  isLoading: boolean
  error: string | null
  
  // Actions
  setActiveTab: (tab: string) => void
  joinStruggleZone: (zoneId: string, userId: string) => void
  leaveStruggleZone: (zoneId: string, userId: string) => void
  joinStudyCircle: (circleId: string, userId: string) => void
  leaveStudyCircle: (circleId: string, userId: string) => void
  likeReflection: (reflectionId: string, userId: string) => void
  unlikeReflection: (reflectionId: string, userId: string) => void
  joinChallenge: (userId: string) => void
  incrementStruggleZoneCount: (zoneId: string) => void
  resolveStruggle: (zoneId: string) => void
  updateCommunityStats: (stats: Partial<CommunityStats>) => void
  addReflection: (reflection: Reflection) => void
  addBreakthrough: (breakthrough: Breakthrough) => void
  
  // Post Actions
  createPost: (post: Omit<Post, 'id' | 'likes' | 'comments' | 'shares' | 'timestamp'>) => void
  likePost: (postId: string, userId: string) => void
  unlikePost: (postId: string, userId: string) => void
  commentOnPost: (postId: string, comment: Omit<Comment, 'id' | 'postId' | 'timestamp' | 'likes'>) => void
  sharePost: (postId: string) => void
  bookmarkPost: (postId: string, userId: string) => void
  unbookmarkPost: (postId: string, userId: string) => void
  pinPost: (postId: string) => void
  unpinPost: (postId: string) => void
  
  // Data fetching
  fetchCommunityData: () => Promise<void>
  refreshStruggleZones: () => Promise<void>
  refreshStudyCircles: () => Promise<void>
}

// Mock data (will be replaced with API calls)
const mockStruggleZones: StruggleZone[] = [
  {
    id: "1",
    topic: "CSS Grid Layout",
    course: "Web Development",
    activeCount: 87,
    lastHour: 23,
    difficulty: 85,
    topHelpers: ["Sarah M.", "Mike R."],
    aiSuggestion: "Many learners find visual guides helpful for Grid",
    joinedUsers: []
  },
  {
    id: "2",
    topic: "Gradient Descent",
    course: "Machine Learning",
    activeCount: 45,
    lastHour: 15,
    difficulty: 92,
    topHelpers: ["Dr. Chen", "Alex K."],
    aiSuggestion: "Breaking down the math step-by-step helps most",
    joinedUsers: []
  },
  {
    id: "3", 
    topic: "Async/Await",
    course: "JavaScript Fundamentals",
    activeCount: 34,
    lastHour: 12,
    difficulty: 78,
    topHelpers: ["James L.", "Emma W."],
    aiSuggestion: "Real-world examples make this concept clearer",
    joinedUsers: []
  }
]

const mockStudyCircles: StudyCircle[] = [
  {
    id: "1",
    name: "Night Owls - Web Dev",
    members: 8,
    maxMembers: 10,
    topic: "Building Responsive Layouts",
    nextSession: "Tonight 10 PM",
    learnRate: 45,
    status: "active"
  },
  {
    id: "2",
    name: "ML Morning Crew",
    members: 6,
    maxMembers: 8,
    topic: "Neural Networks",
    nextSession: "Tomorrow 7 AM",
    learnRate: 38,
    status: "enrolling"
  },
  {
    id: "3",
    name: "Weekend Warriors",
    members: 12,
    maxMembers: 12,
    topic: "Full Stack Project",
    nextSession: "Saturday 2 PM",
    learnRate: 52,
    status: "full"
  }
]

const mockReflections: Reflection[] = [
  {
    id: "1",
    author: "Sarah Martinez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    course: "Web Development",
    lesson: "CSS Grid",
    content: "Finally understood Grid after struggling for days! The key was realizing that grid-template-areas lets you visually design your layout. It's like drawing with ASCII art!",
    likes: 234,
    replies: 18,
    timeAgo: "2 hours ago",
    aiHighlight: "Breakthrough insight about visual thinking",
    instructorFeatured: true,
    likedBy: []
  },
  {
    id: "2",
    author: "Mike Rodriguez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    course: "Machine Learning",
    lesson: "Backpropagation",
    content: "The 'chain rule' finally clicked when I thought of it like dominoes falling backward. Each derivative passes its effect to the previous layer.",
    likes: 189,
    replies: 24,
    timeAgo: "4 hours ago",
    aiHighlight: "Excellent analogy for complex concept",
    likedBy: []
  },
  {
    id: "3",
    author: "Emma Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    course: "Data Science",
    lesson: "Data Cleaning",
    content: "Spent 3 hours cleaning data, realized 80% of data science is janitor work 😅 But now I see why - garbage in, garbage out!",
    likes: 412,
    replies: 67,
    timeAgo: "6 hours ago",
    aiHighlight: "Realistic expectation setting",
    likedBy: []
  }
]

const mockBreakthroughs: Breakthrough[] = [
  {
    id: "1",
    author: "Alex Kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    journey: {
      struggle: "Couldn't understand closures for 2 weeks",
      tryCount: 47,
      breakthrough: "Realized closures are just functions with backpacks!",
      timeToSuccess: "14 days"
    },
    helpedBy: ["Community", "AI Hints"],
    nowHelping: 12
  },
  {
    id: "2",
    author: "Lisa Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    journey: {
      struggle: "Redux state management was a nightmare",
      tryCount: 31,
      breakthrough: "Drew the data flow on paper - suddenly it all made sense!",
      timeToSuccess: "8 days"
    },
    helpedBy: ["Study Circle", "Instructor"],
    nowHelping: 8
  }
]

const mockTodaysChallenge: TodaysChallenge = {
  id: "daily-1",
  title: "Collaborative CSS Grid Gallery",
  description: "Build a responsive photo gallery using CSS Grid. Work solo or join a team!",
  difficulty: "Medium",
  participants: 234,
  timeLeft: "18 hours",
  topSolutions: 12,
  aiHints: 3,
  joinedUsers: []
}

const mockLeaderboard = {
  learnRate: [
    { id: "1", name: "Sarah Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", learnRate: 52, executionPace: 35, executionRate: 94, rank: 1, trend: 'up', totalStudyTime: 1250, currentStreak: 15 },
    { id: "2", name: "Mike Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", learnRate: 48, executionPace: 42, executionRate: 88, rank: 2, trend: 'stable', totalStudyTime: 980, currentStreak: 8 },
    { id: "3", name: "Emma Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma", learnRate: 45, executionPace: 38, executionRate: 91, rank: 3, trend: 'up', totalStudyTime: 1100, currentStreak: 12 },
    { id: "4", name: "Alex Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", learnRate: 44, executionPace: 45, executionRate: 85, rank: 4, trend: 'down', totalStudyTime: 750, currentStreak: 5 },
    { id: "5", name: "Lisa Wang", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa", learnRate: 42, executionPace: 40, executionRate: 90, rank: 5, trend: 'up', totalStudyTime: 890, currentStreak: 10 }
  ],
  executionPace: [
    { id: "1", name: "Alex Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", learnRate: 44, executionPace: 28, executionRate: 85, rank: 1, trend: 'up', totalStudyTime: 750, currentStreak: 5 },
    { id: "2", name: "Sarah Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", learnRate: 52, executionPace: 35, executionRate: 94, rank: 2, trend: 'stable', totalStudyTime: 1250, currentStreak: 15 },
    { id: "3", name: "Emma Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma", learnRate: 45, executionPace: 38, executionRate: 91, rank: 3, trend: 'stable', totalStudyTime: 1100, currentStreak: 12 },
    { id: "4", name: "Lisa Wang", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa", learnRate: 42, executionPace: 40, executionRate: 90, rank: 4, trend: 'down', totalStudyTime: 890, currentStreak: 10 },
    { id: "5", name: "Mike Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", learnRate: 48, executionPace: 42, executionRate: 88, rank: 5, trend: 'down', totalStudyTime: 980, currentStreak: 8 }
  ],
  executionRate: [
    { id: "1", name: "Sarah Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", learnRate: 52, executionPace: 35, executionRate: 94, rank: 1, trend: 'stable', totalStudyTime: 1250, currentStreak: 15 },
    { id: "2", name: "Emma Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma", learnRate: 45, executionPace: 38, executionRate: 91, rank: 2, trend: 'up', totalStudyTime: 1100, currentStreak: 12 },
    { id: "3", name: "Lisa Wang", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa", learnRate: 42, executionPace: 40, executionRate: 90, rank: 3, trend: 'up', totalStudyTime: 890, currentStreak: 10 },
    { id: "4", name: "Mike Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", learnRate: 48, executionPace: 42, executionRate: 88, rank: 4, trend: 'stable', totalStudyTime: 980, currentStreak: 8 },
    { id: "5", name: "Alex Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", learnRate: 44, executionPace: 28, executionRate: 85, rank: 5, trend: 'down', totalStudyTime: 750, currentStreak: 5 }
  ]
}

const mockCommunityStats: CommunityStats = {
  totalActiveLearners: 1847,
  currentlyLearning: 423,
  strugglesResolved: 156,
  communityLearnRate: 42,
  avgExecutionPace: 38,
  avgExecutionRate: 89,
  activeNowUsers: [
    { id: "1", name: "Sarah", topic: "CSS Grid", course: "Web Dev", time: "2 min ago", learnRate: 52, executionPace: 35, executionRate: 94 },
    { id: "2", name: "Mike", topic: "Neural Networks", course: "ML", time: "5 min ago", learnRate: 48, executionPace: 42, executionRate: 88 },
    { id: "3", name: "Emma", topic: "React Hooks", course: "React", time: "8 min ago", learnRate: 45, executionPace: 38, executionRate: 91 },
    { id: "4", name: "Alex", topic: "Python Basics", course: "Python", time: "12 min ago", learnRate: 44, executionPace: 28, executionRate: 85 },
    { id: "5", name: "Lisa", topic: "SQL Joins", course: "Database", time: "15 min ago", learnRate: 42, executionPace: 40, executionRate: 90 },
  ]
}

const mockPosts: Post[] = [
  {
    id: "post-1",
    type: "announcement",
    author: {
      id: "admin-1",
      name: "Unpuzzle Team",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Unpuzzle",
      role: "admin"
    },
    content: "🎉 New Performance Metrics Feature Released! Track your Learn Rate, Execution Pace, and Execution Rate in real-time. Check the Community tab to see how you rank against other learners!",
    course: "Platform Update",
    tags: ["announcement", "new-feature", "metrics"],
    likes: 234,
    comments: 18,
    shares: 45,
    timestamp: "2 hours ago",
    isPinned: true,
    likedBy: [],
    bookmarkedBy: []
  },
  {
    id: "post-2",
    type: "achievement",
    author: {
      id: "learner-1",
      name: "Sarah Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      role: "learner",
      metrics: {
        learnRate: 52,
        executionPace: 35,
        executionRate: 94
      }
    },
    content: "Just completed the entire Machine Learning course! The gradient descent section was tough, but the community support was amazing. Special thanks to @MikeR and @DrChen for the help!",
    course: "Machine Learning",
    tags: ["achievement", "course-completion", "ml"],
    likes: 189,
    comments: 24,
    shares: 12,
    timestamp: "4 hours ago",
    achievement: {
      type: "completion",
      value: "Course Completed",
      icon: "🏆"
    },
    likedBy: [],
    bookmarkedBy: []
  },
  {
    id: "post-3",
    type: "question",
    author: {
      id: "learner-2",
      name: "Mike Rodriguez",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      role: "learner",
      metrics: {
        learnRate: 48,
        executionPace: 42,
        executionRate: 88
      }
    },
    content: "Can someone explain the difference between CSS Grid and Flexbox? I'm confused about when to use which one. Working on the responsive layout project.",
    course: "Web Development",
    tags: ["question", "css", "help-needed"],
    likes: 45,
    comments: 31,
    shares: 8,
    timestamp: "6 hours ago",
    likedBy: [],
    bookmarkedBy: []
  },
  {
    id: "post-4",
    type: "milestone",
    author: {
      id: "learner-3",
      name: "Emma Davis",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      role: "learner",
      metrics: {
        learnRate: 45,
        executionPace: 38,
        executionRate: 91
      }
    },
    content: "30-day streak! 🔥 My learn rate has improved from 25 to 45 min/hr. The key was setting a consistent schedule and joining the Morning Crew study circle.",
    tags: ["milestone", "streak", "progress"],
    likes: 312,
    comments: 42,
    shares: 28,
    timestamp: "8 hours ago",
    achievement: {
      type: "streak",
      value: "30 Day Streak",
      icon: "🔥"
    },
    likedBy: [],
    bookmarkedBy: []
  },
  {
    id: "post-5",
    type: "post",
    author: {
      id: "instructor-1",
      name: "Dr. Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrChen",
      role: "instructor"
    },
    content: "Pro tip for those struggling with backpropagation: Draw the computation graph first! Visual representation makes the chain rule much clearer. I've added a new supplementary video on this topic.",
    course: "Machine Learning",
    tags: ["tip", "backpropagation", "instructor-insight"],
    likes: 567,
    comments: 89,
    shares: 112,
    timestamp: "12 hours ago",
    likedBy: [],
    bookmarkedBy: []
  }
]

const mockComments: Comment[] = [
  {
    id: "comment-1",
    postId: "post-3",
    author: {
      id: "learner-4",
      name: "Alex Kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
    },
    content: "Grid is for 2D layouts (rows AND columns), Flexbox is for 1D (row OR column). I use Grid for page layouts and Flexbox for component layouts!",
    timestamp: "5 hours ago",
    likes: 23
  },
  {
    id: "comment-2",
    postId: "post-3",
    author: {
      id: "instructor-2",
      name: "Sarah Martinez",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahM"
    },
    content: "Great question! Think of Grid as a spreadsheet and Flexbox as a single row/column. Grid gives you more control over the overall structure.",
    timestamp: "4 hours ago",
    likes: 45
  }
]

// Create the slice
export const createCommunitySlice: StateCreator<CommunityState> = (set, get) => ({
  // Initial state
  struggleZones: mockStruggleZones,
  studyCircles: mockStudyCircles,
  reflections: mockReflections,
  breakthroughs: mockBreakthroughs,
  todaysChallenge: mockTodaysChallenge,
  communityStats: mockCommunityStats,
  leaderboard: mockLeaderboard,
  posts: mockPosts,
  pinnedPosts: mockPosts.filter(p => p.isPinned),
  comments: mockComments,
  activeTab: 'newsfeed',
  isLoading: false,
  error: null,
  
  // UI Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Struggle Zone Actions
  joinStruggleZone: (zoneId, userId) => set((state) => ({
    struggleZones: state.struggleZones.map(zone =>
      zone.id === zoneId
        ? { 
            ...zone, 
            activeCount: zone.activeCount + 1,
            joinedUsers: [...(zone.joinedUsers || []), userId]
          }
        : zone
    )
  })),
  
  leaveStruggleZone: (zoneId, userId) => set((state) => ({
    struggleZones: state.struggleZones.map(zone =>
      zone.id === zoneId
        ? { 
            ...zone, 
            activeCount: Math.max(0, zone.activeCount - 1),
            joinedUsers: (zone.joinedUsers || []).filter(id => id !== userId)
          }
        : zone
    )
  })),
  
  incrementStruggleZoneCount: (zoneId) => set((state) => ({
    struggleZones: state.struggleZones.map(zone =>
      zone.id === zoneId
        ? { ...zone, activeCount: zone.activeCount + 1, lastHour: zone.lastHour + 1 }
        : zone
    )
  })),
  
  resolveStruggle: (zoneId) => set((state) => ({
    struggleZones: state.struggleZones.map(zone =>
      zone.id === zoneId
        ? { ...zone, activeCount: Math.max(0, zone.activeCount - 1) }
        : zone
    ),
    communityStats: {
      ...state.communityStats,
      strugglesResolved: state.communityStats.strugglesResolved + 1
    }
  })),
  
  // Study Circle Actions
  joinStudyCircle: (circleId, userId) => set((state) => ({
    studyCircles: state.studyCircles.map(circle =>
      circle.id === circleId && circle.members < circle.maxMembers
        ? { 
            ...circle, 
            members: circle.members + 1,
            status: circle.members + 1 >= circle.maxMembers ? 'full' : circle.status
          }
        : circle
    )
  })),
  
  leaveStudyCircle: (circleId, userId) => set((state) => ({
    studyCircles: state.studyCircles.map(circle =>
      circle.id === circleId
        ? { 
            ...circle, 
            members: Math.max(0, circle.members - 1),
            status: circle.members - 1 < circle.maxMembers ? 'enrolling' : circle.status
          }
        : circle
    )
  })),
  
  // Reflection Actions
  likeReflection: (reflectionId, userId) => set((state) => ({
    reflections: state.reflections.map(reflection =>
      reflection.id === reflectionId
        ? { 
            ...reflection, 
            likes: reflection.likes + 1,
            likedBy: [...(reflection.likedBy || []), userId]
          }
        : reflection
    )
  })),
  
  unlikeReflection: (reflectionId, userId) => set((state) => ({
    reflections: state.reflections.map(reflection =>
      reflection.id === reflectionId
        ? { 
            ...reflection, 
            likes: Math.max(0, reflection.likes - 1),
            likedBy: (reflection.likedBy || []).filter(id => id !== userId)
          }
        : reflection
    )
  })),
  
  addReflection: (reflection) => set((state) => ({
    reflections: [reflection, ...state.reflections]
  })),
  
  // Breakthrough Actions
  addBreakthrough: (breakthrough) => set((state) => ({
    breakthroughs: [breakthrough, ...state.breakthroughs]
  })),
  
  // Challenge Actions
  joinChallenge: (userId) => set((state) => ({
    todaysChallenge: state.todaysChallenge 
      ? {
          ...state.todaysChallenge,
          participants: state.todaysChallenge.participants + 1,
          joinedUsers: [...(state.todaysChallenge.joinedUsers || []), userId]
        }
      : null
  })),
  
  // Stats Actions
  updateCommunityStats: (stats) => set((state) => ({
    communityStats: { ...state.communityStats, ...stats }
  })),
  
  // Post Actions
  createPost: (post) => set((state) => {
    const newPost: Post = {
      ...post,
      id: `post-${Date.now()}`,
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: 'just now',
      likedBy: [],
      bookmarkedBy: []
    }
    return {
      posts: [newPost, ...state.posts],
      pinnedPosts: post.isPinned ? [newPost, ...state.pinnedPosts] : state.pinnedPosts
    }
  }),
  
  likePost: (postId, userId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            likes: post.likes + 1,
            likedBy: [...(post.likedBy || []), userId]
          }
        : post
    ),
    pinnedPosts: state.pinnedPosts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            likes: post.likes + 1,
            likedBy: [...(post.likedBy || []), userId]
          }
        : post
    )
  })),
  
  unlikePost: (postId, userId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            likes: Math.max(0, post.likes - 1),
            likedBy: (post.likedBy || []).filter(id => id !== userId)
          }
        : post
    ),
    pinnedPosts: state.pinnedPosts.map(post =>
      post.id === postId
        ? { 
            ...post, 
            likes: Math.max(0, post.likes - 1),
            likedBy: (post.likedBy || []).filter(id => id !== userId)
          }
        : post
    )
  })),
  
  commentOnPost: (postId, comment) => set((state) => {
    const newComment: Comment = {
      ...comment,
      id: `comment-${Date.now()}`,
      postId,
      timestamp: 'just now',
      likes: 0
    }
    return {
      comments: [...state.comments, newComment],
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post
      ),
      pinnedPosts: state.pinnedPosts.map(post =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post
      )
    }
  }),
  
  sharePost: (postId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { ...post, shares: post.shares + 1 }
        : post
    ),
    pinnedPosts: state.pinnedPosts.map(post =>
      post.id === postId
        ? { ...post, shares: post.shares + 1 }
        : post
    )
  })),
  
  bookmarkPost: (postId, userId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { ...post, bookmarkedBy: [...(post.bookmarkedBy || []), userId] }
        : post
    ),
    pinnedPosts: state.pinnedPosts.map(post =>
      post.id === postId
        ? { ...post, bookmarkedBy: [...(post.bookmarkedBy || []), userId] }
        : post
    )
  })),
  
  unbookmarkPost: (postId, userId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { ...post, bookmarkedBy: (post.bookmarkedBy || []).filter(id => id !== userId) }
        : post
    ),
    pinnedPosts: state.pinnedPosts.map(post =>
      post.id === postId
        ? { ...post, bookmarkedBy: (post.bookmarkedBy || []).filter(id => id !== userId) }
        : post
    )
  })),
  
  pinPost: (postId) => set((state) => {
    const post = state.posts.find(p => p.id === postId)
    if (!post) return state
    
    const updatedPost = { ...post, isPinned: true }
    return {
      posts: state.posts.map(p => p.id === postId ? updatedPost : p),
      pinnedPosts: state.pinnedPosts.find(p => p.id === postId) 
        ? state.pinnedPosts 
        : [updatedPost, ...state.pinnedPosts]
    }
  }),
  
  unpinPost: (postId) => set((state) => ({
    posts: state.posts.map(post =>
      post.id === postId
        ? { ...post, isPinned: false }
        : post
    ),
    pinnedPosts: state.pinnedPosts.filter(post => post.id !== postId)
  })),
  
  // Data fetching (mock for now)
  fetchCommunityData: async () => {
    set({ isLoading: true, error: null })
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      // Data is already loaded from mock
      set({ isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch community data' })
    }
  },
  
  refreshStruggleZones: async () => {
    // Simulate real-time update
    await new Promise(resolve => setTimeout(resolve, 300))
    // In production, fetch from API
  },
  
  refreshStudyCircles: async () => {
    // Simulate real-time update
    await new Promise(resolve => setTimeout(resolve, 300))
    // In production, fetch from API
  }
})