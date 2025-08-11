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
  MessageSquare,
  Brain,
  Target,
  BarChart3,
  Activity,
  ChevronRight,
  Flame,
  Play
} from "lucide-react"
import Link from "next/link"

export default function CourseAnalyticsPage() {
  const params = useParams()
  const courseId = params.id as string
  const { courseAnalytics, getConfusionHeatmap, loadInstructorData, courses, loadCourses } = useAppStore()
  const [selectedTab, setSelectedTab] = useState("overview")
  const [selectedVideoId, setSelectedVideoId] = useState<string>("all")

  useEffect(() => {
    loadInstructorData()
    loadCourses() // Load courses to get video data
  }, [loadInstructorData, loadCourses])

  const course = courseAnalytics.find(c => c.courseId === courseId)
  const heatmapData = getConfusionHeatmap(courseId)
  
  // Get course data for video information
  const courseData = courses.find(c => c.id === courseId)
  
  // Add debug logging
  console.log('CourseID:', courseId, 'Available courses:', courses.length, 'Found course:', courseData?.title)
  
  // Mock video data if course doesn't exist or has no videos
  const mockVideos = [
    { id: 'v1', title: 'React Hooks Introduction', duration: '12:34' },
    { id: 'v2', title: 'useState Deep Dive', duration: '15:22' },
    { id: 'v3', title: 'useEffect Patterns', duration: '18:45' },
    { id: 'v4', title: 'useCallback vs useMemo', duration: '14:12' },
    { id: 'v5', title: 'Custom Hooks Patterns', duration: '20:30' },
    { id: 'v6', title: 'Context API with Hooks', duration: '16:18' }
  ]
  
  const videosToShow = courseData?.videos?.length > 0 ? courseData.videos : mockVideos
  const selectedVideo = selectedVideoId === "all" ? null : videosToShow?.find(v => v.id === selectedVideoId)

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
                      <span>Mike's learn rate improved to 48 min/hr</span>
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
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span>12 new reflections posted</span>
                    </div>
                    <span className="text-muted-foreground">1d ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Content Analytics */}
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
                {videosToShow?.map((video, index) => {
                  const watchCount = Math.floor(Math.random() * 50) + 30
                  const confusionsCount = Math.floor(Math.random() * 8) + 2
                  const passRate = Math.floor(Math.random() * 30) + 70
                  const reflectionsCount = Math.floor(Math.random() * 15) + 5
                  
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
                              {video.duration || '10:30'}
                            </span>
                            <span>Watched by {watchCount} students</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Confusions */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-orange-600">{confusionsCount}</p>
                          <p className="text-xs text-muted-foreground">Confusions</p>
                        </div>
                        
                        {/* Quiz Pass Rate */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-green-600">{passRate}%</p>
                          <p className="text-xs text-muted-foreground">Quiz Pass</p>
                        </div>
                        
                        {/* Reflections */}
                        <div className="text-center">
                          <p className="text-sm font-semibold text-blue-600">{reflectionsCount}</p>
                          <p className="text-xs text-muted-foreground">Reflections</p>
                        </div>
                        
                        {/* Action */}
                        <Button size="sm" variant="outline" className="text-xs">
                          View Details
                        </Button>
                      </div>
                    </div>
                  )
                })
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row: Top Problem Videos */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Videos with Most Confusions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  Top Videos with Confusions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: "useCallback Deep Dive", confusions: 12, timestamp: "12:30" },
                    { title: "Custom Hooks Patterns", confusions: 8, timestamp: "5:45" },
                    { title: "useMemo vs useCallback", confusions: 6, timestamp: "18:20" },
                    { title: "Context API Optimization", confusions: 4, timestamp: "22:15" }
                  ].map((video, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground">Peak confusion at {video.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {video.confusions} confusions
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Videos with Low Quiz Pass Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Target className="h-5 w-5" />
                  Lowest Quiz Pass Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: "Advanced State Management", passRate: 45, failed: 22, passed: 18 },
                    { title: "Performance Optimization", passRate: 58, failed: 17, passed: 23 },
                    { title: "Custom Hooks Testing", passRate: 62, failed: 15, passed: 25 },
                    { title: "Context API Patterns", passRate: 68, failed: 13, passed: 27 }
                  ].map((video, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{video.passed} passed • {video.failed} failed</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={video.passRate < 50 ? "destructive" : video.passRate < 70 ? "secondary" : "default"} className="text-xs">
                          {video.passRate}% pass rate
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          {/* Video Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Select Video to Analyze
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a specific video to view confusion hotspots, or select "All Videos" for course overview
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Video selector temporarily disabled for debugging</p>
                <div className="w-full h-10 bg-muted/30 rounded flex items-center justify-center text-sm text-muted-foreground">
                  Select: All Videos (Mock Data)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Confusion Heatmap
                {selectedVideo && (
                  <Badge variant="outline" className="ml-2">
                    {selectedVideo.title}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedVideo 
                  ? `Confusion hotspots for "${selectedVideo.title}"`
                  : selectedVideoId === "all" 
                    ? "Course-wide confusion patterns across all videos"
                    : "Visualize where students are getting stuck"
                }
              </p>
            </CardHeader>
            <CardContent>
              {/* Heatmap Visualization */}
              <div className="space-y-4">
                {/* Video Context */}
                {selectedVideo && (
                  <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{selectedVideo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedVideo.duration ? `Duration: ${selectedVideo.duration}` : 'Analyzing video timeline...'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedVideo ? 'Video Timeline' : 'Course Timeline'}</span>
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
              <CardTitle>
                Recommended Actions
                {selectedVideo && (
                  <Badge variant="outline" className="ml-2 font-normal">
                    {selectedVideo.title}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Critical: Address confusion at 12:30
                      {selectedVideo && <span className="text-muted-foreground"> in "{selectedVideo.title}"</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">87 students struggled with useCallback Hook</p>
                    <Button size="sm" variant="destructive" className="mt-2">
                      Create Supplemental Content
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Consider re-recording section at 45:20
                      {selectedVideo && <span className="text-muted-foreground"> in "{selectedVideo.title}"</span>}
                    </p>
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