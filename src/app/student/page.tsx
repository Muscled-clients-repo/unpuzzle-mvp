"use client"

import { useEffect } from "react"
import { AICourseCard } from "@/components/course/ai-course-card"
import { LearningMetrics } from "@/components/dashboard/metrics-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/stores/app-store"
import { mockCourses, mockUsers } from "@/data/mock"
import { TrendingUp, Calendar, BookOpen, Brain, MessageSquare, CheckCircle2, Sparkles, Target, Users, Clock, ChevronRight } from "lucide-react"
import { useQuery } from '@tanstack/react-query'
import { getStudentTrackAssignments, getStudentPreferences, getFilteredCourses } from '@/lib/actions/track-actions'
import Link from "next/link"

export default function LearnDashboard() {
  const learner = mockUsers.learners?.[0]
  const { studentData, loadStudentData } = useAppStore()
  const enrolledCourses = mockCourses.filter(course =>
    learner?.coursesWithActiveGoals?.includes(course.id) || false
  )
  
  // Get track assignments
  const { data: trackAssignments } = useQuery({
    queryKey: ['student-track-assignments'],
    queryFn: getStudentTrackAssignments
  })

  // Get student preferences
  const { data: preferences } = useQuery({
    queryKey: ['student-preferences'],
    queryFn: getStudentPreferences
  })

  // Get filtered/recommended courses
  const { data: recommendedCourses } = useQuery({
    queryKey: ['filtered-courses'],
    queryFn: getFilteredCourses
  })
  
  useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  const hasSelectedTrack = trackAssignments && trackAssignments.length > 0
  const hasCompletedQuestionnaire = preferences?.completed_questionnaire

  const getFocusAreaIcon = (focusArea: string) => {
    switch (focusArea?.toLowerCase()) {
      case 'frontend': return '🎨'
      case 'backend': return '⚙️'
      case 'fullstack': return '🔄'
      case 'design': return '🎯'
      case 'mobile': return '📱'
      case 'devops': return '🚀'
      default: return '💻'
    }
  }

  // Use store data for recent activity
  const recentActivity = [
    { 
      type: "quiz", 
      course: "Web Development", 
      lesson: "CSS Grid Layout",
      score: "8/10",
      time: "30 minutes ago",
      details: "Puzzle Check quiz completed"
    },
    { 
      type: "reflection", 
      course: "Machine Learning", 
      lesson: "Neural Networks Introduction",
      status: "Instructor reviewed",
      time: "2 hours ago",
      details: "Video reflection submitted"
    },
    { 
      type: "quiz", 
      course: "Web Development", 
      lesson: "JavaScript Arrays",
      score: "10/10",
      time: "5 hours ago",
      details: "Perfect score achieved!"
    },
    { 
      type: "ai_hint", 
      course: "Machine Learning", 
      lesson: "Linear Regression",
      time: "1 day ago",
      details: "Used Puzzle Hint for gradient descent"
    },
    { 
      type: "reflection", 
      course: "Web Development", 
      lesson: "Responsive Design Principles",
      status: "Pending review",
      time: "1 day ago",
      details: "Audio reflection recorded"
    },
    { 
      type: "completed", 
      course: "Data Science", 
      lesson: "Pandas DataFrames",
      time: "2 days ago",
      details: "Lesson completed with AI assistance"
    },
    { 
      type: "quiz", 
      course: "Data Science", 
      lesson: "NumPy Basics",
      score: "7/10",
      time: "3 days ago",
      details: "Recommended review: array indexing"
    }
  ]

  return (
    <div className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {learner.name}!</h1>
            <p className="text-muted-foreground">Continue your learning journey with AI-powered assistance</p>
          </div>

          {/* Track Selection CTA */}
          {!hasSelectedTrack && (
            <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Choose Your Learning Track
                    </h3>
                    <p className="text-blue-700 dark:text-blue-200 text-sm mb-3">
                      {hasCompletedQuestionnaire 
                        ? "Select a learning track to get personalized course recommendations"
                        : "Take our questionnaire to get track recommendations tailored to your goals"
                      }
                    </p>
                    <div className="flex gap-2">
                      {!hasCompletedQuestionnaire && (
                        <Link href="/student/track-selection/questionnaire">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Take Questionnaire
                          </Button>
                        </Link>
                      )}
                      <Link href="/student/track-selection">
                        <Button size="sm" variant={hasCompletedQuestionnaire ? "default" : "outline"} 
                               className={hasCompletedQuestionnaire ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}>
                          Browse Tracks
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Tracks */}
          {hasSelectedTrack && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Your Learning Tracks
                  </CardTitle>
                  <Link href="/student/track-selection">
                    <Button variant="outline" size="sm">
                      Manage Tracks
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trackAssignments?.map(assignment => (
                    <div key={assignment.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl">
                        {getFocusAreaIcon(assignment.track?.focus_area || '')}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {assignment.track?.title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {assignment.assignment_type}
                          </Badge>
                          <span>•</span>
                          <span>{assignment.progress_percentage}% complete</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.track?.course_count} courses
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.track?.estimated_duration_weeks}w duration
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Learning Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Learning Progress</h2>
            <LearningMetrics
              learnRate={learner.metrics.learnRate}
              executionRate={learner.metrics.executionRate}
              executionPace={learner.metrics.executionPace}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Continue Learning */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
              <div className="space-y-6">
                {enrolledCourses.map((course) => (
                  <AICourseCard 
                    key={course.id}
                    course={course}
                    variant="enrolled"
                    userRole="student"
                    progress={course.id === "course-1" ? 35 : 15}
                    aiMetrics={{
                      learnRate: course.id === "course-1" ? 42 : 28,
                      strugglingTopics: course.id === "course-1" ? ["CSS Grid"] : ["Linear Regression"],
                      predictedCompletion: course.id === "course-1" ? "2 weeks" : "5 weeks",
                      aiInteractionsUsed: course.id === "course-1" ? 15 : 8
                    }}
                  />
                ))}
                
{/* Recommended Courses Section */}
                {hasSelectedTrack && recommendedCourses && recommendedCourses.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          Recommended for Your Track
                        </CardTitle>
                        <Link href="/student/courses">
                          <Button variant="outline" size="sm">
                            View All
                          </Button>
                        </Link>
                      </div>
                      <CardDescription>
                        Courses curated based on your {trackAssignments?.[0]?.track?.title} track
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendedCourses.slice(0, 4).map((course: any) => (
                          <div key={course.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              {course.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {course.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {course.estimated_duration || '4-6 hours'}
                              </div>
                              <Link href={`/student/course/${course.id}`}>
                                <Button size="sm" variant="outline">
                                  Start Learning
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {hasSelectedTrack ? "More Courses Coming Soon" : "Discover More Courses"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center">
                        {hasSelectedTrack 
                          ? "We're adding more courses to your track recommendations"
                          : "Explore our catalog of AI-enhanced courses"
                        }
                      </p>
                      <Button asChild>
                        <Link href={hasSelectedTrack ? "/student/track-selection" : "/student/courses"}>
                          {hasSelectedTrack ? "Browse Tracks" : "Browse Courses"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                        <div className={`rounded-full p-2 ${
                          activity.type === "completed" ? "bg-green-100 dark:bg-green-900/20" :
                          activity.type === "ai_hint" ? "bg-blue-100 dark:bg-blue-900/20" :
                          activity.type === "reflection" ? "bg-purple-100 dark:bg-purple-900/20" :
                          "bg-orange-100 dark:bg-orange-900/20"
                        }`}>
                          {activity.type === "completed" && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          {activity.type === "ai_hint" && <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                          {activity.type === "reflection" && <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                          {activity.type === "quiz" && <Brain className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {activity.type === "quiz" && "Quiz: "}
                                {activity.type === "reflection" && "Reflection: "}
                                {activity.type === "completed" && "Completed: "}
                                {activity.type === "ai_hint" && "AI Hint: "}
                                {activity.lesson}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {activity.course} • {activity.time}
                              </p>
                              {activity.details && (
                                <div className="text-xs mt-1 flex items-center flex-wrap gap-1">
                                  {activity.type === "quiz" && activity.score && (
                                    <span className={`font-medium ${
                                      activity.score === "10/10" ? "text-green-600 dark:text-green-400" :
                                      activity.score.startsWith("7") ? "text-yellow-600 dark:text-yellow-400" :
                                      "text-blue-600 dark:text-blue-400"
                                    }`}>
                                      Score: {activity.score} • 
                                    </span>
                                  )}
                                  {activity.type === "reflection" && activity.status && (
                                    <Badge variant={activity.status === "Instructor reviewed" ? "default" : "secondary"} className="h-5 text-xs">
                                      {activity.status}
                                    </Badge>
                                  )}
                                  <span className="text-muted-foreground">{activity.details}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/learn/metrics">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Detailed Metrics
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/student/reflections">
                      <Calendar className="mr-2 h-4 w-4" />
                      My Reflections
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  )
}