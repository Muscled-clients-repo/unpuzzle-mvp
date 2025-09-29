"use client"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common"
import { ErrorFallback } from "@/components/common"
import {
  BookOpen,
  Clock,
  TrendingUp,
  AlertCircle,
  Play,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  Target,
  Brain,
  Sparkles,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserCoursesAction } from '@/app/actions/course-actions'
import { getStudentCoursesWithJunctionTable } from '@/app/actions/student-course-actions-junction'
import { useWebSocketConnection } from '@/hooks/use-websocket-connection'
import { courseEventObserver, STUDENT_EVENTS, COURSE_GOAL_EVENTS } from '@/lib/course-event-observer'
import { CourseThumbnail } from '@/components/ui/course-thumbnail'

export default function MyCoursesPage() {
  const { user, profile } = useAppStore()
  const queryClient = useQueryClient()

  // Get authenticated user ID
  const userId = user?.id || profile?.id

  console.log('[Student Courses] User state:', { user: user?.id, profile: profile?.id, userId })

  // WebSocket connection for real-time updates
  useWebSocketConnection(userId || '')

  // ARCHITECTURE-COMPLIANT: TanStack Query for server state
  const { data: coursesResult, isLoading, error } = useQuery({
    queryKey: ['student-courses-junction', userId],
    queryFn: getStudentCoursesWithJunctionTable,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Listen for goal reassignment and course-goal assignment events and invalidate course data
  useEffect(() => {
    if (!userId) return

    const unsubscribeGoalReassignment = courseEventObserver.subscribe(
      STUDENT_EVENTS.GOAL_REASSIGNMENT,
      (event) => {
        // Only invalidate if this event is for the current user
        if (event.data.userId === userId) {
          console.log('🔄 [WEBSOCKET] Goal reassignment detected, invalidating user courses cache')
          queryClient.invalidateQueries({ queryKey: ['student-courses-junction', userId] })
        }
      }
    )

    const unsubscribeCourseGoalAssignment = courseEventObserver.subscribe(
      COURSE_GOAL_EVENTS.ASSIGNMENT_CHANGED,
      (event) => {
        // Invalidate for all students since course-goal assignments affect course visibility
        console.log('🔄 [WEBSOCKET] Course-goal assignment changed, invalidating user courses cache')
        queryClient.invalidateQueries({ queryKey: ['student-courses-junction', userId] })
      }
    )

    return () => {
      unsubscribeGoalReassignment()
      unsubscribeCourseGoalAssignment()
    }
  }, [userId, queryClient])

  // Extract courses from junction table action (returns courses directly)
  const courses = coursesResult || []

  // Get real course progress and next videos for each course
  const { data: coursesWithProgress } = useQuery({
    queryKey: ['courses-with-progress', courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return []

      const coursesWithProgressData = await Promise.all(
        courses.map(async (course) => {
          const [progress, nextVideo] = await Promise.all([
            getCourseProgress(course.id),
            getNextVideoForCourse(course.id)
          ])

          return {
            ...course,
            progress: progress ? {
              progress: progress.progressPercentage,
              lastAccessed: new Date(progress.lastAccessedAt).toLocaleDateString(),
              completedLessons: progress.completedLessons,
              totalLessons: progress.totalLessons,
              currentLesson: nextVideo?.title || "Not started",
              estimatedTimeLeft: progress.estimatedTimeRemaining,
              nextVideoId: nextVideo?.videoId
            } : {
              progress: 0,
              lastAccessed: "Never",
              completedLessons: 0,
              totalLessons: course.videos?.length || 0,
              currentLesson: "Not started",
              estimatedTimeLeft: `${course.duration || 60} min`,
              nextVideoId: course.videos?.[0]?.id
            }
          }
        })
      )

      return coursesWithProgressData
    },
    enabled: !!courses.length && !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Use courses with progress data, fallback to basic courses
  const displayCourses = coursesWithProgress || courses
  
  if (isLoading) return <LoadingSpinner />

  if (error) return <ErrorFallback error={error} />

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Courses</h1>
            <p className="text-muted-foreground">
              Continue your learning journey with personalized AI assistance
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your courses..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Available Courses */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Available Courses ({displayCourses.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayCourses.map((course) => {
                return (
                  <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Course Thumbnail */}
                    <div className="relative">
                      <CourseThumbnail title={course.title} />
                    </div>

                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                            <CardDescription className="mt-1">
                              By {course.instructor?.name || "Instructor"}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {course.tags?.[0] || 'Course'}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Course Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Lessons</span>
                            <span className="font-medium">{course.total_videos || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{course.total_duration_minutes || 60} min</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Difficulty</span>
                            <span className="font-medium capitalize">{course.difficulty || 'Beginner'}</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button asChild className="w-full">
                          <Link href={`/student/course/${course.id}`}>
                            <Play className="mr-2 h-4 w-4" />
                            Start Learning
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Add More Courses Card */}
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                  <Link href="/courses" className="flex h-full items-center justify-center p-12">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1">Explore More Courses</h3>
                      <p className="text-sm text-muted-foreground">
                        Discover new topics to learn
                      </p>
                    </div>
                  </Link>
                </Card>
              </div>
            </div>

      </div>
    </ErrorBoundary>
  )
}
