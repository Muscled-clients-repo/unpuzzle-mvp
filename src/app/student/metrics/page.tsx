"use client"

import { useEffect } from "react"
import { LearningMetrics } from "@/components/dashboard/metrics-widget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/stores/app-store"
import { mockUsers } from "@/data/mock"
import { 
  Clock,
  Activity,
  Zap,
  Calendar
} from "lucide-react"

export default function MetricsPage() {
  const learner = mockUsers.learners[0]
  const { studentData, loadStudentData } = useAppStore()
  const { courseMetrics } = studentData
  
  useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  return (
    <div className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Learning Analytics</h1>
            <p className="text-muted-foreground">Track your progress and optimize your learning with AI insights</p>
          </div>

          {/* Main Metrics */}
          <div className="mb-8">
            <LearningMetrics
              learnRate={learner.metrics.learnRate}
              executionRate={learner.metrics.executionRate}
              executionPace={learner.metrics.executionPace}
              totalWatchTime={learner.metrics.totalWatchTime}
            />
          </div>

          {/* Course Metrics */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Course Progress</h2>
            {courseMetrics.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
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
                      title="Confusions Resolved"
                      value={course.confusionsResolved}
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
                </CardContent>
              </Card>
            ))}
          </div>
    </div>
  )
}