"use client"

import { useEffect } from "react"
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

      {/* Students & Learn Rate Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>New Students</CardTitle>
            <p className="text-sm text-muted-foreground">
              Daily student enrollments
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxisDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  name="New Students"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learn Rate & Execution Pace</CardTitle>
            <p className="text-sm text-muted-foreground">
              Student engagement metrics
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatXAxisDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="learnRate" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Learn Rate (min/hr)"
                />
                <Line 
                  type="monotone" 
                  dataKey="executionPace" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Execution Pace (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Activity</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time student activity across courses
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              127 Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { student: "Sarah Chen", action: "Started watching", course: "React Masterclass", time: "2 min ago" },
              { student: "Mike Johnson", action: "Submitted confusion", course: "JavaScript Fundamentals", time: "5 min ago" },
              { student: "Emma Wilson", action: "Completed lesson", course: "React Masterclass", time: "8 min ago" },
              { student: "Alex Kim", action: "Added reflection", course: "JavaScript Fundamentals", time: "12 min ago" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.student}</p>
                    <p className="text-xs text-muted-foreground">{activity.action} • {activity.course}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}