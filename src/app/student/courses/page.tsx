"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/stores/app-store"
import { StudentCoursesSkeleton } from "@/components/common/CourseCardSkeleton"
import { ErrorFallback, LoadingSpinner } from "@/components/common"
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
  XCircle,
  LoaderIcon
} from "lucide-react"
import Link from "next/link"

export default function MyCoursesPage() {
  const {
    enrolledCourses = [], // Default to empty array
    courseProgress = {}, // Default to empty object
    loading,
    error,
    unenrollingCourseId,
    loadingProgressCourseId,
    loadEnrolledCourses,
    loadCourseProgress,
    unenrollFromCourse
  } = useAppStore()
  
  const userId = 'user-1' // In production, get from auth context
  const [attemptedProgressLoads, setAttemptedProgressLoads] = useState<Set<string>>(new Set())
  
  // Ensure enrolledCourses is always an array (extra safety check)
  const safeEnrolledCourses = useMemo(() => {
    return Array.isArray(enrolledCourses) ? enrolledCourses : []
  }, [enrolledCourses])
  
  useEffect(() => {
    loadEnrolledCourses(userId)
  }, [userId, loadEnrolledCourses])
  
  useEffect(() => {
    // Load progress for each enrolled course
    safeEnrolledCourses.forEach(course => {
      // Only attempt to load if we haven't tried before and aren't currently loading
      if (!courseProgress[course.id] && 
          !loadingProgressCourseId && 
          !attemptedProgressLoads.has(course.id)) {
        // Mark as attempted to prevent infinite retries on error
        setAttemptedProgressLoads(prev => new Set(prev).add(course.id))
        // Call with only courseId - backend extracts userId from token
        loadCourseProgress(course.id)
      }
    })
  }, [enrolledCourses, safeEnrolledCourses, courseProgress, loadingProgressCourseId, loadCourseProgress, attemptedProgressLoads])
  
  // Helper function to format last accessed time
  const formatLastAccessed = (dateString: string | undefined) => {
    if (!dateString) return "Not started"
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return "1 day ago"
    return `${diffDays} days ago`
  }

  const handleUnenroll = async (courseId: string) => {
    if (confirm('Are you sure you want to unenroll from this course?')) {
      await unenrollFromCourse(courseId)
    }
  }
  
  if (loading) {
    return (
      <div className="flex-1 p-6">
        <StudentCoursesSkeleton />
      </div>
    )
  }
  
  if (error) return <ErrorFallback error={error} />

  return (
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
              <TabsTrigger value="all">All Courses ({safeEnrolledCourses.length})</TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({safeEnrolledCourses.filter(course => {
                  const progress = courseProgress[course.id]
                  return progress && progress.percentComplete > 0 && progress.percentComplete < 100
                }).length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({safeEnrolledCourses.filter(course => {
                  const progress = courseProgress[course.id]
                  return progress && progress.percentComplete === 100
                }).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {safeEnrolledCourses.map((course) => {
                  const progress = courseProgress[course.id] || {
                    percentComplete: 0,
                    lastAccessedAt: undefined,
                    videosCompleted: 0,
                    totalVideos: course.videos?.length || 0
                  }
                  
                  // Calculate display values
                  const displayProgress = {
                    progress: progress.percentComplete || 0,
                    lastAccessed: formatLastAccessed(progress.lastAccessedAt),
                    completedLessons: progress.videosCompleted || 0,
                    totalLessons: progress.totalVideos || course.videos?.length || 0,
                    currentLesson: course.videos?.[progress.videosCompleted]?.title || "Not started",
                    estimatedTimeLeft: `${Math.max(1, Math.ceil((course.duration || 0) * (1 - (progress.percentComplete || 0) / 100)))} hours`,
                    aiInteractionsUsed: 0, // This would come from a separate API
                    strugglingTopics: [] as string[], // This would come from analytics
                    nextMilestone: progress.videosCompleted === 0 ? "Start the course" : 
                                  progress.percentComplete >= 80 ? "Complete final project" : 
                                  `Complete Module ${Math.floor(progress.videosCompleted / 3) + 1}`
                  }
                  
                  return (
                    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Course Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                        {/* Progress Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                          <Progress value={displayProgress.progress} className="h-2" />
                          <p className="text-xs text-white mt-1">{displayProgress.progress}% Complete</p>
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
                            {course.difficulty}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Current Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current Lesson</span>
                            <span className="font-medium">{displayProgress.currentLesson}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Completed</span>
                            <span className="font-medium">{displayProgress.completedLessons}/{displayProgress.totalLessons} lessons</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time left</span>
                            <span className="font-medium">{displayProgress.estimatedTimeLeft}</span>
                          </div>
                        </div>

                        {/* AI Insights */}
                        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI Insights
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">AI interactions used</span>
                              <span className="font-medium">{displayProgress.aiInteractionsUsed}</span>
                            </div>
                            
                            {displayProgress.strugglingTopics.length > 0 && (
                              <div className="flex items-start gap-2 text-xs">
                                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">Needs review: </span>
                                  <span className="text-orange-600 dark:text-orange-400">
                                    {displayProgress.strugglingTopics.join(", ")}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Target className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground">Next: {displayProgress.nextMilestone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button asChild className="flex-1">
                            <Link href={`/student/courses/learn/${course.id}?v=${course.videos?.[displayProgress.completedLessons]?.id || course.videos?.[0]?.id || '1'}`}>
                              <Play className="mr-2 h-4 w-4" />
                              Continue
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleUnenroll(course.id)}
                            disabled={unenrollingCourseId === course.id}
                          >
                            {unenrollingCourseId === course.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Last Accessed */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last accessed {displayProgress.lastAccessed}
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
                {safeEnrolledCourses.filter(course => {
                  const progress = courseProgress[course.id]
                  return progress && progress.percentComplete > 0 && progress.percentComplete < 100
                }).map((course) => {
                  const progress = courseProgress[course.id] || {
                    percentComplete: 0,
                    lastAccessedAt: undefined,
                    videosCompleted: 0,
                    totalVideos: course.videos?.length || 0
                  }
                  
                  const displayProgress = {
                    progress: progress.percentComplete || 0,
                    lastAccessed: formatLastAccessed(progress.lastAccessedAt),
                    completedLessons: progress.videosCompleted || 0,
                    totalLessons: progress.totalVideos || course.videos?.length || 0
                  }
                  
                  return (
                    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Same card content as above */}
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                          <Progress value={displayProgress.progress} className="h-2" />
                          <p className="text-xs text-white mt-1">{displayProgress.progress}% Complete</p>
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="w-full">
                          <Link href={`/student/courses/learn/${course.id}`}>
                            Continue Learning
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {safeEnrolledCourses.filter(course => {
                const progress = courseProgress[course.id]
                return progress && progress.percentComplete === 100
              }).length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {safeEnrolledCourses.filter(course => {
                    const progress = courseProgress[course.id]
                    return progress && progress.percentComplete === 100
                  }).map((course) => {
                    const progress = courseProgress[course.id]
                    return (
                      <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative aspect-video bg-gradient-to-br from-green-500/20 to-green-600/20">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                          </div>
                        </div>
                        <CardHeader>
                          <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Completed</span>
                              <span className="font-medium text-green-600">100%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Finished</span>
                              <span className="font-medium">{formatLastAccessed(progress?.lastAccessedAt)}</span>
                            </div>
                          </div>
                          <Button asChild className="w-full" variant="outline">
                            <Link href={`/student/courses/${course.id}/certificate`}>
                              View Certificate
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
                    <p className="text-2xl font-bold">{safeEnrolledCourses.length}</p>
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
  )
}