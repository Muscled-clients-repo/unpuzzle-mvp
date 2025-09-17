'use client'

import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Using plain div with conditional rendering instead of Collapsible
import { ChevronDown, ChevronRight, Target, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTracks,
  getTrackGoals,
  getCourseGoalAssignments,
  assignCourseToGoals,
  Track,
  TrackGoal
} from '@/lib/actions/course-track-actions'
import { toast } from 'sonner'

interface CourseTrackGoalSelectorProps {
  courseId: string
}

export function CourseTrackGoalSelector({ courseId }: CourseTrackGoalSelectorProps) {
  const queryClient = useQueryClient()
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set())
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())

  // Get all tracks
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: getTracks
  })

  // Get goals for all tracks
  const { data: allGoals = [] } = useQuery({
    queryKey: ['track-goals', tracks.map(t => t.id).join(',')],
    queryFn: async () => {
      const goalPromises = tracks.map(track => getTrackGoals(track.id))
      const goalArrays = await Promise.all(goalPromises)
      return goalArrays.flat()
    },
    enabled: tracks.length > 0
  })


  const { data: goalAssignments = [] } = useQuery({
    queryKey: ['course-goal-assignments', courseId],
    queryFn: () => getCourseGoalAssignments(courseId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })


  const goalMutation = useMutation({
    mutationFn: (goalIds: string[]) => assignCourseToGoals(courseId, goalIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-goal-assignments', courseId] })
      toast.success('Goal assignments updated')
    },
    onError: (error) => {
      toast.error('Failed to update goal assignments')
      console.error(error)
    }
  })


  useEffect(() => {
    setSelectedGoals(new Set(goalAssignments.map(a => a.goal_id)))
  }, [goalAssignments.length]) // Only depend on length to avoid object reference issues

  // Auto-expand tracks that have goals selected - use stable dependency
  useEffect(() => {
    if (selectedGoals.size > 0 && allGoals.length > 0) {
      const tracksWithSelectedGoals = new Set<string>()
      selectedGoals.forEach(goalId => {
        const goal = allGoals.find(g => g.id === goalId)
        if (goal) {
          tracksWithSelectedGoals.add(goal.track_id)
        }
      })

      // Only update if there are actually new tracks to expand
      if (tracksWithSelectedGoals.size > 0) {
        setExpandedTracks(prev => {
          const newExpanded = new Set([...prev, ...tracksWithSelectedGoals])
          return newExpanded.size !== prev.size ? newExpanded : prev
        })
      }
    }
  }, [selectedGoals.size, allGoals.length]) // Use sizes instead of objects


  const handleGoalToggle = (goalId: string, checked: boolean) => {
    const newSelectedGoals = new Set(selectedGoals)
    if (checked) {
      newSelectedGoals.add(goalId)
    } else {
      newSelectedGoals.delete(goalId)
    }
    setSelectedGoals(newSelectedGoals)
    goalMutation.mutate(Array.from(newSelectedGoals))
  }

  const toggleTrackExpanded = (trackId: string) => {
    const newExpanded = new Set(expandedTracks)
    if (newExpanded.has(trackId)) {
      newExpanded.delete(trackId)
    } else {
      newExpanded.add(trackId)
    }
    setExpandedTracks(newExpanded)
  }

  const getGoalsForTrack = (trackId: string) => allGoals.filter(g => g.track_id === trackId)

  if (tracks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Course Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tracks available. Contact admin to set up tracks and goals.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative z-20">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Course Visibility
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Choose which student tracks and goals can access this course
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracks.map(track => {
          const trackGoals = getGoalsForTrack(track.id)
          const isExpanded = expandedTracks.has(track.id)
          const selectedGoalsInTrack = trackGoals.filter(g => selectedGoals.has(g.id))

          return (
            <div key={track.id} className="space-y-2">
              {/* Track Header */}
              <div className="flex items-center justify-between p-2 rounded-lg border bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {track.name}
                    </div>
                    {track.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {track.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedGoalsInTrack.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedGoalsInTrack.length} goal{selectedGoalsInTrack.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  
                  {trackGoals.length > 0 && (
                    <button
                      onClick={() => toggleTrackExpanded(track.id)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Track Goals (Expandable) */}
              {trackGoals.length > 0 && isExpanded && (
                <div className="ml-6 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                  {trackGoals.map(goal => (
                    <div key={goal.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`goal-${goal.id}`}
                        checked={selectedGoals.has(goal.id)}
                        onCheckedChange={(checked) => handleGoalToggle(goal.id, !!checked)}
                        disabled={goalMutation.isPending}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`goal-${goal.id}`}
                            className="text-sm cursor-pointer font-medium"
                          >
                            {goal.name || goal.description || 'Unknown Goal'}
                          </Label>
                        </div>
                        {goal.is_default && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Default Starting Goal
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Summary */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Visibility Summary:
            </span>
          </div>
          <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {selectedGoals.size === 0 && (
              "Course visible to all students (no restrictions)"
            )}
            {selectedGoals.size > 0 && (
              `Visible to students with ${selectedGoals.size} specific goal${selectedGoals.size !== 1 ? 's' : ''}`
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}