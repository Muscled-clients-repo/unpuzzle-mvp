'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Target, RefreshCw, UserX, AlertTriangle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTracks, getTrackGoals } from '@/lib/actions/course-track-actions'
import { reassignStudentGoal } from '@/lib/actions/instructor-goals-actions'
import { toast } from 'sonner'

interface GoalReassignmentPanelProps {
  studentId: string
  currentGoal?: {
    id: string
    name: string
    description: string
    targetAmount: string
    trackName: string
  }
  onGoalChanged?: () => void
}

export function GoalReassignmentPanel({
  studentId,
  currentGoal,
  onGoalChanged
}: GoalReassignmentPanelProps) {
  const queryClient = useQueryClient()
  const [selectedGoalId, setSelectedGoalId] = useState('')

  // Get all tracks and goals
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: getTracks
  })

  const { data: allGoals = [] } = useQuery({
    queryKey: ['track-goals', tracks.map(t => t.id).join(',')],
    queryFn: async () => {
      const goalPromises = tracks.map(track => getTrackGoals(track.id))
      const goalArrays = await Promise.all(goalPromises)
      return goalArrays.flat()
    },
    enabled: tracks.length > 0
  })

  // Reassign goal mutation (Architecture-compliant: TanStack mutation calls server action)
  const reassignMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const result = await reassignStudentGoal(
        studentId,
        goalId === 'remove' ? null : goalId
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to update goal assignment')
      }

      return result
    },
    onSuccess: (data, goalId) => {
      if (goalId === 'remove') {
        toast.success('Student goal removed - moved to pending review')
      } else {
        const goalName = allGoals.find(g => g.id === goalId)?.name || 'goal'
        toast.success(`Student reassigned to ${goalName}`)
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['instructor-student-goal', studentId] })
      queryClient.invalidateQueries({ queryKey: ['instructor-student-goals'] })
      onGoalChanged?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goal assignment')
    }
  })

  const handleReassign = () => {
    if (!selectedGoalId) {
      toast.error('Please select a goal first')
      return
    }
    reassignMutation.mutate(selectedGoalId)
  }

  const handleRemoveGoal = () => {
    reassignMutation.mutate('remove')
  }

  const formatGoalDisplay = (goal: any) => {
    // Goal names are now clean in the database (e.g., "$5K Agency", "$1K SaaS MRR")
    // So we can just use the name directly
    return goal.name || goal.description || 'Unknown Goal'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Goal Management
        </CardTitle>
        <CardDescription>
          Reassign student to different goals or remove their current goal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Goal Display */}
        {currentGoal && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Current Goal
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {currentGoal.name || currentGoal.description || 'Unknown Goal'}
            </div>
            <Badge variant="outline" className="mt-2 text-xs">
              {currentGoal.trackName}
            </Badge>
          </div>
        )}

        {/* Goal Selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Reassign to Goal</div>
          <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a goal to assign..." />
            </SelectTrigger>
            <SelectContent>
              {tracks.map(track => {
                const trackGoals = allGoals.filter(g => g.track_id === track.id)
                return trackGoals.length > 0 ? (
                  <div key={track.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {track.name}
                    </div>
                    {trackGoals.map(goal => (
                      <SelectItem
                        key={goal.id}
                        value={goal.id}
                        disabled={goal.id === currentGoal?.id}
                      >
                        <div className="flex items-center gap-2">
                          {formatGoalDisplay(goal)}
                          {goal.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ) : null
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleReassign}
            disabled={!selectedGoalId || reassignMutation.isPending}
            className="flex-1"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {reassignMutation.isPending ? 'Reassigning...' : 'Reassign Goal'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={!currentGoal || reassignMutation.isPending}
              >
                <UserX className="h-4 w-4 mr-2" />
                Remove Goal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Remove Student Goal
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the student's current goal assignment and move them back to
                  "pending instructor review" status. They will need a new goal assignment to continue.
                  <br /><br />
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveGoal}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Goal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded">
          <strong>Note:</strong> Reassigning will immediately change the student's goal and available courses.
          Removing will require the student to go through goal assignment again.
        </div>
      </CardContent>
    </Card>
  )
}