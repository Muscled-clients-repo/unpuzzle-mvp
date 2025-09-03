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
  Database,
  ToggleLeft,
  ToggleRight
} from "lucide-react"
import Link from "next/link"

// Feature flag for database usage
const USE_DATABASE = false // Set to true to use real database

export default function MyCoursesPageEnhanced() {
  const {
    // Original store methods (for mock data)
    enrolledCourses,
    courseProgress,
    
    // Enhanced store methods (for database)
    enrolledCoursesWithAnalytics,
    userStats,
    loadStudentLearningData,
    
    // Common
    loading,
    error,
    loadEnrolledCourses,
    loadCourseProgress,
    
    // Auth
    user,
    profile
  } = useAppStore()
  
  const [showDataSource, setShowDataSource] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Get user ID from auth or use mock
  const userId = user?.id || profile?.id || 'user-1'
  
  useEffect(() => {
    if (USE_DATABASE && loadStudentLearningData) {
      // Use new database method
      loadStudentLearningData(userId)
    } else {
      // Use original mock data methods
      loadEnrolledCourses(userId)
    }
  }, [userId, loadEnrolledCourses, loadStudentLearningData])
  
  useEffect(() => {
    // Load progress for each enrolled course (only for mock data)
    if (!USE_DATABASE) {
      (enrolledCourses || []).forEach(course => {
        loadCourseProgress(userId, course.id)
      })
    }
  }, [enrolledCourses, userId, loadCourseProgress])
  
  // Prepare data based on source
  const coursesData = USE_DATABASE 
    ? enrolledCoursesWithAnalytics || []
    : enrolledCourses || []
  
  // Mock progress data for non-database mode
  const mockProgressData = {
    "course-1": {
      progress: courseProgress?.percentComplete || 35,
      lastAccessed: "2 hours ago",
      completedLessons: courseProgress?.videosCompleted || 2,
      totalLessons: courseProgress?.totalVideos || 5,
      currentLesson: "JavaScript Basics",
      estimatedTimeLeft: "3.5 hours",
      aiInteractionsUsed: 15,
      strugglingTopics: ["CSS Grid", "Flexbox"],
      nextMilestone: "Complete Module 2"
    },
    "course-2": {
      progress: 15,
      lastAccessed: "1 day ago", 
      completedLessons: 1,
      totalLessons: 5,
      currentLesson: "Linear Regression",
      estimatedTimeLeft: "6 hours",
      aiInteractionsUsed: 8,
      strugglingTopics: ["Gradient Descent"],
      nextMilestone: "Complete first quiz"
    },
    "course-3": {
      progress: 60,
      lastAccessed: "3 days ago",
      completedLessons: 3,
      totalLessons: 5,
      currentLesson: "Data Visualization",
      estimatedTimeLeft: "2 hours",
      aiInteractionsUsed: 22,
      strugglingTopics: [],
      nextMilestone: "Final project"
    }
  }
  
  // Filter courses based on search
  const filteredCourses = coursesData.filter(courseData => {
    const course = USE_DATABASE ? courseData.course : courseData
    return course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })
  
  // Count courses by status
  const inProgressCount = USE_DATABASE
    ? coursesData.filter(c => c.progress > 0 && c.progress < 100).length
    : 2
  
  const completedCount = USE_DATABASE
    ? coursesData.filter(c => c.progress >= 100).length
    : 0
  
  if (loading) return <LoadingSpinner />
  
  if (error) return <ErrorFallback error={error} />

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold">My Courses</h1>
              {/* Data Source Indicator */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDataSource(!showDataSource)}
                className="flex items-center gap-2"
              >
                {USE_DATABASE ? (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Using Database</span>
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    <span>Using Mock Data</span>
                    <ToggleLeft className="h-4 w-4 text-gray-500" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-muted-foreground">
              Continue your learning journey with personalized AI assistance
            </p>
            
            {/* User Stats (only when using database) */}
            {USE_DATABASE && userStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{userStats.totalCoursesEnrolled}</div>
                    <p className="text-xs text-muted-foreground">Total Courses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{userStats.totalVideosCompleted}</div>
                    <p className="text-xs text-muted-foreground">Videos Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{userStats.totalWatchTimeFormatted}</div>
                    <p className="text-xs text-muted-foreground">Watch Time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{userStats.totalAIInteractions}</div>
                    <p className="text-xs text-muted-foreground">AI Interactions</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your courses..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <TabsTrigger value="all">All Courses ({filteredCourses.length})</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress ({inProgressCount})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((courseData) => {
                  // Extract data based on source
                  const course = USE_DATABASE ? courseData.course : courseData
                  const progress = USE_DATABASE 
                    ? {
                        progress: courseData.progress,
                        lastAccessed: courseData.lastAccessed,
                        completedLessons: courseData.completedLessons,
                        totalLessons: courseData.totalLessons,
                        currentLesson: courseData.currentLesson,
                        estimatedTimeLeft: courseData.estimatedTimeLeft,
                        aiInteractionsUsed: courseData.aiInteractionsUsed,
                        strugglingTopics: courseData.strugglingTopics,
                        nextMilestone: courseData.nextMilestone
                      }
                    : mockProgressData[course.id as keyof typeof mockProgressData] || {
                        progress: 0,
                        lastAccessed: "Never",
                        completedLessons: 0,
                        totalLessons: course.videos?.length || 5,
                        currentLesson: "Not started",
                        estimatedTimeLeft: `${course.duration} hours`,
                        aiInteractionsUsed: 0,
                        strugglingTopics: [],
                        nextMilestone: "Start course"
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
                            {course.difficulty}
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
                            AI Insights
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">AI interactions used</span>
                              <span className="font-medium">{progress.aiInteractionsUsed}</span>
                            </div>
                            
                            {progress.strugglingTopics.length > 0 && (
                              <div className="flex items-start gap-2 text-xs">
                                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground">Needs review: </span>
                                  <span className="text-orange-600 dark:text-orange-400">
                                    {progress.strugglingTopics.join(", ")}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Target className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground">Next: {progress.nextMilestone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button asChild className="w-full">
                          <Link href={`/student/course/${course.id}/video/${
                            USE_DATABASE && courseData.currentVideoId 
                              ? courseData.currentVideoId 
                              : course.videos?.[progress.completedLessons]?.id || course.videos?.[0]?.id || '1'
                          }`}>
                            <Play className="mr-2 h-4 w-4" />
                            Continue Learning
                          </Link>
                        </Button>

                        {/* Last Accessed */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last accessed {progress.lastAccessed}
                        </div>
                        
                        {/* Data Source Badge (debug only) */}
                        {showDataSource && (
                          <Badge variant="outline" className="text-xs">
                            {USE_DATABASE ? "From Database" : "Mock Data"}
                          </Badge>
                        )}
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
                {filteredCourses.filter(c => {
                  const progress = USE_DATABASE ? c.progress : mockProgressData[c.id]?.progress || 0
                  return progress > 0 && progress < 100
                }).map((courseData) => {
                  const course = USE_DATABASE ? courseData.course : courseData
                  const progress = USE_DATABASE ? courseData.progress : mockProgressData[course.id]?.progress || 0
                  
                  return (
                    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-white mt-1">{progress}% Complete</p>
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="w-full">
                          <Link href={`/student/course/${course.id}/video/${course.videos?.[0]?.id || '1'}`}>
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
              <div className="text-center py-12">
                <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Courses Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Keep learning to complete your first course!
                </p>
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </ErrorBoundary>
  )
}