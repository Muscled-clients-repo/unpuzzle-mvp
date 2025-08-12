"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker } from "@/components/instructor/date-range-picker"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import { 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  MoreVertical,
  Download,
  Calendar,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function InstructorDashboard() {
  const { 
    instructorStats, 
    courseAnalytics,
    selectedInstructorCourse,
    dateRange,
    chartData,
    compareData,
    isLoadingChartData,
    loadInstructorData,
    loadChartData,
    calculateMetricChange
  } = useAppStore()

  useEffect(() => {
    loadInstructorData()
    loadChartData()
  }, [loadInstructorData, loadChartData])

  if (!instructorStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Get current values from latest chart data
  const latestData = chartData[chartData.length - 1] || {
    revenue: 0,
    students: 0,
    learnRate: 0,
    executionPace: 0
  }

  // Calculate totals for the period
  const periodTotals = {
    revenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
    students: chartData.reduce((sum, d) => sum + d.students, 0),
    avgLearnRate: chartData.length > 0 
      ? chartData.reduce((sum, d) => sum + d.learnRate, 0) / chartData.length 
      : 0,
    avgExecutionPace: chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.executionPace, 0) / chartData.length
      : 0
  }

  // Calculate metric changes
  const changes = {
    revenue: calculateMetricChange('revenue'),
    students: calculateMetricChange('students'),
    learnRate: calculateMetricChange('learnRate'),
    executionPace: calculateMetricChange('executionPace')
  }

  // Combine current and compare data for charts
  const combinedChartData = chartData.map((point, index) => ({
    ...point,
    compareRevenue: compareData[index]?.revenue,
    compareStudents: compareData[index]?.students,
    compareLearnRate: compareData[index]?.learnRate,
    compareExecutionPace: compareData[index]?.executionPace
  }))

  // Format date for display
  const formatXAxisDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{formatXAxisDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.name.includes('Revenue') 
                  ? `$${entry.value.toLocaleString()}`
                  : entry.name.includes('Rate') || entry.name.includes('Pace')
                    ? `${entry.value}%`
                    : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Date Range Picker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">
            {selectedInstructorCourse === 'all' 
              ? 'Track performance across all courses'
              : `Performance for ${courseAnalytics.find(c => c.courseId === selectedInstructorCourse)?.courseName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker />
          <Button variant="outline" size="icon" onClick={loadChartData}>
            <RefreshCw className={cn("h-4 w-4", isLoadingChartData && "animate-spin")} />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${periodTotals.revenue.toLocaleString()}</div>
            <div className="flex items-center text-xs mt-2">
              {changes.revenue > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.revenue}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.revenue)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodTotals.students.toLocaleString()}</div>
            <div className="flex items-center text-xs mt-2">
              {changes.students > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.students}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.students)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learn Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodTotals.avgLearnRate.toFixed(1)} min/hr</div>
            <div className="flex items-center text-xs mt-2">
              {changes.learnRate > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.learnRate}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.learnRate)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Pace</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodTotals.avgExecutionPace.toFixed(1)}%</div>
            <div className="flex items-center text-xs mt-2">
              {changes.executionPace > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{changes.executionPace}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(changes.executionPace)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total earnings over selected period
              </p>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={combinedChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisDate}
                className="text-xs"
              />
              <YAxis 
                className="text-xs"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Current Period"
              />
              <Line
                type="monotone"
                dataKey="compareRevenue"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name="Previous Period"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>


      {/* Live Analytics Section */}
      <div className="space-y-6">
        {/* Routes Table with Live User Counts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Route Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time user distribution across all platform routes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  63 Active Now
                </Badge>
                <Badge variant="outline">
                  19 Guests
                </Badge>
                <Button variant="outline" size="sm" onClick={() => {}}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Route</th>
                    <th className="text-left p-3 text-sm font-medium">Type</th>
                    <th className="text-center p-3 text-sm font-medium">Live Users</th>
                    <th className="text-center p-3 text-sm font-medium">Guests</th>
                    <th className="text-center p-3 text-sm font-medium">Authenticated</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Public Routes */}
                  {[
                    { route: '/', path: 'Homepage', type: 'public', total: 8, guests: 5, auth: 3 },
                    { route: '/courses', path: 'Browse Courses', type: 'public', total: 6, guests: 4, auth: 2 },
                    { route: '/course/[id]', path: 'Course Details', type: 'public', total: 4, guests: 3, auth: 1 },
                    { route: '/blog', path: 'Blog', type: 'public', total: 2, guests: 2, auth: 0 },
                    { route: '/about', path: 'About Us', type: 'public', total: 1, guests: 1, auth: 0 },
                    { route: '/pricing', path: 'Pricing', type: 'public', total: 3, guests: 2, auth: 1 },
                    
                    // Private Routes - Student
                    { route: '/student', path: 'Student Dashboard', type: 'private', total: 5, guests: 0, auth: 5 },
                    { route: '/student/courses', path: 'My Courses', type: 'private', total: 3, guests: 0, auth: 3 },
                    { route: '/student/metrics', path: 'Learning Metrics', type: 'private', total: 2, guests: 0, auth: 2 },
                    { route: '/student/reflections', path: 'Reflections', type: 'private', total: 1, guests: 0, auth: 1 },
                    { route: '/student/community', path: 'Community', type: 'private', total: 4, guests: 0, auth: 4 },
                    
                    // Video Routes (Mixed)
                    { route: '/learn/course/[id]/video/[videoId]', path: 'Video Lesson', type: 'mixed', total: 12, guests: 3, auth: 9 },
                    { route: '/course/[id]/alternative', path: 'Course Video', type: 'mixed', total: 6, guests: 1, auth: 5 },
                    
                    // Private Routes - Instructor
                    { route: '/instructor', path: 'Instructor Dashboard', type: 'private', total: 2, guests: 0, auth: 2 },
                    { route: '/instructor/students', path: 'Student Management', type: 'private', total: 1, guests: 0, auth: 1 },
                    { route: '/instructor/confusions', path: 'Student Confusions', type: 'private', total: 1, guests: 0, auth: 1 },
                    { route: '/instructor/promote', path: 'Promote Students', type: 'private', total: 0, guests: 0, auth: 0 },
                    { route: '/instructor/course/new', path: 'Create Course', type: 'private', total: 1, guests: 0, auth: 1 },
                    
                    // Private Routes - Moderator
                    { route: '/moderator', path: 'Moderator Dashboard', type: 'private', total: 1, guests: 0, auth: 1 },
                    { route: '/moderator/confusions', path: 'Review Confusions', type: 'private', total: 0, guests: 0, auth: 0 },
                  ].map((routeData, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-mono">{routeData.route}</p>
                          <p className="text-xs text-muted-foreground">{routeData.path}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={
                            routeData.type === 'public' ? 'secondary' : 
                            routeData.type === 'private' ? 'default' : 
                            'outline'
                          }
                          className="text-xs"
                        >
                          {routeData.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg font-bold">{routeData.total}</span>
                          {routeData.total > 0 && (
                            <div className="flex gap-0.5">
                              {[...Array(Math.min(routeData.total, 5))].map((_, i) => (
                                <div key={i} className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "text-sm",
                          routeData.guests > 0 ? "font-medium" : "text-muted-foreground"
                        )}>
                          {routeData.guests}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "text-sm",
                          routeData.auth > 0 ? "font-medium" : "text-muted-foreground"
                        )}>
                          {routeData.auth}
                        </span>
                      </td>
                      <td className="p-3">
                        {routeData.total > 10 ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-red-500 rounded-full" />
                            <span className="text-xs text-red-600">High traffic</span>
                          </div>
                        ) : routeData.total > 5 ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            <span className="text-xs text-yellow-600">Moderate</span>
                          </div>
                        ) : routeData.total > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-green-600">Normal</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-gray-400 rounded-full" />
                            <span className="text-xs text-muted-foreground">Idle</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50">
                    <td className="p-3 font-medium text-sm" colSpan={2}>Total</td>
                    <td className="p-3 text-center font-bold text-lg">63</td>
                    <td className="p-3 text-center font-medium">19</td>
                    <td className="p-3 text-center font-medium">44</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium">System Active</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>


        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest user actions across your courses
                </p>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '2 min ago', user: 'Sarah Chen', action: 'Started watching', detail: 'React Hooks lesson', icon: '▶️' },
                { time: '5 min ago', user: 'Guest User', action: 'Browsing', detail: 'JavaScript course page', icon: '👀' },
                { time: '8 min ago', user: 'Mike Johnson', action: 'Completed quiz', detail: 'Score: 85%', icon: '✅' },
                { time: '12 min ago', user: 'Emma Wilson', action: 'Posted confusion', detail: 'CSS Grid question', icon: '❓' },
                { time: '15 min ago', user: 'Alex Kim', action: 'Submitted reflection', detail: 'Video reflection on React', icon: '💭' },
                { time: '18 min ago', user: 'Lisa Park', action: 'Joined course', detail: 'Node.js Backend Development', icon: '🎯' },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className="text-2xl">{activity.icon}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-muted-foreground"> {activity.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Development Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Development Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link href="/test-stores">Test New Stores</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/test-student-video">Test Migrated VideoPlayer</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/test-instructor-video">Test Migrated InstructorView</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/student">Student Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}