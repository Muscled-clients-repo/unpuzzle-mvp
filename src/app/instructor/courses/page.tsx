"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { useCoursePrefetch } from "@/hooks/use-course-queries"
import { useQueryClient } from "@tanstack/react-query"
import { getCoursesAction } from "@/app/actions/course-actions"
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { StatsGrid } from "@/components/layout/stats-grid"
import { StatsCardsSkeleton } from "@/components/common/universal-skeleton"
import { FiltersSection } from "@/components/layout"
import { SearchInput, FilterDropdown } from "@/components/ui/filters"

export default function TeachCoursesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
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
  const { prefetchCourse } = useCoursePrefetch()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // OPTIMIZATION: Start prefetching courses while auth is loading (parallel instead of sequential)
  useEffect(() => {
    if (!hasInitialized) {
      if (authLoading) {
        // Start prefetching courses optimistically while waiting for auth
        // This breaks the sequential dependency chain
        console.log('🚀 [COURSES PREFETCH] Starting parallel prefetch during auth loading')
        queryClient.prefetchQuery({
          queryKey: ['courses', 'list'],
          queryFn: () => getCoursesAction({}),
          staleTime: 5 * 60 * 1000, // 5 minutes cache
        })
      } else if (user?.id) {
        // Auth complete - load courses with user context
        console.log('✅ [COURSES LOAD] Auth complete, loading with user context:', user.id)
        loadCourses(user?.id)
        setHasInitialized(true)
      }
    }
  }, [authLoading, hasInitialized, loadCourses, user?.id, queryClient])

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
      <PageContainer>
        {/* Header */}
        <PageContentHeader
          title="My Courses"
          description="Manage your courses and track their performance"
        >
          <Button onClick={() => router.push('/instructor/course/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Course
          </Button>
        </PageContentHeader>

        {/* Stats Overview */}
        {!hasInitialized || authLoading || coursesLoading ? (
          // Skeleton loading for stats
          <StatsCardsSkeleton count={4} />
        ) : (
          // Actual stats
          <StatsGrid columns={4}>
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
          </StatsGrid>
        )}

        {/* Filters and Search */}
        <FiltersSection className="mt-6 mb-6">
          <SearchInput
            placeholder="Search courses..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
            width="w-[180px]"
            icon={<Filter className="h-4 w-4" />}
            options={[
              { value: "all", label: "All Courses" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "under_review", label: "Under Review" }
            ]}
          />
          <FilterDropdown
            value={sortBy}
            onChange={setSortBy}
            placeholder="Sort by"
            width="w-[180px]"
            options={[
              { value: "lastUpdated", label: "Last Updated" },
              { value: "students", label: "Most Students" },
              { value: "revenue", label: "Highest Revenue" },
              { value: "completionRate", label: "Completion Rate" }
            ]}
          />
        </FiltersSection>

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
                    <DropdownMenuItem 
                      onClick={() => router.push(`/instructor/course/${course.id}/edit`)}
                      onMouseEnter={() => prefetchCourse(course.id)}
                    >
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
                    onMouseEnter={() => prefetchCourse(course.id)}
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
      </PageContainer>
    </ErrorBoundary>
  )
}