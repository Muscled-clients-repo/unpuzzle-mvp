'use client'

import React, { useState } from 'react'
import { BookOpen, CheckCircle, Clock, Play, Lock, Target, TrendingUp, Award } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  duration: string
  videos: number
  progress: number
  completed: boolean
  completedDate?: string
  goalTrack: 'agency' | 'saas'
  goalLevel: string // e.g., '$1K', '$3K', '$5K'
  instructor: string
  thumbnail?: string
  category: 'sales' | 'service-delivery' | 'marketing'
  order: number
  actions: string[] // list of actions involved in this course
}

interface CoursesByGoal {
  goalTitle: string
  goalLevel: string
  status: 'completed' | 'current' | 'upcoming'
  courses: Course[]
}

interface CommunityCoursesProps {
  userRole: 'guest' | 'member' | 'instructor'
  memberName?: string
  isOwnProfile?: boolean
}

export function CommunityCoursesSection({ userRole, memberName, isOwnProfile = false }: CommunityCoursesProps) {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('goal-order')

  const isRestricted = userRole === 'guest'

  // Mock data - replace with real data
  const mockCoursesByGoal: CoursesByGoal[] = [
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
          progress: 75,
          completed: false,
          goalTrack: 'agency',
          goalLevel: '$5K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 1,
          actions: ['Watch videos', 'Complete quizzes', 'Build portfolio project', 'Submit reflection', 'Practice with real client']
        },
        {
          id: '8',
          title: 'Agency Scaling Systems',
          description: 'Build systems and processes to scale your agency to $5K+ monthly revenue',
          duration: '3h 15m',
          videos: 10,
          progress: 30,
          completed: false,
          goalTrack: 'agency',
          goalLevel: '$5K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 2,
          actions: ['Learn scaling frameworks', 'Create SOPs', 'Set up team structure', 'Build client pipeline', 'Track metrics']
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
          actions: ['Hire remote developers', 'Create job descriptions', 'Interview candidates', 'Onboard team members', 'Manage projects']
        },
        {
          id: '10',
          title: 'Premium Client Acquisition',
          description: 'Find and close high-value clients willing to pay premium rates',
          duration: '3h 00m',
          videos: 9,
          progress: 0,
          completed: false,
          goalTrack: 'agency',
          goalLevel: '$5K',
          instructor: 'Mahtab Alam',
          category: 'sales',
          order: 4,
          actions: ['Research premium clients', 'Create value propositions', 'Practice sales calls', 'Close high-value deals', 'Maintain relationships'],
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
          progress: 100,
          completed: true,
          completedDate: '2024-05-15',
          goalTrack: 'agency',
          goalLevel: '$3K',
          instructor: 'Mahtab Alam',
          category: 'sales',
          order: 1,
          actions: ['Create sales funnel', 'Write proposals', 'Practice cold outreach', 'Track conversion rates', 'Follow up with leads'],
        },
        {
          id: '5',
          title: 'Shopify Store Optimization',
          description: 'Master conversion optimization and performance improvements for client stores',
          duration: '4h 20m',
          videos: 13,
          progress: 100,
          completed: true,
          completedDate: '2024-06-08',
          goalTrack: 'agency',
          goalLevel: '$3K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 2,
          actions: ['Analyze store performance', 'Optimize conversion rates', 'Improve page speed', 'A/B test elements', 'Report improvements'],
        },
        {
          id: '6',
          title: 'Project Management for Agencies',
          description: 'Efficiently manage multiple client projects and deliver on time',
          duration: '2h 30m',
          videos: 7,
          progress: 100,
          completed: true,
          completedDate: '2024-06-22',
          goalTrack: 'agency',
          goalLevel: '$3K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 3,
          actions: ['Set up project workflows', 'Use project management tools', 'Create timelines', 'Communicate with clients', 'Deliver on schedule'],
        }
      ]
    },
    {
      goalTitle: 'Goal: $2K Shopify Agency',
      goalLevel: '$2K',
      status: 'completed',
      courses: [
        {
          id: '2',
          title: 'Shopify Development Fundamentals',
          description: 'Learn the basics of Shopify theme development and customization',
          duration: '5h 15m',
          videos: 15,
          progress: 100,
          completed: true,
          completedDate: '2024-02-28',
          goalTrack: 'agency',
          goalLevel: '$2K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 1,
          actions: ['Learn Liquid templating', 'Customize themes', 'Build custom features', 'Test on multiple devices', 'Deploy to production'],
        },
        {
          id: '3',
          title: 'Building Your Portfolio',
          description: 'Create a compelling portfolio that attracts high-quality clients',
          duration: '2h 45m',
          videos: 8,
          progress: 100,
          completed: true,
          completedDate: '2024-03-15',
          goalTrack: 'agency',
          goalLevel: '$2K',
          instructor: 'Mahtab Alam',
          category: 'marketing',
          order: 2,
          actions: ['Create case studies', 'Showcase best work', 'Write project descriptions', 'Get client testimonials', 'Launch portfolio site'],
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
          duration: '6h 30m',
          videos: 18,
          progress: 100,
          completed: true,
          completedDate: '2024-01-20',
          goalTrack: 'agency',
          goalLevel: '$1K',
          instructor: 'Mahtab Alam',
          category: 'service-delivery',
          order: 1,
          actions: ['Learn AI prompting', 'Code with Claude assistance', 'Build first project', 'Join community', 'Complete challenges']
        }
      ]
    }
  ]

  const allCourses = mockCoursesByGoal.flatMap(goal => goal.courses)
  
  const filteredCourses = allCourses.filter(course => {
    switch (filter) {
      case 'completed':
        return course.completed
      case 'in-progress':
        return !course.completed && course.progress > 0
      case 'not-started':
        return !course.completed && course.progress === 0
      case 'sales':
        return course.category === 'sales'
      case 'service-delivery':
        return course.category === 'service-delivery'
      case 'marketing':
        return course.category === 'marketing'
      case 'current-goal':
        return mockCoursesByGoal.find(g => g.status === 'current')?.courses.includes(course)
      default:
        return true
    }
  })

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sort) {
      case 'progress':
        return b.progress - a.progress
      case 'duration':
        return parseInt(a.duration) - parseInt(b.duration)
      case 'videos':
        return b.videos - a.videos
      default: // goal-order
        const aGoal = mockCoursesByGoal.find(g => g.courses.includes(a))
        const bGoal = mockCoursesByGoal.find(g => g.courses.includes(b))
        if (aGoal?.status !== bGoal?.status) {
          const statusOrder = { 'current': 1, 'completed': 2, 'upcoming': 3 }
          return statusOrder[aGoal?.status || 'upcoming'] - statusOrder[bGoal?.status || 'upcoming']
        }
        return a.order - b.order
    }
  })

  const getDisplayName = () => {
    if (isOwnProfile) return 'Your'
    if (memberName) return `${memberName}'s`
    return 'Member'
  }


  const getStatusIcon = (course: Course) => {
    if (course.completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (course.progress > 0) {
      return <Play className="h-5 w-5 text-blue-500" />
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getDisplayName()} Course Journey
        </h2>
        <p className="text-gray-600">
          {isRestricted 
            ? 'See the structured learning path our members follow'
            : 'Progress through courses designed for your specific goal track'
          }
        </p>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Courses</option>
            <option value="current-goal">Current Goal</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="not-started">Not Started</option>
            <option value="sales">Sales</option>
            <option value="service-delivery">Service Delivery</option>
            <option value="marketing">Marketing</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="goal-order">Goal Order</option>
            <option value="progress">Progress</option>
            <option value="duration">Duration</option>
            <option value="videos">Video Count</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {sortedCourses.length} courses
        </div>
      </div>

      {/* Courses by Goal */}
      <div className="space-y-8">
        {mockCoursesByGoal.map((goalGroup) => (
          <div key={goalGroup.goalLevel} className="space-y-4">
            {/* Goal Header */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                goalGroup.status === 'current' 
                  ? 'bg-blue-100 text-blue-800' 
                  : goalGroup.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <Target className="h-4 w-4" />
                <span className="font-medium">
                  {isRestricted ? `${goalGroup.goalLevel} Agency Track` : goalGroup.goalTitle}
                </span>
                {goalGroup.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                {goalGroup.status === 'current' && <TrendingUp className="h-4 w-4" />}
              </div>
              
              <div className="text-sm text-gray-500">
                {goalGroup.courses.length} course{goalGroup.courses.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goalGroup.courses
                .filter(course => filter === 'all' || 
                  (filter === 'completed' && course.completed) ||
                  (filter === 'in-progress' && !course.completed && course.progress > 0) ||
                  (filter === 'not-started' && !course.completed && course.progress === 0) ||
                  (filter === 'sales' && course.category === 'sales') ||
                  (filter === 'service-delivery' && course.category === 'service-delivery') ||
                  (filter === 'marketing' && course.category === 'marketing') ||
                  (filter === 'current-goal' && goalGroup.status === 'current'))
                .map((course) => (
                <div
                  key={course.id}
                  className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                    course.completed ? 'bg-green-50' : 
                    course.progress > 0 ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      course.category === 'sales' 
                        ? 'bg-green-100 text-green-800'
                        : course.category === 'service-delivery'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800' // marketing
                    }`}>
                      {course.category === 'sales' 
                        ? 'Sales'
                        : course.category === 'service-delivery'
                        ? 'Service Delivery'
                        : 'Marketing'
                      }
                    </span>
                    {isRestricted && !course.completed && (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {isRestricted ? 'Course content preview available to members only' : course.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>{course.duration}</span>
                    <span>{course.videos} videos</span>
                  </div>

                  {/* Actions Slider */}
                  {!isRestricted && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Actions in this course:</div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {course.actions.map((action, index) => (
                          <div
                            key={index}
                            className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full border"
                          >
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRestricted && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Actions in this course:</div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['Watch videos', 'Complete exercises', 'Build projects', '+ more'].map((action, index) => (
                          <div
                            key={index}
                            className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full border opacity-60"
                          >
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!course.completed && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            course.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {course.completed && course.completedDate && (
                    <div className="text-xs text-green-600 mb-3">
                      ✓ Completed {new Date(course.completedDate).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {course.completed ? (
                      <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors">
                        Review Course
                      </button>
                    ) : course.progress > 0 ? (
                      <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors">
                        Continue Learning
                      </button>
                    ) : (
                      <button 
                        className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                          isRestricted 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-black'
                        }`}
                        disabled={isRestricted}
                      >
                        {isRestricted ? 'Join to Access' : 'Start Course'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
          <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Access Full Course Library</h3>
          <p className="text-gray-600 mb-4">
            Follow the structured learning path designed for your specific goal track.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Join Community - $97/month
          </button>
        </div>
      )}
    </div>
  )
}