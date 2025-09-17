'use client'

import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Target, Search, X, Plus } from 'lucide-react'
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
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Get all tracks
  const { data: tracks = [], isLoading: isTracksLoading } = useQuery({
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

  // ARCHITECTURE-COMPLIANT: Sync selected goals from server data
  useEffect(() => {
    setSelectedGoals(new Set(goalAssignments.map(a => a.goal_id)))
  }, [goalAssignments.length])

  // ARCHITECTURE-COMPLIANT: Core goal selection logic
  const handleGoalToggle = (goalId: string) => {
    const newSelectedGoals = new Set(selectedGoals)
    if (newSelectedGoals.has(goalId)) {
      newSelectedGoals.delete(goalId)
    } else {
      newSelectedGoals.add(goalId)
    }
    setSelectedGoals(newSelectedGoals)
    goalMutation.mutate(Array.from(newSelectedGoals))
  }

  const removeSelectedGoal = (goalId: string) => {
    const newSelectedGoals = new Set(selectedGoals)
    newSelectedGoals.delete(goalId)
    setSelectedGoals(newSelectedGoals)
    goalMutation.mutate(Array.from(newSelectedGoals))
  }

  // Filter goals based on search query
  const filteredGoals = allGoals.filter(goal =>
    goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    goal.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Show loading skeleton while tracks are loading
  if (isTracksLoading) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-3 w-32"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse mb-4 w-48"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
        </div>
      </div>
    )
  }

  // Show error message only after loading is complete and no tracks found
  if (!isTracksLoading && tracks.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium flex items-center gap-2 mb-3">
            <Target className="h-4 w-4" />
            Goal Visibility
          </Label>
          <p className="text-sm text-muted-foreground">
            No tracks available. Contact admin to set up tracks and goals.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Goal Visibility Section */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
          <Target className="h-4 w-4" />
          Goal Visibility
        </Label>
        <p className="text-xs text-muted-foreground mb-4">
          Search and select which student goals can access this course
        </p>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            className="pl-10"
          />
        </div>

        {/* Selected Goals Tags */}
        {selectedGoals.size > 0 && (
          <div className="space-y-2 mb-4">
            <Label className="text-xs font-medium text-muted-foreground">
              Selected Goals ({selectedGoals.size})
            </Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedGoals).map(goalId => {
                const goal = allGoals.find(g => g.id === goalId)
                if (!goal) return null
                return (
                  <Badge key={goalId} variant="secondary" className="text-xs">
                    {goal.name}
                    <button
                      onClick={() => removeSelectedGoal(goalId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Simple Goals List - Show when searching or focused */}
        {(searchQuery || isSearchFocused) && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Search Results ({filteredGoals.length})
            </Label>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No goals found matching "{searchQuery}"
                </p>
              ) : (
                filteredGoals.map(goal => {
                  const track = tracks.find(t => t.id === goal.track_id)
                  const isSelected = selectedGoals.has(goal.id)
                  return (
                    <div
                      key={goal.id}
                      onClick={() => handleGoalToggle(goal.id)}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                        ${isSelected
                          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{goal.name}</span>
                          {track && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                track.name.toLowerCase().includes('agency')
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : track.name.toLowerCase().includes('saas')
                                  ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300'
                                  : 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                              }`}
                            >
                              {track.name}
                            </Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}