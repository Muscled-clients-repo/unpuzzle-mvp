"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus,
  Search,
  Filter,
  Users,
  DollarSign,
  TrendingUp,
  MoreVertical,
  Edit,
  BarChart3,
  Eye,
  Archive,
  Video,
  Clock,
  AlertCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function TeachCoursesPage() {
  const router = useRouter()
  const { 
    // Auth state - now with unique property names
    user, 
    authLoading, 
    authError,
    // Course state (from instructor slice)
    courses, 
    loadCourses, 
    loading: coursesLoading,
    error: coursesError
  } = useAppStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  const [hasInitialized, setHasInitialized] = useState(false)
  
  useEffect(() => {
    // Only load courses after auth is complete and we haven't initialized yet
    if (!authLoading && !hasInitialized) {
      loadCourses(user?.id)
      setHasInitialized(true)
    }
  }, [authLoading, hasInitialized, loadCourses, user?.id])

  // Show error state if there's an error
  const hasError = authError || coursesError
  
  if (hasError) return <ErrorFallback error={hasError} />
  
  // Use skeleton loading instead of full-page spinner for better UX

  const filteredCourses = (courses || []).filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || course.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'students':
        return b.students - a.students
      case 'revenue':
        return b.revenue - a.revenue
      case 'completionRate':
        return b.completionRate - a.completionRate
      default:
        return 0 // Mock - would use actual dates
    }
  })

  // Don't show empty state until we've fully initialized and confirmed no courses
  const shouldShowEmptyState = hasInitialized && !authLoading && !coursesLoading && sortedCourses.length === 0

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and track their performance
          </p>
        </div>
        <Button onClick={() => router.push('/instructor/course/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Course
        </Button>
      </div>

      {/* Stats Overview */}
      {!hasInitialized || authLoading || coursesLoading ? (
        // Skeleton loading for stats
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-20 animate-pulse" />
                <div className="h-4 w-4 bg-gradient-to-r from-muted to-muted/50 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gradient-to-r from-muted to-muted/50 rounded w-12 animate-pulse mb-2" />
                <div className="h-3 bg-gradient-to-r from-muted to-muted/50 rounded w-16 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Actual stats
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(courses || []).length}</div>
              <p className="text-xs text-muted-foreground">
                {(courses || []).filter(c => c.status === 'published').length} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(courses || []).reduce((acc, c) => acc + c.students, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(courses || []).reduce((acc, c) => acc + c.revenue, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  (courses || []).filter(c => c.status === 'published').reduce((acc, c) => acc + c.completionRate, 0) / 
                  Math.max((courses || []).filter(c => c.status === 'published').length, 1)
                )}%
              </div>
              <p className="text-xs text-muted-foreground">
                Student success rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastUpdated">Last Updated</SelectItem>
            <SelectItem value="students">Most Students</SelectItem>
            <SelectItem value="revenue">Highest Revenue</SelectItem>
            <SelectItem value="completionRate">Completion Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Grid */}
      {!hasInitialized || authLoading || coursesLoading ? (
        // Skeleton loading for courses grid
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
              <CardHeader>
                <div className="h-6 bg-gradient-to-r from-muted to-muted/50 rounded w-3/4 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1,2,3,4,5].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-20 animate-pulse" />
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-12 animate-pulse" />
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="h-3 bg-gradient-to-r from-muted to-muted/50 rounded w-24 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded flex-1 animate-pulse" />
                    <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded flex-1 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedCourses.map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <div className="aspect-video relative bg-muted">
              {/* Thumbnail would go here */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="h-12 w-12 text-muted-foreground" />
              </div>
              <Badge 
                className="absolute top-2 right-2"
                variant={
                  course.status === 'published' ? 'default' :
                  course.status === 'draft' ? 'secondary' :
                  'outline'
                }
              >
                {course.status}
              </Badge>
              {course.pendingConfusions > 0 && (
                <Badge className="absolute top-2 left-2" variant="destructive">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {course.pendingConfusions} pending
                </Badge>
              )}
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/instructor/course/${course.id}/edit`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Course
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/instructor/course/${course.id}/analytics`)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/course/${course.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview as Student
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Course
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Videos</span>
                  <span className="font-medium">{course.totalVideos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.totalDuration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{course.students.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{course.completionRate}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium text-green-600">
                    ${course.revenue.toLocaleString()}
                  </span>
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated {course.lastUpdated}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => router.push(`/instructor/course/${course.id}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => router.push(`/instructor/course/${course.id}/analytics`)}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {shouldShowEmptyState && (
        <Card className="p-12">
          <div className="text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your filters"
                : "Get started by creating your first course"}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => router.push('/instructor/course/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Course
              </Button>
            )}
          </div>
        </Card>
      )}
      </div>
    </ErrorBoundary>
  )
}