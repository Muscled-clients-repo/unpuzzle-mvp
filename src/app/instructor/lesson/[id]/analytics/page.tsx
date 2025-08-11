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
  Flame,
  Mail,
  UserCheck,
  User,
  Download,
  Eye
} from "lucide-react"
import Link from "next/link"

export default function LessonAnalyticsPage() {
  const params = useParams()
  const lessonId = params.id as string
  const { loadInstructorData } = useAppStore()
  const [selectedTab, setSelectedTab] = useState("overview")

  useEffect(() => {
    loadInstructorData()
  }, [loadInstructorData])

  // Mock lesson analytics data (in production, would come from Zustand)
  const lesson = {
    lessonId,
    title: `React Hooks Deep Dive - Lesson ${lessonId}`,
    courseName: "Advanced React Patterns",
    totalViews: 2847,
    authenticatedUsers: 1432,
    guestUsers: 491,
    emailsCollected: 187,
    activeViewers: 23,
    totalStudents: 1923,
    avgLearnRate: 42,
    completionRate: 72,
    avgProgress: 68,
    revenue: {
      total: 0, // Free lesson
      thisMonth: 0,
      pending: 0
    },
    confusions: [
      {
        id: '1',
        studentName: 'Sarah Chen',
        timestamp: '2 hours ago',
        videoTime: '12:45',
        message: "Why does useEffect run twice in strict mode?",
        resolved: true,
        responseTime: '15 min'
      },
      {
        id: '2',
        studentName: 'Guest User #421',
        timestamp: '3 hours ago',
        videoTime: '18:32',
        message: "Can you explain the dependency array again?",
        resolved: false
      },
      {
        id: '3',
        studentName: 'Mike Johnson',
        timestamp: '5 hours ago',
        videoTime: '23:10',
        message: "What's the difference between useCallback and useMemo?",
        resolved: true,
        responseTime: '20 min'
      }
    ],
    strugglingTopics: [
      { topic: 'useEffect Dependencies', timestamp: '18:32', studentCount: 127, resolved: false },
      { topic: 'Custom Hooks', timestamp: '31:45', studentCount: 89, resolved: false },
      { topic: 'useCallback vs useMemo', timestamp: '23:10', studentCount: 56, resolved: true }
    ],
    emailsList: [
      { email: 'john.doe@example.com', collectedAt: '10 min ago', watchTime: '42:30' },
      { email: 'sarah.miller@gmail.com', collectedAt: '25 min ago', watchTime: '38:15' },
      { email: 'mike.chen@company.com', collectedAt: '1 hour ago', watchTime: '22:45' },
      { email: 'emma.w@university.edu', collectedAt: '2 hours ago', watchTime: '45:32' },
      { email: 'alex.kim@startup.io', collectedAt: '3 hours ago', watchTime: '31:20' }
    ]
  }

  // Generate heatmap data (reusing logic from course analytics)
  const heatmapData = Array.from({ length: 20 }, (_, i) => {
    const time = `${Math.floor(i * 3)}:${(i * 3 % 60).toString().padStart(2, '0')}`
    let count = Math.floor(Math.random() * 5)
    // Higher confusion at certain points
    if (i === 6) count = 18 // 18:00 - dependency array
    if (i === 10) count = 15 // 30:00 - custom hooks
    if (i === 7) count = 12 // 21:00 - useCallback vs useMemo
    return { time, count }
  })

  const maxCount = Math.max(...heatmapData.map(d => d.count))

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header (same structure as course analytics) */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/instructor" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/instructor/lessons" className="hover:text-foreground">Lessons</Link>
            <ChevronRight className="h-4 w-4" />
            <span>{lesson.title}</span>
          </div>
          <h1 className="text-3xl font-bold">{lesson.title} Analytics</h1>
          <p className="text-muted-foreground">
            {lesson.activeViewers} watching now • {lesson.totalStudents} total viewers
          </p>
        </div>
        <Button asChild>
          <Link href={`/instructor/lesson/${lessonId}/edit`}>
            Edit Lesson
          </Link>
        </Button>
      </div>

      {/* Key Metrics - Modified for lessons with guest/email focus */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authenticated</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.authenticatedUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((lesson.authenticatedUsers / lesson.totalStudents) * 100)}% of viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guest Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.guestUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((lesson.guestUsers / lesson.totalStudents) * 100)}% of viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Collected</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.emailsCollected}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((lesson.emailsCollected / lesson.guestUsers) * 100)}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learn Rate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.avgLearnRate} min/hr</div>
            <p className="text-xs text-muted-foreground">+5% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lesson.completionRate}%</div>
            <Progress value={lesson.completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Reusing structure from course analytics with lesson-specific content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Confusion Heatmap</TabsTrigger>
          <TabsTrigger value="users">Users & Emails</TabsTrigger>
          <TabsTrigger value="confusions">Confusions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Struggling Topics - Reused from course analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Top Struggling Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lesson.strugglingTopics.map((topic, i) => (
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

          {/* User Type Breakdown - New for lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Viewer Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <span>Authenticated Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{lesson.authenticatedUsers}</span>
                    <Progress value={74} className="w-24" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>Guest Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{lesson.guestUsers}</span>
                    <Progress value={26} className="w-24" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-500" />
                    <span>Emails Collected from Guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{lesson.emailsCollected}</span>
                    <Badge variant="outline">{Math.round((lesson.emailsCollected / lesson.guestUsers) * 100)}% conversion</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confusion Heatmap - Reused from course analytics */}
        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confusion Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualize where students are getting stuck in your lesson
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Video Timeline</span>
                  <span>Student Confusions</span>
                </div>
                
                <div className="space-y-2">
                  {heatmapData.map((point, i) => (
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
                    <span>Low confusion (1-5 students)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-orange-500 rounded" />
                    <span>Medium confusion (6-12 students)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-500 rounded" />
                    <span>High confusion (13+ students)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Emails Tab - New for lessons */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Collected Emails</CardTitle>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-3 w-3" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 pb-2 border-b text-sm font-medium">
                  <div>Email</div>
                  <div>Watch Time</div>
                  <div>Collected</div>
                </div>
                {lesson.emailsList.map((entry, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 py-2 text-sm">
                    <div className="font-medium">{entry.email}</div>
                    <div className="text-muted-foreground">{entry.watchTime}</div>
                    <div className="text-muted-foreground">{entry.collectedAt}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{lesson.emailsCollected}</p>
                    <p className="text-sm text-muted-foreground">Total Emails</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round((lesson.emailsCollected / lesson.guestUsers) * 100)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">38:24</p>
                    <p className="text-sm text-muted-foreground">Avg Watch Before Email</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Viewers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Currently Watching</CardTitle>
                <Badge variant="outline" className="gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  {lesson.activeViewers} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['John Doe (Authenticated)', 'Guest User #892', 'Sarah Miller (Authenticated)', 
                  'Guest User #421', 'Mike Chen (Authenticated)'].map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        Watching: {12 + i * 5}:30 / 45:32
                      </p>
                    </div>
                    <Badge variant={name.includes('Guest') ? 'secondary' : 'default'}>
                      {name.includes('Guest') ? 'Guest' : 'User'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confusions Tab - Reused from course analytics */}
        <TabsContent value="confusions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Student Confusions</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{lesson.confusions.filter(c => c.resolved).length} resolved</Badge>
                  <Badge variant="destructive">{lesson.confusions.filter(c => !c.resolved).length} pending</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lesson.confusions.map((confusion) => (
                  <div key={confusion.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{confusion.studentName}</span>
                        <Badge variant="outline">{confusion.videoTime}</Badge>
                        {confusion.studentName.includes('Guest') && (
                          <Badge variant="secondary">Guest</Badge>
                        )}
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