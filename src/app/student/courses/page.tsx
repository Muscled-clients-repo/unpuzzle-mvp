"use client"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { getNextVideoForCourse, getCourseProgress } from '@/app/actions/student-course-actions'
import { useWebSocketConnection } from '@/hooks/use-websocket-connection'
import { courseEventObserver, STUDENT_EVENTS, COURSE_GOAL_EVENTS } from '@/lib/course-event-observer'
import { CourseThumbnail } from '@/components/ui/course-thumbnail'

export default function MyCoursesPage() {
  const { user, profile } = useAppStore()
  const queryClient = useQueryClient()

  // Get authenticated user ID
  const userId = user?.id || profile?.id

  // WebSocket connection for real-time updates
  useWebSocketConnection(userId || '')

  // ARCHITECTURE-COMPLIANT: TanStack Query for server state
  const { data: coursesResult, isLoading, error } = useQuery({
    queryKey: ['user-courses', userId],
    queryFn: getUserCoursesAction,
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
          queryClient.invalidateQueries({ queryKey: ['user-courses', userId] })
        }
      }
    )

    const unsubscribeCourseGoalAssignment = courseEventObserver.subscribe(
      COURSE_GOAL_EVENTS.ASSIGNMENT_CHANGED,
      (event) => {
        // Invalidate for all students since course-goal assignments affect course visibility
        console.log('🔄 [WEBSOCKET] Course-goal assignment changed, invalidating user courses cache')
        queryClient.invalidateQueries({ queryKey: ['user-courses', userId] })
      }
    )

    return () => {
      unsubscribeGoalReassignment()
      unsubscribeCourseGoalAssignment()
    }
  }, [userId, queryClient])

  // Extract courses from server action result
  const courses = coursesResult?.success ? coursesResult.data : []

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

          {/* Course Tabs */}
          <Tabs defaultValue="all" className="mb-8">
            <TabsList>
              <TabsTrigger value="all">All Courses ({displayCourses.length})</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress ({displayCourses.filter(c => c.progress?.progress > 0 && c.progress?.progress < 100).length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({displayCourses.filter(c => c.progress?.progress === 100).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayCourses.map((course) => {
                  const progress = course.progress || {
                    progress: 0,
                    lastAccessed: "Never",
                    completedLessons: 0,
                    totalLessons: course.total_videos || 0,
                    currentLesson: "Not started",
                    estimatedTimeLeft: `${course.total_duration_minutes || 60} min`,
                    nextVideoId: undefined
                  }
                  
                  return (
                    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Course Thumbnail */}
                      <div className="relative">
                        <CourseThumbnail title={course.title} />
                        {/* Progress Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                          <Progress value={progress.progress} className="h-2" />
                          <p className="text-xs text-white mt-1">{progress.progress}% Complete</p>
                        </div>
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
                        {/* Current Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current Lesson</span>
                            <span className="font-medium">{progress.currentLesson}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Completed</span>
                            <span className="font-medium">{progress.completedLessons}/{progress.totalLessons} lessons</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time left</span>
                            <span className="font-medium">{progress.estimatedTimeLeft}</span>
                          </div>
                        </div>

                        {/* AI Insights */}
                        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Learning Progress
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress.progress}%</span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Completed</span>
                              <span className="font-medium">{progress.completedLessons}/{progress.totalLessons}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <Target className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground">Current: {progress.currentLesson}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button asChild className="w-full">
                          <Link href={
                            progress.nextVideoId
                              ? `/student/course/${course.id}/video/${progress.nextVideoId}`
                              : `/student/course/${course.id}`
                          }>
                            <Play className="mr-2 h-4 w-4" />
                            Continue Learning
                          </Link>
                        </Button>

                        {/* Last Accessed */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last accessed {progress.lastAccessed}
                        </div>
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
            </TabsContent>

            <TabsContent value="in-progress" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayCourses
                  .filter(course => course.progress?.progress > 0 && course.progress?.progress < 100)
                  .map((course) => {
                    const progress = course.progress!

                    return (
                      <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Course Thumbnail */}
                        <div className="relative">
                          <CourseThumbnail title={course.title} />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                            <Progress value={progress.progress} className="h-2" />
                            <p className="text-xs text-white mt-1">{progress.progress}% Complete</p>
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {progress.completedLessons}/{progress.totalLessons} lessons • {progress.estimatedTimeLeft} left
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Button asChild className="w-full">
                            <Link href={
                              progress.nextVideoId
                                ? `/student/course/${course.id}/video/${progress.nextVideoId}`
                                : `/student/course/${course.id}`
                            }>
                              <Play className="mr-2 h-4 w-4" />
                              Continue Learning
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
              {displayCourses.filter(c => c.progress?.progress > 0 && c.progress?.progress < 100).length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Courses in Progress</h3>
                  <p className="text-muted-foreground mb-4">
                    Start learning by clicking "Continue Learning" on any course!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {displayCourses.filter(c => c.progress?.progress === 100).length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {displayCourses
                    .filter(course => course.progress?.progress === 100)
                    .map((course) => {
                      const progress = course.progress!

                      return (
                        <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow border-green-200 dark:border-green-800">
                          {/* Course Thumbnail */}
                          <div className="relative">
                            <CourseThumbnail title={course.title} />
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Completed
                              </Badge>
                            </div>
                          </div>
                          <CardHeader>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {progress.totalLessons} lessons completed
                            </p>
                          </CardHeader>
                          <CardContent>
                            <Button asChild className="w-full" variant="outline">
                              <Link href={`/student/course/${course.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Review Course
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Courses Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Keep learning to complete your first course!
                  </p>
                  <Button asChild>
                    <Link href="/student">
                      Go to Dashboard
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Learning Stats Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{courses.length}</p>
                    <p className="text-xs text-muted-foreground">Active Courses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">6</p>
                    <p className="text-xs text-muted-foreground">Lessons Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-xs text-muted-foreground">AI Interactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12.5h</p>
                    <p className="text-xs text-muted-foreground">Total Study Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </ErrorBoundary>
  )
}