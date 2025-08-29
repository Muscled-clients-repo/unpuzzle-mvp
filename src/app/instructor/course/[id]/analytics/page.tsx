"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  TrendingUp,
  Clock,
  MessageCircle,
  Brain,
  Target,
  ChevronRight,
  Play
} from "lucide-react"
import Link from "next/link"

export default function CourseAnalyticsPageClean() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { courseAnalytics, loadInstructorData } = useAppStore()
  const [selectedTab, setSelectedTab] = useState("overview")

  const handleViewVideoDetails = (videoId: string) => {
    // Navigate to video page in instructor mode with analytics context
    router.push(`/student/courses/learn/${videoId}?instructor=true&from=analytics&courseId=${courseId}`)
  }

  useEffect(() => {
    loadInstructorData()
  }, [loadInstructorData])

  const course = courseAnalytics.find(c => c.courseId === courseId)

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading course analytics...</div>
      </div>
    )
  }

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
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
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
          {/* Top Row: Struggling Topics and Recent Activity Side by Side */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Struggling Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Top Struggling Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.strugglingTopics.map((topic, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${topic.resolved ? 'bg-green-500' : 'bg-orange-500'} mt-2`} />
                        <div>
                          <p className="font-medium">{topic.topic}</p>
                          <p className="text-sm text-muted-foreground">At {topic.timestamp} in video</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={topic.resolved ? "secondary" : "destructive"} className="text-xs">
                          {topic.studentCount} students
                        </Badge>
                        {!topic.resolved && (
                          <Button size="sm" variant="outline" className="text-xs">
                            Address
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
                    <span className="text-muted-foreground">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span>Mike&apos;s learn rate improved to 48 min/hr</span>
                    </div>
                    <span className="text-muted-foreground">3h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <span>Emma completed Module 3</span>
                    </div>
                    <span className="text-muted-foreground">5h ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>Quiz failed by 3 students</span>
                    </div>
                    <span className="text-muted-foreground">6h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Content Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Course Content Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Activity metrics for each video in your course
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 'v1', title: 'React Hooks Introduction', duration: '12:34' },
                  { id: 'v2', title: 'useState Deep Dive', duration: '15:22' },
                  { id: 'v3', title: 'useEffect Patterns', duration: '18:45' },
                  { id: 'v4', title: 'useCallback vs useMemo', duration: '14:12' },
                  { id: 'v5', title: 'Custom Hooks Patterns', duration: '20:30' },
                  { id: 'v6', title: 'Context API with Hooks', duration: '16:18' }
                ].map((video, index) => {
                  // Pre-calculate metrics to avoid inline Math.random()
                  const watchCount = 30 + (index * 8)
                  const confusionsCount = 2 + (index % 3)
                  const reflectionsCount = 5 + (index * 2)
                  
                  // Calculate video-specific performance metrics
                  const learnRate = 35 + (index * 4) // min/hr learning rate for this video
                  
                  return (
                    <div key={video.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {video.duration}
                            </span>
                            <span>Watched by {watchCount} students</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Learn Rate */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-purple-600">{learnRate}</p>
                          <p className="text-xs text-muted-foreground">min/hr</p>
                        </div>
                        
                        {/* Confusions */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-orange-600">{confusionsCount}</p>
                          <p className="text-xs text-muted-foreground">Confusions</p>
                        </div>
                        
                        {/* Reflections */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-indigo-600">{reflectionsCount}</p>
                          <p className="text-xs text-muted-foreground">Reflections</p>
                        </div>
                        
                        {/* Action */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleViewVideoDetails(video.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confusion Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Coming soon - video selector and heatmap visualization
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Heatmap functionality will be added back gradually
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