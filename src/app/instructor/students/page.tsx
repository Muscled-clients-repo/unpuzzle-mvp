"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { StatsGrid } from "@/components/layout/stats-grid"
import { FiltersSection } from "@/components/layout"
import { SearchInput } from "@/components/ui/filters"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppStore } from "@/stores/app-store"
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from "@/components/common"
import { 
  Search,
  Filter,
  User,
  Clock,
  BookOpen,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Target
} from "lucide-react"

export default function InstructorStudentsPage() {
  const { 
    studentInsights, 
    topLearners,
    loadInstructorData,
    loadCourses,
    courses,
    loading,
    error,
    user
  } = useAppStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress' | 'learnRate' | 'executionRate' | 'executionPace'>('recent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  useEffect(() => {
    if (user?.id) {
      loadInstructorData(user.id)
      loadCourses(user.id)
    }
  }, [loadInstructorData, loadCourses, user?.id])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

  // Combine student insights and top learners to create a comprehensive list
  const allStudents = [
    ...studentInsights.map(student => ({
      id: student.studentId,
      name: student.studentName,
      courseId: student.courseId,
      learnRate: student.learnRate,
      executionRate: 75 + Math.floor(Math.random() * 20), // Mock data: 75-95%
      executionPace: 30 + Math.floor(Math.random() * 30), // Mock data: 30-60 seconds
      progress: student.progress,
      lastActive: student.lastActive,
      strugglingAt: student.strugglingAt,
      needsHelp: student.needsHelp,
      coursesCompleted: 0,
      avgScore: 0,
      currentPlan: 'basic' as const,
      joinedDaysAgo: 0
    })),
    ...topLearners.filter(learner => 
      !studentInsights.some(s => s.studentName === learner.name)
    ).map(learner => ({
      id: learner.id,
      name: learner.name,
      courseId: '1', // Default to first course
      learnRate: learner.learnRate,
      executionRate: 80 + Math.floor(Math.random() * 18), // Mock data: 80-98%
      executionPace: 25 + Math.floor(Math.random() * 25), // Mock data: 25-50 seconds  
      progress: Math.floor(Math.random() * 100), // Generate progress
      lastActive: `${Math.floor(Math.random() * 24)} hours ago`,
      strugglingAt: undefined,
      needsHelp: false,
      coursesCompleted: learner.coursesCompleted,
      avgScore: learner.avgScore,
      currentPlan: learner.currentPlan,
      joinedDaysAgo: learner.joinedDaysAgo
    }))
  ]

  // Filter students based on search
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'recent':
        // Parse lastActive to get a sortable value
        const getMinutes = (str: string) => {
          if (str.includes('min')) return parseInt(str)
          if (str.includes('hour')) return parseInt(str) * 60
          if (str.includes('day')) return parseInt(str) * 60 * 24
          return 999999
        }
        comparison = getMinutes(a.lastActive) - getMinutes(b.lastActive)
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'progress':
        comparison = a.progress - b.progress
        break
      case 'learnRate':
        comparison = a.learnRate - b.learnRate
        break
      case 'executionRate':
        comparison = a.executionRate - b.executionRate
        break
      case 'executionPace':
        comparison = a.executionPace - b.executionPace
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getStatusBadge = (student: typeof allStudents[0]) => {
    if (student.needsHelp) {
      return <Badge variant="destructive" className="text-xs">Needs Help</Badge>
    }
    if (student.progress >= 80) {
      return <Badge variant="default" className="text-xs">Excelling</Badge>
    }
    if (student.progress >= 50) {
      return <Badge variant="secondary" className="text-xs">On Track</Badge>
    }
    return <Badge variant="outline" className="text-xs">Getting Started</Badge>
  }

  const getLearnRateColor = (rate: number) => {
    if (rate >= 45) return "text-green-600"
    if (rate >= 30) return "text-yellow-600"
    return "text-red-600"
  }

  const getExecutionRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const getExecutionPaceColor = (seconds: number) => {
    if (seconds <= 30) return "text-green-600"  // Fast response
    if (seconds <= 45) return "text-yellow-600"  // Average
    return "text-red-600"  // Slow
  }

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    if (course) return course.title
    
    // Fallback for demo data
    switch(courseId) {
      case '1': return 'React Masterclass'
      case '2': return 'Python for Data Science'
      default: return 'Multiple Courses'
    }
  }

  return (
    <ErrorBoundary>
      <PageContainer>
        <PageContentHeader
          title="Students"
          description="Monitor and support your students' learning journey"
        />

        {/* Summary Cards */}
        <StatsGrid columns={4}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allStudents.length}</div>
                <p className="text-xs text-muted-foreground">Across all courses</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {allStudents.filter(s => s.lastActive.includes('min') || s.lastActive.includes('hour')).length}
                </div>
                <p className="text-xs text-muted-foreground">Currently learning</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Need Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {allStudents.filter(s => s.needsHelp).length}
                </div>
                <p className="text-xs text-muted-foreground">Struggling students</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Learn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(allStudents.reduce((sum, s) => sum + s.learnRate, 0) / allStudents.length)} min/hr
                </div>
                <p className="text-xs text-muted-foreground">Platform average</p>
              </CardContent>
            </Card>
        </StatsGrid>

        {/* Search and Filters */}
        <FiltersSection className="mb-6">
          <SearchInput
            placeholder="Search students..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </FiltersSection>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Students</CardTitle>
              <CardDescription>
                Click on column headers to sort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Student
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('progress')}
                    >
                      <div className="flex items-center gap-1">
                        Progress
                        {sortBy === 'progress' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('learnRate')}
                    >
                      <div className="flex items-center gap-1">
                        Learn Rate
                        {sortBy === 'learnRate' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('executionRate')}
                    >
                      <div className="flex items-center gap-1">
                        Exec Rate
                        {sortBy === 'executionRate' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('executionPace')}
                    >
                      <div className="flex items-center gap-1">
                        Exec Pace
                        {sortBy === 'executionPace' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('recent')}
                    >
                      <div className="flex items-center gap-1">
                        Last Active
                        {sortBy === 'recent' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.coursesCompleted > 0 && `${student.coursesCompleted} courses completed`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={student.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">{student.progress}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${getLearnRateColor(student.learnRate)}`}>
                          {student.learnRate} min/hr
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${getExecutionRateColor(student.executionRate)}`}>
                          {student.executionRate}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${getExecutionPaceColor(student.executionPace)}`}>
                          {student.executionPace}s
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{student.lastActive}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(student)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getCourseName(student.courseId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/instructor/student-goals/${student.id}`}>
                              <Target className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </PageContainer>
    </ErrorBoundary>
  )
}