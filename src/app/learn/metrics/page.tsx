import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { MetricWidget, LearningMetrics } from "@/components/dashboard/metrics-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { mockUsers, mockCourses } from "@/data/mock"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  Clock, 
  Award,
  Activity,
  Zap,
  Calendar,
  BarChart3
} from "lucide-react"

export default function MetricsPage() {
  const learner = mockUsers.learners[0]

  // Mock weekly data
  const weeklyData = [
    { week: "Week 1", learnRate: 28, executionRate: 75, aiInteractions: 12 },
    { week: "Week 2", learnRate: 32, executionRate: 82, aiInteractions: 18 },
    { week: "Week 3", learnRate: 35, executionRate: 85, aiInteractions: 15 },
    { week: "Week 4", learnRate: 42, executionRate: 89, aiInteractions: 22 },
  ]

  // Mock course-specific metrics
  const courseMetrics = [
    {
      course: "Introduction to Web Development",
      progress: 35,
      learnRate: 42,
      aiInteractions: 15,
      strugglingTopics: ["CSS Grid", "JavaScript Functions"],
      timeSpent: 180,
      lastAccessed: "2 hours ago"
    },
    {
      course: "Machine Learning Fundamentals", 
      progress: 15,
      learnRate: 28,
      aiInteractions: 8,
      strugglingTopics: ["Linear Regression", "NumPy Arrays"],
      timeSpent: 90,
      lastAccessed: "1 day ago"
    }
  ]

  // Mock achievements
  const achievements = [
    { id: 1, title: "First Steps", description: "Completed your first lesson", icon: "🎯", earned: true },
    { id: 2, title: "AI Explorer", description: "Used AI hints 10 times", icon: "🤖", earned: true },
    { id: 3, title: "Consistent Learner", description: "7-day learning streak", icon: "🔥", earned: false },
    { id: 4, title: "Reflection Master", description: "Submitted 5 reflections", icon: "💭", earned: false },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      
      <div className="flex flex-1">
        <Sidebar role="learner" />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Learning Analytics</h1>
            <p className="text-muted-foreground">Track your progress and optimize your learning with AI insights</p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">By Course</TabsTrigger>
              <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {/* Main Metrics */}
              <div className="mb-8">
                <LearningMetrics
                  learnRate={learner.metrics.learnRate}
                  executionRate={learner.metrics.executionRate}
                  executionPace={learner.metrics.executionPace}
                  totalWatchTime={learner.metrics.totalWatchTime}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Weekly Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Weekly Trends
                    </CardTitle>
                    <CardDescription>Your learning progress over the past 4 weeks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {weeklyData.map((week, index) => (
                        <div key={week.week} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{week.week}</span>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <span>{week.learnRate} min/hr</span>
                              <span>{week.executionRate}% completion</span>
                              <span>{week.aiInteractions} AI hints</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Progress value={week.learnRate} className="flex-1 h-2" />
                            <Progress value={week.executionRate} className="flex-1 h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Performance Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Improving Learning Rate</p>
                        <p className="text-sm text-green-600 dark:text-green-400">+4 min/hr increase this week</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">Execution Rate Goal</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">5% away from 90% target</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                      <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">Response Time</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Faster than 70% of learners</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="mt-6">
              <div className="space-y-6">
                {courseMetrics.map((course) => (
                  <Card key={course.course}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{course.course}</CardTitle>
                        <Badge variant="outline">{course.progress}% Complete</Badge>
                      </div>
                      <Progress value={course.progress} className="mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-4">
                        <MetricWidget
                          title="Learn Rate"
                          value={`${course.learnRate} min/hr`}
                          icon={<Activity className="h-4 w-4" />}
                          variant={course.learnRate >= 35 ? "success" : "warning"}
                        />
                        <MetricWidget
                          title="AI Interactions"
                          value={course.aiInteractions}
                          icon={<Zap className="h-4 w-4" />}
                        />
                        <MetricWidget
                          title="Time Spent"
                          value={`${Math.floor(course.timeSpent / 60)}h ${course.timeSpent % 60}m`}
                          icon={<Clock className="h-4 w-4" />}
                        />
                        <MetricWidget
                          title="Last Activity"
                          value={course.lastAccessed}
                          icon={<Calendar className="h-4 w-4" />}
                        />
                      </div>
                      
                      {course.strugglingTopics.length > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-start gap-2">
                            <Brain className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">
                                AI detected challenging topics:
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {course.strugglingTopics.map((topic) => (
                                  <Badge key={topic} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ai-insights" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Usage Patterns</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hints Requested</span>
                      <span className="font-medium">23 times</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quizzes Completed</span>
                      <span className="font-medium">8 times</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Reflections Submitted</span>
                      <span className="font-medium">1 time</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Adaptive Content Triggered</span>
                      <span className="font-medium">3 times</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Learning Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">Study Schedule</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        You learn best between 2-4 PM. Consider scheduling sessions then.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <p className="font-medium text-green-800 dark:text-green-200 text-sm">Content Preference</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        You engage more with hands-on exercises than theory videos.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <p className="font-medium text-purple-800 dark:text-purple-200 text-sm">Difficulty Sweet Spot</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        You perform best with medium complexity topics (6-7/10).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {achievements.map((achievement) => (
                  <Card key={achievement.id} className={`${
                    achievement.earned 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800' 
                      : 'opacity-60'
                  }`}>
                    <CardContent className="pt-6 text-center">
                      <div className="text-4xl mb-3">{achievement.icon}</div>
                      <h3 className="font-semibold mb-1">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      {achievement.earned && (
                        <Badge className="mt-3" variant="default">
                          <Award className="mr-1 h-3 w-3" />
                          Earned
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}