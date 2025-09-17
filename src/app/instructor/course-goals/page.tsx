'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { Search, Target, BookOpen, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTracks,
  getTrackGoals,
  getCourseGoalAssignments,
  assignCourseToGoals,
  getAllCourses
} from '@/lib/actions/course-track-actions'

interface Course {
  id: string
  title: string
  description?: string
  status: string
  difficulty: string
  total_videos?: number
}

interface TrackGoal {
  id: string
  name: string
  description?: string
  track_id: string
}

export default function CourseGoalsManagementPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())

  // Get all courses (following 001 architecture - TanStack Query for server state)
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses'],
    queryFn: getAllCourses
  })

  // Get all tracks and goals
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: getTracks
  })

  const { data: allGoals = [] } = useQuery({
    queryKey: ['all-track-goals'],
    queryFn: async () => {
      if (tracks.length === 0) return []
      const goalPromises = tracks.map(track => getTrackGoals(track.id))
      const goalArrays = await Promise.all(goalPromises)
      return goalArrays.flat()
    },
    enabled: tracks.length > 0
  })

  // Get current assignments for selected course
  const { data: currentAssignments = [] } = useQuery({
    queryKey: ['course-goal-assignments', selectedCourse?.id],
    queryFn: () => selectedCourse ? getCourseGoalAssignments(selectedCourse.id) : [],
    enabled: !!selectedCourse
  })

  // Update selected goals when assignments change
  React.useEffect(() => {
    setSelectedGoals(new Set(currentAssignments.map(a => a.goal_id)))
  }, [currentAssignments])

  // Bulk assignment mutation (following 001 architecture - server actions via TanStack)
  const assignmentMutation = useMutation({
    mutationFn: ({ courseId, goalIds }: { courseId: string, goalIds: string[] }) =>
      assignCourseToGoals(courseId, goalIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-goal-assignments'] })
      toast.success('Course goal assignments updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update course goal assignments')
      console.error(error)
    }
  })

  // Filter courses based on search
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
  }

  const handleGoalToggle = (goalId: string, checked: boolean) => {
    const newSelected = new Set(selectedGoals)
    if (checked) {
      newSelected.add(goalId)
    } else {
      newSelected.delete(goalId)
    }
    setSelectedGoals(newSelected)
  }

  const handleSaveAssignments = () => {
    if (!selectedCourse) return

    assignmentMutation.mutate({
      courseId: selectedCourse.id,
      goalIds: Array.from(selectedGoals)
    })
  }

  const getGoalsForTrack = (trackId: string) => allGoals.filter(g => g.track_id === trackId)

  if (coursesLoading) return <LoadingSpinner />

  return (
    <PageContainer>
      <PageContentHeader
        title="Bulk Course-Goal Management"
        description="Assign courses to student goals for personalized learning paths"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select Course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Course List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCourses.map(course => (
                <div
                  key={course.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCourse?.id === course.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleCourseSelect(course)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{course.title}</h4>
                      {course.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {course.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {course.total_videos || 0} videos
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goal Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Assign to Goals
              {selectedCourse && (
                <Badge variant="secondary" className="ml-2">
                  {selectedCourse.title}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCourse ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a course to manage goal assignments</p>
              </div>
            ) : (
              <>
                {/* Goals by Track */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {tracks.map(track => {
                    const trackGoals = getGoalsForTrack(track.id)
                    if (trackGoals.length === 0) return null

                    return (
                      <div key={track.id} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {track.name}
                        </h4>
                        <div className="space-y-2 ml-4">
                          {trackGoals.map(goal => (
                            <div key={goal.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={`goal-${goal.id}`}
                                checked={selectedGoals.has(goal.id)}
                                onCheckedChange={(checked) => handleGoalToggle(goal.id, !!checked)}
                                disabled={assignmentMutation.isPending}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`goal-${goal.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {goal.name}
                                </label>
                                {goal.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {goal.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedGoals.size} goal{selectedGoals.size !== 1 ? 's' : ''} selected
                  </div>
                  <Button
                    onClick={handleSaveAssignments}
                    disabled={assignmentMutation.isPending}
                    size="sm"
                  >
                    {assignmentMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Assignments
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      {selectedCourse && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedGoals.size}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Goals Assigned
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {tracks.filter(track => getGoalsForTrack(track.id).some(goal => selectedGoals.has(goal.id))).length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Tracks Covered
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {selectedGoals.size > 0 ? 'Visible' : 'Hidden'}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Course Visibility
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}