'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTracks, getTrackGoals } from '@/lib/actions/course-track-actions'
import { reassignStudentGoal } from '@/lib/actions/instructor-goals-actions'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

interface CompactGoalSelectorProps {
  studentId: string
  currentGoal?: {
    id: string
    name: string
  }
  onGoalChanged?: () => void
}

export function CompactGoalSelector({
  studentId,
  currentGoal,
  onGoalChanged
}: CompactGoalSelectorProps) {
  const queryClient = useQueryClient()
  const [selectedGoalId, setSelectedGoalId] = useState(currentGoal?.id || '')

  // Update selected goal when currentGoal changes
  useEffect(() => {
    if (currentGoal?.id) {
      setSelectedGoalId(currentGoal.id)
    }
  }, [currentGoal?.id])

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

  // Reassign goal mutation
  const reassignMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const result = await reassignStudentGoal(studentId, goalId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update goal assignment')
      }

      return result
    },
    onSuccess: (data, goalId) => {
      const goalName = allGoals.find(g => g.id === goalId)?.name || 'goal'
      toast.success(`Student reassigned to ${goalName}`)

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['instructor-student-goal', studentId] })
      queryClient.invalidateQueries({ queryKey: ['instructor-student-goals'] })
      onGoalChanged?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goal assignment')
      // Reset selection on error
      setSelectedGoalId(currentGoal?.id || '')
    }
  })

  const handleReassign = () => {
    if (!selectedGoalId || selectedGoalId === currentGoal?.id) {
      return
    }
    reassignMutation.mutate(selectedGoalId)
  }

  const formatGoalDisplay = (goal: any) => {
    return goal.name || goal.description || 'Unknown Goal'
  }

  const hasChanges = selectedGoalId !== currentGoal?.id && selectedGoalId !== ''
  const selectedGoalName = allGoals.find(g => g.id === selectedGoalId)?.name || currentGoal?.name || 'Select goal...'

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={selectedGoalName} />
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
                  >
                    {formatGoalDisplay(goal)}
                  </SelectItem>
                ))}
              </div>
            ) : null
          })}
        </SelectContent>
      </Select>

      {hasChanges && (
        <Button
          onClick={handleReassign}
          disabled={reassignMutation.isPending}
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {reassignMutation.isPending ? 'Reassigning...' : 'Reassign Goal'}
        </Button>
      )}
    </div>
  )
}
