"use client"

import { useParams } from "next/navigation"
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common"
import { ErrorFallback } from "@/components/common"
import {
  BookOpen,
  Clock,
  Play,
  CheckCircle2,
  ArrowLeft,
  User,
  BarChart3,
  Target
} from "lucide-react"
import Link from "next/link"
import { useQuery } from '@tanstack/react-query'
import { getEnrolledCourses, getNextVideoForCourse, getCourseProgress } from '@/app/actions/student-course-actions'
import { useWebSocketConnection } from '@/hooks/use-websocket-connection'
import { CourseThumbnail } from '@/components/ui/course-thumbnail'

export default function StudentCourseOverviewPage() {
  const params = useParams()
  const courseId = params.id as string
  const { user, profile } = useAppStore()

  // Get authenticated user ID
  const userId = user?.id || profile?.id

  // WebSocket connection for real-time updates
  useWebSocketConnection(userId || '')

  // ARCHITECTURE-COMPLIANT: TanStack Query for server state with videos
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['enrolled-courses', userId],
    queryFn: getEnrolledCourses,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Get course progress and next video
  const { data: courseData, isLoading: progressLoading } = useQuery({
    queryKey: ['course-overview', courseId, userId],
    queryFn: async () => {
      if (!courseId) return null

      const [progress, nextVideo] = await Promise.all([
        getCourseProgress(courseId),
        getNextVideoForCourse(courseId)
      ])

      return { progress, nextVideo }
    },
    enabled: !!courseId && !!userId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  })

  // Extract course from enrolled courses (includes videos)
  const course = courses?.find(c => c.id === courseId)

  const isLoading = coursesLoading || progressLoading

  if (isLoading) return <LoadingSpinner />

  if (!course) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
              <p className="text-muted-foreground mb-4">
                This course may not be available or you may not have access to it.
              </p>
              <Button asChild>
                <Link href="/student/courses">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
                </Link>
              </Button>
            </div>
          </main>
        </div>
      </ErrorBoundary>
    )
  }

  const progress = courseData?.progress
  const nextVideo = courseData?.nextVideo

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">{course.description}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.total_duration_minutes || course.duration || 0} min</span>
                </div>
              </div>

              {/* Progress Overview */}
              {progress && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Course Completion</span>
                          <span className="font-medium">{progress.progressPercentage}%</span>
                        </div>
                        <Progress value={progress.progressPercentage} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Completed</span>
                          <p className="font-medium">{progress.completedLessons}/{progress.totalLessons} lessons</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time Remaining</span>
                          <p className="font-medium">{progress.estimatedTimeRemaining}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Course Thumbnail */}
            <div>
              <CourseThumbnail title={course.title} className="mb-6" />

              {/* Action Buttons */}
              <div className="space-y-3">
                {nextVideo ? (
                  <div className="space-y-2">
                    <Button asChild className="w-full" size="lg">
                      <Link href={`/student/course/${courseId}/video/${nextVideo.videoId}${nextVideo.resumeTimestamp ? `?t=${nextVideo.resumeTimestamp}` : ''}`}>
                        <Play className="mr-2 h-4 w-4" />
                        {nextVideo.isResuming
                          ? `Resume Learning (${Math.floor((nextVideo.resumeTimestamp || 0) / 60)}:${String(Math.floor((nextVideo.resumeTimestamp || 0) % 60)).padStart(2, '0')})`
                          : nextVideo.completionStatus === 'completed'
                            ? 'Review Course'
                            : progress?.progressPercentage > 0
                              ? 'Continue Learning'
                              : 'Start Course'
                        }
                      </Link>
                    </Button>
                    {nextVideo.isResuming && (
                      <p className="text-xs text-muted-foreground text-center">
                        Pick up where you left off in "{nextVideo.title}"
                      </p>
                    )}
                  </div>
                ) : course.videos && course.videos.length > 0 ? (
                  <Button asChild className="w-full" size="lg" variant="outline">
                    <Link href={`/student/course/${courseId}/video/${course.videos[0].id}`}>
                      <Play className="mr-2 h-4 w-4" />
                      Start Learning
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    <Play className="mr-2 h-4 w-4" />
                    No Videos Available
                  </Button>
                )}

                {progress?.progressPercentage === 100 && (
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Course Completed!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Content Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {course.videos && course.videos.length > 0 ? (
              <div className="space-y-2">
                {course.videos.map((video, index) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{video.title}</h4>
                        {video.description && (
                          <p className="text-sm text-muted-foreground">{video.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{Math.ceil((video.duration || 600) / 60)} min</span>
                      </div>

                      <Button size="sm" asChild>
                        <Link href={`/student/course/${courseId}/video/${video.id}`}>
                          <Play className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Content Available</h3>
                <p className="text-muted-foreground">
                  This course doesn't have any videos yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Video Suggestion */}
        {nextVideo && (
          <Card className="mt-6 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {nextVideo.isResuming ? 'Resume Video' : 'Up Next'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{nextVideo.title}</p>
                    {nextVideo.isResuming && nextVideo.resumeTimestamp && (
                      <p className="text-xs text-muted-foreground">
                        Resume at {Math.floor(nextVideo.resumeTimestamp / 60)}:
                        {String(Math.floor(nextVideo.resumeTimestamp % 60)).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>

                <Button asChild>
                  <Link href={`/student/course/${courseId}/video/${nextVideo.videoId}${nextVideo.resumeTimestamp ? `?t=${nextVideo.resumeTimestamp}` : ''}`}>
                    <Play className="mr-2 h-4 w-4" />
                    {nextVideo.isResuming ? 'Resume' : 'Continue'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  )
}