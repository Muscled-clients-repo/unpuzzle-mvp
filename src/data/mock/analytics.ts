export interface CourseAnalytics {
  courseId: string
  totalEnrollments: number
  activeStudents: number
  completionRate: number
  averageProgress: number
  averageRating: number
  totalRevenue: number
  dropoutPoints: DropoutPoint[]
  engagementMetrics: EngagementMetrics
}

export interface DropoutPoint {
  videoId: string
  timestamp: number
  dropoutRate: number
  commonIssue?: string
}

export interface EngagementMetrics {
  averageWatchTime: number
  averageSessionLength: number
  aiInteractionRate: number
  quizCompletionRate: number
  reflectionSubmissionRate: number
}

export interface StudentProgress {
  userId: string
  courseId: string
  progress: number
  lastAccessed: Date
  videosCompleted: string[]
  currentVideo?: {
    videoId: string
    timestamp: number
  }
  quizScores: { [videoId: string]: number }
  aiInteractions: number
  reflectionsSubmitted: number
}

export interface PlatformAnalytics {
  totalUsers: number
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  totalCourses: number
  totalRevenue: number
  topCourses: {
    courseId: string
    title: string
    enrollments: number
    revenue: number
  }[]
  userGrowth: {
    date: Date
    newUsers: number
    totalUsers: number
  }[]
}

export const mockCourseAnalytics: CourseAnalytics[] = [
  {
    courseId: "course-1",
    totalEnrollments: 2543,
    activeStudents: 1832,
    completionRate: 42,
    averageProgress: 58,
    averageRating: 4.8,
    totalRevenue: 201397,
    dropoutPoints: [
      {
        videoId: "video-1-3",
        timestamp: 2400,
        dropoutRate: 15,
        commonIssue: "CSS Grid complexity",
      },
      {
        videoId: "video-1-4",
        timestamp: 3000,
        dropoutRate: 22,
        commonIssue: "JavaScript functions confusion",
      },
    ],
    engagementMetrics: {
      averageWatchTime: 35,
      averageSessionLength: 52,
      aiInteractionRate: 68,
      quizCompletionRate: 75,
      reflectionSubmissionRate: 45,
    },
  },
  {
    courseId: "course-2",
    totalEnrollments: 1832,
    activeStudents: 1456,
    completionRate: 38,
    averageProgress: 52,
    averageRating: 4.9,
    totalRevenue: 236328,
    dropoutPoints: [
      {
        videoId: "video-2-3",
        timestamp: 1500,
        dropoutRate: 18,
        commonIssue: "Math prerequisites",
      },
      {
        videoId: "video-2-5",
        timestamp: 2400,
        dropoutRate: 25,
        commonIssue: "Neural network complexity",
      },
    ],
    engagementMetrics: {
      averageWatchTime: 42,
      averageSessionLength: 65,
      aiInteractionRate: 72,
      quizCompletionRate: 68,
      reflectionSubmissionRate: 38,
    },
  },
]

export const mockStudentProgress: StudentProgress[] = [
  {
    userId: "learner-1",
    courseId: "course-1",
    progress: 35,
    lastAccessed: new Date("2024-02-05"),
    videosCompleted: ["video-1-1", "video-1-2"],
    currentVideo: {
      videoId: "video-1-3",
      timestamp: 1200,
    },
    quizScores: {
      "video-1-1": 85,
      "video-1-2": 72,
    },
    aiInteractions: 7,
    reflectionsSubmitted: 1,
  },
]

export const mockPlatformAnalytics: PlatformAnalytics = {
  totalUsers: 12543,
  activeUsers: {
    daily: 3421,
    weekly: 6782,
    monthly: 9234,
  },
  totalCourses: 156,
  totalRevenue: 1823456,
  topCourses: [
    {
      courseId: "course-2",
      title: "Machine Learning Fundamentals",
      enrollments: 1832,
      revenue: 236328,
    },
    {
      courseId: "course-1",
      title: "Introduction to Web Development",
      enrollments: 2543,
      revenue: 201397,
    },
  ],
  userGrowth: [
    { date: new Date("2024-01-01"), newUsers: 245, totalUsers: 10234 },
    { date: new Date("2024-01-15"), newUsers: 312, totalUsers: 10546 },
    { date: new Date("2024-02-01"), newUsers: 456, totalUsers: 11002 },
    { date: new Date("2024-02-15"), newUsers: 523, totalUsers: 11525 },
    { date: new Date("2024-03-01"), newUsers: 612, totalUsers: 12137 },
    { date: new Date("2024-03-15"), newUsers: 406, totalUsers: 12543 },
  ],
}

export const generateHeatmapData = (videoId: string) => {
  const duration = 3600 // 60 minutes in seconds
  const interval = 60 // 1 minute intervals
  const points = []
  
  for (let i = 0; i < duration; i += interval) {
    const baseRetention = 100 - (i / duration) * 40 // Natural decline
    const noise = Math.random() * 10 - 5 // Random variation
    const dropSpike = 
      (i === 1500 || i === 2400) ? -15 : // Difficulty spikes
      0
    
    points.push({
      time: i,
      retention: Math.max(0, Math.min(100, baseRetention + noise + dropSpike)),
    })
  }
  
  return points
}