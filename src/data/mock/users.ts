export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: "learner" | "instructor" | "admin"
  createdAt: Date
  subscription?: {
    plan: "free" | "pro"
    aiInteractionsUsed?: number
    aiInteractionsLimit?: number
  }
}

export interface LearnerProfile extends User {
  enrolledCourses: string[]
  completedCourses: string[]
  bookmarks: Bookmark[]
  reflections: Reflection[]
  metrics: LearningMetrics
}

export interface InstructorProfile extends User {
  bio: string
  expertise: string[]
  courses: string[]
  rating: number
  totalStudents: number
  earnings: {
    total: number
    pending: number
    withdrawn: number
  }
}

export interface Bookmark {
  id: string
  courseId: string
  videoId: string
  timestamp: number
  note?: string
  createdAt: Date
}

export interface Reflection {
  id: string
  courseId: string
  videoId: string
  type: "voice" | "video" | "text"
  content: string
  prompt: string
  submittedAt: Date
  feedback?: {
    from: string
    message: string
    rating?: number
    givenAt: Date
  }
}

export interface LearningMetrics {
  learnRate: number // minutes of active learning per hour
  executionRate: number // percentage of completed activities
  executionPace: number // average response time in seconds
  totalWatchTime: number // in minutes
  coursesStarted: number
  coursesCompleted: number
  quizzesCompleted: number
  averageQuizScore: number
}

export const mockUsers: {
  learners: LearnerProfile[]
  instructors: InstructorProfile[]
} = {
  learners: [
    {
      id: "learner-1",
      email: "john.doe@example.com",
      name: "John Doe",
      avatar: "/avatars/john.jpg",
      role: "learner",
      createdAt: new Date("2024-01-15"),
      subscription: {
        plan: "free",
        aiInteractionsUsed: 7,
        aiInteractionsLimit: 10,
      },
      enrolledCourses: ["course-1", "course-2"],
      completedCourses: [],
      bookmarks: [
        {
          id: "bookmark-1",
          courseId: "course-1",
          videoId: "video-1-2",
          timestamp: 1200,
          note: "Important concept about semantic HTML",
          createdAt: new Date("2024-02-01"),
        },
      ],
      reflections: [
        {
          id: "reflection-1",
          courseId: "course-1",
          videoId: "video-1-5",
          type: "text",
          content: "I learned how to structure a website properly using HTML5 semantic elements.",
          prompt: "What was the most important thing you learned about HTML structure?",
          submittedAt: new Date("2024-02-05"),
          feedback: {
            from: "Sarah Chen",
            message: "Great reflection! Try to also consider how semantic HTML helps with SEO.",
            rating: 4,
            givenAt: new Date("2024-02-06"),
          },
        },
      ],
      metrics: {
        learnRate: 35,
        executionRate: 85,
        executionPace: 45,
        totalWatchTime: 420,
        coursesStarted: 2,
        coursesCompleted: 0,
        quizzesCompleted: 8,
        averageQuizScore: 78,
      },
    },
  ],
  instructors: [
    {
      id: "instructor-1",
      email: "sarah.chen@example.com",
      name: "Sarah Chen",
      avatar: "/avatars/sarah.jpg",
      role: "instructor",
      createdAt: new Date("2023-06-01"),
      bio: "Full-stack developer with 10+ years of experience. Passionate about teaching web development.",
      expertise: ["Web Development", "JavaScript", "React", "Node.js"],
      courses: ["course-1"],
      rating: 4.8,
      totalStudents: 2543,
      earnings: {
        total: 45000,
        pending: 3200,
        withdrawn: 41800,
      },
    },
    {
      id: "instructor-2",
      email: "james.miller@example.com",
      name: "Dr. James Miller",
      avatar: "/avatars/james.jpg",
      role: "instructor",
      createdAt: new Date("2023-08-15"),
      bio: "PhD in Computer Science, specializing in machine learning and AI. Former research scientist at tech giants.",
      expertise: ["Machine Learning", "Deep Learning", "Python", "Data Science"],
      courses: ["course-2"],
      rating: 4.9,
      totalStudents: 1832,
      earnings: {
        total: 62000,
        pending: 5500,
        withdrawn: 56500,
      },
    },
  ],
}