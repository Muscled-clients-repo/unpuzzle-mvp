"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
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
  AlertCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Course } from "@/types/domain"

// Extended interface for instructor course data with analytics
interface InstructorCourseData extends Course {
  status?: 'draft' | 'published' | 'archived' | 'under_review'
  revenue?: number
  completionRate?: number
  lastUpdated?: string
}

export default function TeachCoursesPage() {
  const router = useRouter()
  const { 
    instructorCourses,
    loadInstructorCourses,
    deleteCourse,
    publishCourse,
    unpublishCourse,
    duplicateCourse,
    loading,
    error,
    successMessage,
    clearMessages,
    profile
  } = useAppStore()
  
  console.log('🔍 Current state:', { instructorCourses, loading, error, hasProfile: !!profile })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  
  // Action handlers
  const handleArchiveCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to archive this course?')) {
      await deleteCourse(courseId)
    }
  }
  
  const handlePublishToggle = async (courseId: string, isPublished: boolean) => {
    if (isPublished) {
      await unpublishCourse(courseId)
    } else {
      await publishCourse(courseId)
    }
  }
  
  const handleDuplicateCourse = async (courseId: string) => {
    await duplicateCourse(courseId)
  }
  
  useEffect(() => {
    console.log('📋 Courses page mounted, loading instructor courses...')
    loadInstructorCourses()
  }, [loadInstructorCourses])

  const filteredCourses = (instructorCourses || []).filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || (course as InstructorCourseData).status === statusFilter
    return matchesSearch && matchesStatus
  })

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'students':
        return (b.enrollmentCount || 0) - (a.enrollmentCount || 0)
      case 'revenue':
        return ((b as InstructorCourseData).revenue || 0) - ((a as InstructorCourseData).revenue || 0)
      case 'completionRate':
        return ((b as InstructorCourseData).completionRate || 0) - ((a as InstructorCourseData).completionRate || 0)
      default:
        return 0 // Mock - would use actual dates
    }
  })

  // Loading state
  if (loading && (!instructorCourses || instructorCourses.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && (!instructorCourses || instructorCourses.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold">Failed to Load Courses</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => loadInstructorCourses()}
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Notifications */}
      {(successMessage || error) && (
        <div className={`p-4 rounded-md flex justify-between items-center ${
          successMessage ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <p>{successMessage || error}</p>
          <button 
            onClick={clearMessages}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(instructorCourses || []).length}</div>
            <p className="text-xs text-muted-foreground">
              {(instructorCourses || []).filter(c => (c as InstructorCourseData).status === 'published' || c.isPublished).length} published
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
              {(instructorCourses || []).reduce((acc, c) => acc + (c.enrollmentCount || 0), 0).toLocaleString()}
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
              ${(instructorCourses || []).reduce((acc, c) => acc + ((c as InstructorCourseData).revenue || 0), 0).toLocaleString()}
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
              {(instructorCourses || []).filter(c => (c as InstructorCourseData).status === 'published' || c.isPublished).length > 0
                ? Math.round(
                    (instructorCourses || [])
                      .filter(c => (c as InstructorCourseData).status === 'published' || c.isPublished)
                      .reduce((acc, c) => acc + ((c as InstructorCourseData).completionRate || 0), 0) / 
                    (instructorCourses || []).filter(c => (c as InstructorCourseData).status === 'published' || c.isPublished).length
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Student success rate
            </p>
          </CardContent>
        </Card>
      </div>

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
                  (course as InstructorCourseData).status === 'published' || course.isPublished ? 'default' :
                  (course as InstructorCourseData).status === 'draft' || !course.isPublished ? 'secondary' :
                  'outline'
                }
              >
                {(course as InstructorCourseData).status || (course.isPublished ? 'published' : 'draft')}
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
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleArchiveCourse(course.id)}
                    >
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
                  <span className="font-medium">{course.videos?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{Math.floor((course.duration || 0) / 60)} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{(course.enrollmentCount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{(course as InstructorCourseData).completionRate || 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium text-green-600">
                    ${((course as InstructorCourseData).revenue || 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(course.updatedAt || Date.now()).toLocaleDateString()}
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

      {/* Empty State */}
      {sortedCourses.length === 0 && (
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
  )
}