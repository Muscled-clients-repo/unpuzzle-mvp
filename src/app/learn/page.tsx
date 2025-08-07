import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { AICourseCard } from "@/components/course/ai-course-card"
import { LearningMetrics } from "@/components/dashboard/metrics-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { mockCourses, mockUsers } from "@/data/mock"
import { TrendingUp, Clock, Target, Calendar, BookOpen, Play } from "lucide-react"
import Link from "next/link"

export default function LearnDashboard() {
  const learner = mockUsers.learners[0]
  const enrolledCourses = mockCourses.filter(course => 
    learner.enrolledCourses.includes(course.id)
  )

  // Mock recent activity
  const recentActivity = [
    { type: "completed", course: "Web Development", lesson: "CSS Flexbox", time: "2 hours ago" },
    { type: "ai_hint", course: "Machine Learning", lesson: "Linear Regression", time: "1 day ago" },
    { type: "reflection", course: "Web Development", lesson: "JavaScript Functions", time: "2 days ago" },
    { type: "quiz", course: "Machine Learning", lesson: "NumPy Basics", time: "3 days ago" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      
      <div className="flex flex-1">
        <Sidebar role="learner" />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {learner.name}!</h1>
            <p className="text-muted-foreground">Continue your learning journey with AI-powered assistance</p>
          </div>

          {/* Learning Metrics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Learning Progress</h2>
            <LearningMetrics
              learnRate={learner.metrics.learnRate}
              executionRate={learner.metrics.executionRate}
              executionPace={learner.metrics.executionPace}
              totalWatchTime={learner.metrics.totalWatchTime}
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
                    progress={course.id === "course-1" ? 35 : 15}
                    aiMetrics={{
                      learnRate: course.id === "course-1" ? 42 : 28,
                      strugglingTopics: course.id === "course-1" ? ["CSS Grid"] : ["Linear Regression"],
                      predictedCompletion: course.id === "course-1" ? "2 weeks" : "5 weeks",
                      aiInteractionsUsed: course.id === "course-1" ? 15 : 8
                    }}
                  />
                ))}
                
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Discover More Courses</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Explore our catalog of AI-enhanced courses
                    </p>
                    <Button asChild>
                      <Link href="/courses">Browse Courses</Link>
                    </Button>
                  </CardContent>
                </Card>
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
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                        <div className={`rounded-full p-1 ${
                          activity.type === "completed" ? "bg-green-100 dark:bg-green-900/20" :
                          activity.type === "ai_hint" ? "bg-blue-100 dark:bg-blue-900/20" :
                          activity.type === "reflection" ? "bg-purple-100 dark:bg-purple-900/20" :
                          "bg-orange-100 dark:bg-orange-900/20"
                        }`}>
                          {activity.type === "completed" && <Target className="h-3 w-3 text-green-600 dark:text-green-400" />}
                          {activity.type === "ai_hint" && <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
                          {activity.type === "reflection" && <BookOpen className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                          {activity.type === "quiz" && <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {activity.type.replace("_", " ")} • {activity.lesson}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.course} • {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Learning Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This Week's Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Complete 3 lessons</span>
                        <span className="text-sm text-muted-foreground">2/3</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Study 5 hours</span>
                        <span className="text-sm text-muted-foreground">3.5/5h</span>
                      </div>
                      <Progress value={70} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Submit 2 reflections</span>
                        <span className="text-sm text-muted-foreground">1/2</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
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
                    <Link href="/learn/bookmarks">
                      <BookOpen className="mr-2 h-4 w-4" />
                      My Bookmarks
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/learn/reflections">
                      <Calendar className="mr-2 h-4 w-4" />
                      My Reflections
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}