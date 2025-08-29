"use client"

import { useEffect, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertCircle,
  Clock,
  MessageSquare,
  Search,
  User,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default function ConfusionsPage() {
  const { 
    courseAnalytics, 
    pendingConfusions,
    loadInstructorData,
    selectedInstructorCourse,
    setSelectedInstructorCourse,
    getFilteredAnalytics
  } = useAppStore()
  
  const [localCourseFilter, setLocalCourseFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadInstructorData()
  }, [loadInstructorData])

  // Get confusions based on selected course from dropdown
  const filteredCourseAnalytics = selectedInstructorCourse === 'all' 
    ? courseAnalytics 
    : courseAnalytics.filter(c => c.courseId === selectedInstructorCourse)
    
  const allConfusions = filteredCourseAnalytics.flatMap(course => 
    course.confusions.map(confusion => ({
      ...confusion,
      courseId: course.courseId,
      courseName: course.courseName
    }))
  )

  // Combine with pending confusions (which might not be in course analytics yet)
  const combinedConfusions = [
    ...pendingConfusions.map(pc => ({
      ...pc,
      resolved: false,
      courseName: courseAnalytics.find(c => c.courseId === pc.courseId)?.courseName || 'Unknown Course'
    })),
    ...allConfusions.filter(c => !pendingConfusions.some(pc => pc.id === c.id))
  ]

  // Apply filters
  const filteredConfusions = combinedConfusions.filter(confusion => {
    // Local course filter (for additional filtering within the page)
    if (localCourseFilter && confusion.courseId !== localCourseFilter) {
      return false
    }
    
    // Search filter
    if (searchQuery && !confusion.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !confusion.studentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Priority filter
    if (priorityFilter !== "all" && confusion.priority !== priorityFilter) {
      return false
    }
    
    // Status filter
    if (statusFilter === "pending" && confusion.resolved) {
      return false
    }
    if (statusFilter === "resolved" && !confusion.resolved) {
      return false
    }
    
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredConfusions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedConfusions = filteredConfusions.slice(startIndex, startIndex + itemsPerPage)

  // Statistics
  const stats = {
    total: combinedConfusions.length,
    pending: combinedConfusions.filter(c => !c.resolved).length,
    resolved: combinedConfusions.filter(c => c.resolved).length,
    highPriority: combinedConfusions.filter(c => c.priority === 'high').length,
    avgResponseTime: '2.5 hours' // Mock data
  }

  // Course-wise breakdown
  const courseBreakdown = courseAnalytics.map(course => ({
    courseId: course.courseId,
    courseName: course.courseName,
    totalConfusions: course.confusions.length,
    pending: course.confusions.filter(c => !c.resolved).length,
    resolved: course.confusions.filter(c => c.resolved).length
  }))

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {selectedInstructorCourse === 'all' 
              ? 'All Student Confusions' 
              : `${courseAnalytics.find(c => c.courseId === selectedInstructorCourse)?.courseName || 'Course'} Confusions`}
          </h1>
          <p className="text-muted-foreground">
            {selectedInstructorCourse === 'all'
              ? 'Review and respond to student questions across all your courses'
              : `Manage confusions for ${courseAnalytics.find(c => c.courseId === selectedInstructorCourse)?.courseName}`}
          </p>
        </div>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Bulk Response
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Confusions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Need response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>


      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Confusions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {stats.pending > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Confusions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {selectedInstructorCourse === "all" 
                ? "All Confusions" 
                : `${courseAnalytics.find(c => c.courseId === selectedInstructorCourse)?.courseName || 'Course'} Confusions`}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {paginatedConfusions.length} of {filteredConfusions.length} results
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Video Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedConfusions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No confusions found</p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filters or search query
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedConfusions.map((confusion) => (
                    <TableRow key={confusion.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{confusion.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {confusion.courseName}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate text-sm">{confusion.message}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{confusion.videoTime}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            confusion.priority === 'high' ? 'destructive' : 
                            confusion.priority === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {confusion.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {confusion.resolved ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Resolved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Pending</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {confusion.timestamp}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!confusion.resolved ? (
                          <Button size="sm" asChild>
                            <Link href={`/instructor/respond/${confusion.id}`}>
                              Respond
                              <ArrowRight className="ml-2 h-3 w-3" />
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/instructor/respond/${confusion.id}`}>
                              View
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}