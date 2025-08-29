"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  TrendingUp,
  Brain,
  Target,
  Clock,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
  User,
  Video,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Filter,
  ThumbsUp,
  ThumbsDown,
  X,
  Users,
  Plus,
  Bell,
  LogOut,
  Settings,
  GraduationCap,
  Eye,
  Mic,
  Image as ImageIcon,
  Play,
  ListFilter
} from "lucide-react"
import Link from "next/link"
import { mockStudentJourneys } from "@/data/mock/instructor-mock-data"

export default function InstructorEngagementPage() {
  const router = useRouter()
  const { loadInstructorData, loadCourses } = useAppStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<'all' | 'reflections' | 'confusions' | 'quizzes'>('all')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  
  useEffect(() => {
    loadInstructorData()
    loadCourses()
  }, [loadInstructorData, loadCourses])

  // Use shared mock data
  const studentJourneys = mockStudentJourneys

  // Filter students based on search
  const filteredStudents = studentJourneys.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Get selected students data or all if showAllStudents
  const displayedStudents = showAllStudents 
    ? studentJourneys 
    : selectedStudents.length > 0 
      ? studentJourneys.filter(s => selectedStudents.includes(s.id))
      : []
  
  // Functions for student selection
  const addStudent = (studentId: string) => {
    if (!selectedStudents.includes(studentId)) {
      setSelectedStudents([...selectedStudents, studentId])
      setShowAllStudents(false)
    }
    setSearchQuery("")
    setIsSearchFocused(false)
  }
  
  const removeStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(id => id !== studentId))
  }
  
  const viewAllStudents = () => {
    setShowAllStudents(true)
    setSelectedStudents([])
  }

  // Get filtered activity based on selected students and filter type
  const getFilteredActivity = () => {
    const studentsToShow = displayedStudents.length > 0 ? displayedStudents : studentJourneys
    
    const allActivity = studentsToShow.flatMap(student => 
      student.recentActivity.map(activity => ({
        ...activity,
        studentName: student.name,
        studentId: student.id,
        studentAvatar: student.avatar
      }))
    )
    
    // Apply filter
    let filtered = allActivity
    if (filterType === 'reflections') {
      filtered = allActivity.filter(a => a.type === 'reflection')
    } else if (filterType === 'confusions') {
      filtered = allActivity.filter(a => a.type === 'confusion')
    } else if (filterType === 'quizzes') {
      filtered = allActivity.filter(a => a.type === 'quiz')
    }
    
    // Sort by time
    return filtered.sort((a, b) => {
      const timeValue = (time: string) => {
        if (time.includes('minute')) return parseInt(time)
        if (time.includes('hour')) return parseInt(time) * 60
        if (time.includes('day')) return parseInt(time) * 1440
        return 9999
      }
      return timeValue(a.timeAgo) - timeValue(b.timeAgo)
    })
  }
  
  const filteredActivity = getFilteredActivity()

  const handleReviewJourney = (studentId: string, videoId: string) => {
    // Navigate to video page with student context
    router.push(`/student/courses/learn/${videoId}?instructor=true&student=${studentId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Title Section - Clear content boundary */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Student Engagement</h1>
        <p className="text-sm text-muted-foreground">
          Review student journeys and respond to reflections in context
        </p>
      </div>

      {/* Student Selection Bar */}
      <div className="space-y-4">
        {/* Selected Students Chips or View All */}
        {(selectedStudents.length > 0 || showAllStudents) && (
          <div className="flex items-center gap-2 flex-wrap">
            {showAllStudents ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1.5 text-sm">
                  <Users className="mr-2 h-3 w-3" />
                  Viewing All Students ({studentJourneys.length})
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllStudents(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                {selectedStudents.map(studentId => {
                  const student = studentJourneys.find(s => s.id === studentId)
                  if (!student) return null
                  return (
                    <Badge 
                      key={studentId} 
                      variant="secondary" 
                      className="px-3 py-1.5 text-sm flex items-center gap-2"
                    >
                      <span>{student.name}</span>
                      <button
                        onClick={() => removeStudent(studentId)}
                        className="hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </>
            )}
          </div>
        )}
        
        {/* Search Box with Dropdown */}
        <div className="relative max-w-md">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="pl-10"
              />
              
              {/* Search Dropdown */}
              {isSearchFocused && searchQuery && filteredStudents.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredStudents
                    .filter(s => !selectedStudents.includes(s.id))
                    .map(student => (
                      <button
                        key={student.id}
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                        onMouseDown={() => addStudent(student.id)}
                      >
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.overallMetrics.totalReflections} reflections
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={viewAllStudents}
              disabled={showAllStudents}
            >
              <Users className="mr-2 h-4 w-4" />
              View All Students
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            <ListFilter className="mr-2 h-4 w-4" />
            All Activity
          </Button>
          <Button
            variant={filterType === 'reflections' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('reflections')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Reflections
          </Button>
          <Button
            variant={filterType === 'confusions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('confusions')}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Confusions
          </Button>
          <Button
            variant={filterType === 'quizzes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('quizzes')}
          >
            <Target className="mr-2 h-4 w-4" />
            Quizzes
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {displayedStudents.length > 0 ? (
            <span>{displayedStudents.length} student{displayedStudents.length > 1 ? 's' : ''} selected</span>
          ) : (
            <span>No students selected</span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredActivity.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Activity Found</h3>
                <p className="text-sm text-muted-foreground">
                  {displayedStudents.length === 0 
                    ? "Select students above to see their activity"
                    : `No ${filterType === 'all' ? 'activity' : filterType} found for selected students`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredActivity.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                {/* Header with student info and status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                      {activity.studentAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.studentName}</span>
                        {activity.status === 'unresponded' && (
                          <Badge variant="destructive" className="text-xs">NEW</Badge>
                        )}
                        {activity.status === 'responded' && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.timeAgo}</span>
                        {activity.type === 'quiz' && (
                          <>
                            <span>•</span>
                            <span>Score: {activity.score}/{activity.total}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Type badge */}
                  <Badge 
                    variant={activity.type === 'confusion' ? 'destructive' : activity.type === 'quiz' ? 'secondary' : 'default'}
                    className="text-xs"
                  >
                    {activity.type === 'reflection' && <MessageSquare className="mr-1 h-3 w-3" />}
                    {activity.type === 'confusion' && <AlertCircle className="mr-1 h-3 w-3" />}
                    {activity.type === 'quiz' && <Target className="mr-1 h-3 w-3" />}
                    {activity.type}
                  </Badge>
                </div>
                
                {/* Course and video info */}
                <div className="text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{activity.courseName}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Video className="h-3 w-3" />
                    <span>{activity.videoTitle}</span>
                    {activity.timestamp && (
                      <>
                        <span>•</span>
                        <span>@ {activity.timestamp}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Content based on type */}
                {activity.type !== 'quiz' && (
                  <div className="mb-3">
                    {/* Show different UI based on input type */}
                    {activity.inputType === 'text' && (
                      <p className="text-sm line-clamp-2">{activity.content}</p>
                    )}
                    
                    {activity.inputType === 'voice' && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.content}</p>
                          <p className="text-xs text-muted-foreground">{activity.duration}</p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {activity.inputType === 'screenshot' && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm flex-1">{activity.content}</p>
                        <Button size="sm" variant="ghost">View</Button>
                      </div>
                    )}
                    
                    {activity.inputType === 'loom' && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.content}</p>
                          <p className="text-xs text-muted-foreground">{activity.duration}</p>
                        </div>
                        <Button size="sm" variant="ghost">Watch</Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Quiz specific content */}
                {activity.type === 'quiz' && (
                  <div className="mb-3">
                    <Progress value={(activity.score / activity.total) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Score: {activity.score}/{activity.total}</span>
                      <span>Pace: {activity.executionPace}s</span>
                    </div>
                  </div>
                )}
                
                {/* Action button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleReviewJourney(activity.studentId, activity.videoId)}
                  className="w-full"
                >
                  <ArrowRight className="mr-2 h-3 w-3" />
                  {activity.type === 'quiz' ? 'Review Quiz' : 'View in Context'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}