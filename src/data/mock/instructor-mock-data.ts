// Shared mock data for instructor features
export const mockStudentJourneys = [
  {
    id: "sarah_chen",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    avatar: "SC",
    overallMetrics: {
      learnRate: 45,
      executionRate: 92,
      executionPace: 28,
      coursesEnrolled: 3,
      totalReflections: 24,
      totalConfusions: 3,
      avgQuizScore: 88,
      courseProgress: 75,
      videoProgress: 94,
      quizScore: 9
    },
    reflections: [
      {
        id: 'r1',
        timestamp: '2:15',
        timeInSeconds: 135,
        content: 'Great introduction! The roadmap really helps me understand what\'s coming.',
        status: 'responded' as const,
        response: 'Thanks Sarah! Glad the roadmap helped set expectations.',
        sentiment: 'positive' as const,
        type: 'text' as const
      },
      {
        id: 'r2',
        timestamp: '12:45',
        timeInSeconds: 765,
        content: 'Voice memo about useCallback vs useMemo',
        audioUrl: '/mock-audio.mp3',
        duration: '0:45',
        status: 'unresponded' as const,
        sentiment: 'positive' as const,
        type: 'voice' as const
      },
      {
        id: 'r3',
        timestamp: '18:32',
        timeInSeconds: 1112,
        content: 'Screenshot showing console error with useEffect',
        imageUrl: '/mock-screenshot.png',
        status: 'unresponded' as const,
        type: 'screenshot' as const,
        sentiment: 'confused' as const
      },
      {
        id: 'r4',
        timestamp: '35:20',
        timeInSeconds: 2120,
        content: 'This video really tied everything together. The practical examples made all the difference!',
        status: 'unresponded' as const,
        sentiment: 'positive' as const,
        type: 'text' as const
      }
    ],
    recentActivity: [
      {
        id: "a1",
        type: "reflection",
        inputType: "voice",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "hooks_deep_dive",
        videoTitle: "React Hooks Deep Dive",
        timestamp: "12:45",
        content: "Voice memo about useCallback vs useMemo",
        audioUrl: "/mock-audio.mp3",
        duration: "0:45",
        timeAgo: "5 minutes ago",
        status: "unresponded",
        videoProgress: 94,
        sentiment: "positive"
      },
      {
        id: "a2",
        type: "reflection",
        inputType: "text",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "hooks_deep_dive",
        videoTitle: "React Hooks Deep Dive",
        timestamp: "2:15",
        content: "Great introduction! The roadmap really helps me understand what's coming.",
        timeAgo: "2 hours ago",
        status: "responded",
        videoProgress: 94,
        sentiment: "positive"
      },
      {
        id: "a3",
        type: "confusion",
        inputType: "screenshot",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "hooks_deep_dive",
        videoTitle: "React Hooks Deep Dive",
        timestamp: "18:32",
        content: "Screenshot showing console error with useEffect",
        imageUrl: "/mock-screenshot.png",
        timeAgo: "3 hours ago",
        status: "unresponded",
        videoProgress: 94,
        sentiment: "confused"
      },
      {
        id: "a4",
        type: "quiz",
        courseId: "nodejs_microservices",
        courseName: "Node.js Microservices",
        videoId: "service_discovery",
        videoTitle: "Service Discovery Patterns",
        score: 7,
        total: 10,
        executionPace: 52,
        timeAgo: "1 day ago",
        videoProgress: 65
      }
    ]
  },
  {
    id: "mike_johnson",
    name: "Mike Johnson",
    email: "mike.j@company.com",
    avatar: "MJ",
    overallMetrics: {
      learnRate: 38,
      executionRate: 85,
      executionPace: 35,
      coursesEnrolled: 2,
      totalReflections: 15,
      totalConfusions: 6,
      avgQuizScore: 82,
      courseProgress: 60,
      videoProgress: 78,
      quizScore: 8
    },
    reflections: [
      {
        id: 'r5',
        timestamp: '5:30',
        timeInSeconds: 330,
        content: 'Following along but the pace is a bit fast.',
        status: 'unresponded' as const,
        sentiment: 'neutral' as const,
        type: 'text' as const
      },
      {
        id: 'r6',
        timestamp: '15:20',
        timeInSeconds: 920,
        content: 'Voice memo with my confusion about dependency arrays',
        audioUrl: '/mock-audio-2.mp3',
        duration: '1:20',
        status: 'unresponded' as const,
        type: 'voice' as const,
        sentiment: 'confused' as const
      }
    ],
    recentActivity: [
      {
        id: "a5",
        type: "confusion",
        inputType: "text",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "hooks_deep_dive",
        videoTitle: "React Hooks Deep Dive",
        timestamp: "18:30",
        content: "Still struggling with the dependency array concept",
        timeAgo: "15 minutes ago",
        status: "unresponded",
        videoProgress: 78,
        sentiment: "confused"
      },
      {
        id: "a6",
        type: "reflection",
        inputType: "loom",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "custom_hooks",
        videoTitle: "Custom Hooks Patterns",
        timestamp: "10:20",
        content: "Loom walkthrough of my custom hook implementation",
        videoUrl: "https://loom.com/share/mock",
        duration: "3:45",
        timeAgo: "1 hour ago",
        status: "unresponded",
        videoProgress: 100,
        sentiment: "positive"
      }
    ]
  },
  {
    id: "emma_wilson",
    name: "Emma Wilson",
    email: "emma.w@university.edu",
    avatar: "EW",
    overallMetrics: {
      learnRate: 52,
      executionRate: 95,
      executionPace: 22,
      coursesEnrolled: 4,
      totalReflections: 35,
      totalConfusions: 2,
      avgQuizScore: 94,
      courseProgress: 80,
      videoProgress: 100,
      quizScore: 10
    },
    reflections: [
      {
        id: 'r7',
        timestamp: '8:20',
        timeInSeconds: 500,
        content: 'The React.memo explanation with practical examples was exactly what I needed!',
        status: 'unresponded' as const,
        sentiment: 'positive' as const,
        type: 'text' as const
      },
      {
        id: 'r8',
        timestamp: '16:45',
        timeInSeconds: 1005,
        content: 'Loom walkthrough of how I implemented memoization in my project',
        videoUrl: 'https://loom.com/share/mock-emma',
        duration: '3:15',
        status: 'unresponded' as const,
        type: 'loom' as const,
        sentiment: 'positive' as const
      }
    ],
    recentActivity: [
      {
        id: "a7",
        type: "reflection",
        inputType: "voice",
        courseId: "react_patterns",
        courseName: "Advanced React Patterns",
        videoId: "performance_optimization",
        videoTitle: "Performance Optimization",
        timestamp: "8:20",
        content: "Voice note about React.memo usage",
        audioUrl: "/mock-audio-2.mp3",
        duration: "1:15",
        timeAgo: "30 minutes ago",
        status: "unresponded",
        videoProgress: 100,
        sentiment: "positive"
      }
    ]
  }
]

export const getStudentJourneyData = (studentId: string) => {
  const student = mockStudentJourneys.find(s => s.id === studentId)
  if (!student) return null
  
  // Transform the data to match the video page expected structure
  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      metrics: {
        learnRate: student.overallMetrics.learnRate,
        executionRate: student.overallMetrics.executionRate,
        executionPace: student.overallMetrics.executionPace,
        courseProgress: student.overallMetrics.courseProgress || 75,
        videoProgress: student.overallMetrics.videoProgress || 94,
        quizScore: student.overallMetrics.quizScore || 9
      }
    },
    reflections: student.reflections
  }
}