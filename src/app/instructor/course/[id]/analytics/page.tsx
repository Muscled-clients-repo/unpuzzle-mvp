"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  MessageCircle,
  Brain,
  Target,
  BarChart3,
  Activity,
  ChevronRight,
  Flame
} from "lucide-react"
import Link from "next/link"

export default function CourseAnalyticsPage() {
  const params = useParams()
  const courseId = params.id as string
  const { courseAnalytics, getConfusionHeatmap, loadInstructorData } = useAppStore()
  const [selectedTab, setSelectedTab] = useState("overview")

  useEffect(() => {
    loadInstructorData()
  }, [loadInstructorData])

  const course = courseAnalytics.find(c => c.courseId === courseId)
  const heatmapData = getConfusionHeatmap(courseId)

  if (!course) {
    return <div>Loading course analytics...</div>
  }

  // Generate mock timeline data for visualization
  const timelineData = Array.from({ length: 20 }, (_, i) => {
    const time = `${Math.floor(i * 3)}:${(i * 3 % 60).toString().padStart(2, '0')}`
    const existingPoint = heatmapData.find(h => h.time === time)
    return {
      time,
      count: existingPoint?.count || Math.floor(Math.random() * 10)
    }
  })

  const maxCount = Math.max(...timelineData.map(d => d.count))

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/instructor" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <span>{course.courseName}</span>
          </div>
          <h1 className="text-3xl font-bold">{course.courseName} Analytics</h1>
          <p className="text-muted-foreground">
            {course.activeStudents} active students • {course.totalStudents} total enrolled
          </p>
        </div>
        <Button asChild>
          <Link href={`/instructor/course/${courseId}/edit`}>
            Edit Course
          </Link>
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Learn Rate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.avgLearnRate} min/hr</div>
            <p className="text-xs text-muted-foreground">+5% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.completionRate}%</div>
            <Progress value={course.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.avgProgress}%</div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${course.revenue.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">${course.revenue.thisMonth} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.confusions.filter(c => !c.resolved).length}</div>
            <p className="text-xs text-muted-foreground">Needs response</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Confusion Heatmap</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="confusions">Confusions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Struggling Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Top Struggling Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.strugglingTopics.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${topic.resolved ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <div>
                        <p className="font-medium">{topic.topic}</p>
                        <p className="text-sm text-muted-foreground">At {topic.timestamp} in video</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={topic.resolved ? "secondary" : "destructive"}>
                        {topic.studentCount} students struggling
                      </Badge>
                      {!topic.resolved && (
                        <Button size="sm" variant="outline">
                          Address Issue
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Student Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span>Sarah posted a confusion at 12:30</span>
                  </div>
                  <span className="text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <span>Mike's learn rate improved to 48 min/hr</span>
                  </div>
                  <span className="text-muted-foreground">3 hours ago</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span>Emma completed Module 3</span>
                  </div>
                  <span className="text-muted-foreground">5 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confusion Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualize where students are getting stuck in your course
              </p>
            </CardHeader>
            <CardContent>
              {/* Heatmap Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Video Timeline</span>
                  <span>Student Confusions</span>
                </div>
                
                {/* Timeline bars */}
                <div className="space-y-2">
                  {timelineData.map((point, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">{point.time}</span>
                      <div className="flex-1 h-8 bg-muted rounded-md relative overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full transition-all ${
                            point.count > maxCount * 0.7 ? 'bg-red-500' :
                            point.count > maxCount * 0.4 ? 'bg-orange-500' :
                            point.count > 0 ? 'bg-yellow-500' : ''
                          }`}
                          style={{ width: `${(point.count / maxCount) * 100}%` }}
                        />
                        {point.count > 0 && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                            {point.count} students
                          </span>
                        )}
                      </div>
                      {point.count > maxCount * 0.7 && (
                        <Badge variant="destructive" className="text-xs">
                          <Flame className="h-3 w-3 mr-1" />
                          Hot spot
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-yellow-500 rounded" />
                    <span>Low confusion (1-3 students)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-orange-500 rounded" />
                    <span>Medium confusion (4-6 students)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-500 rounded" />
                    <span>High confusion (7+ students)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions based on heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Critical: Address confusion at 12:30</p>
                    <p className="text-sm text-muted-foreground">87 students struggled with useCallback Hook</p>
                    <Button size="sm" variant="destructive" className="mt-2">
                      Create Supplemental Content
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Consider re-recording section at 45:20</p>
                    <p className="text-sm text-muted-foreground">45 students found Custom Hooks explanation unclear</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Review Feedback
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Sarah Chen', 'Mike Johnson', 'Emma Wilson', 'Alex Kim', 'Lisa Park'].map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Progress: {75 - i * 10}%</span>
                        <span>Learn Rate: {48 - i * 3} min/hr</span>
                        <span>Last active: {i + 1} hours ago</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confusions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Student Confusions</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{course.confusions.filter(c => c.resolved).length} resolved</Badge>
                  <Badge variant="destructive">{course.confusions.filter(c => !c.resolved).length} pending</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.confusions.map((confusion) => (
                  <div key={confusion.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{confusion.studentName}</span>
                        <Badge variant="outline">{confusion.videoTime}</Badge>
                        {confusion.resolved ? (
                          <Badge variant="secondary">Resolved in {confusion.responseTime}</Badge>
                        ) : (
                          <Badge variant="destructive">Needs response</Badge>
                        )}
                      </div>
                      <p className="text-sm">{confusion.message}</p>
                      <p className="text-xs text-muted-foreground">{confusion.timestamp}</p>
                    </div>
                    {!confusion.resolved && (
                      <Button size="sm">
                        Respond
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}