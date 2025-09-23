'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Target, Loader2, User, FileText, ArrowUpDown } from 'lucide-react'

interface AcceptTrackChangeModalProps {
  isOpen: boolean
  onClose: () => void
  request: any
  onAccept: (requestId: string, goalId: string) => void
  isAccepting: boolean
}

export default function AcceptTrackChangeModal({
  isOpen,
  onClose,
  request,
  onAccept,
  isAccepting
}: AcceptTrackChangeModalProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')

  const metadata = request?.metadata || {}
  const questionnaireData = metadata.questionnaire_responses || {}
  const trackType = metadata.desired_track_type || 'agency'

  // Get available goals for the desired track (load immediately)
  const { data: availableGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['track-goals', metadata.desired_track],
    queryFn: async () => {
      const response = await fetch(`/api/track-goals?track=${metadata.desired_track}`)
      if (!response.ok) throw new Error('Failed to fetch goals')
      return response.json()
    },
    enabled: !!metadata.desired_track // Remove isOpen dependency
  })

  const handleAccept = () => {
    if (selectedGoalId && request?.id) {
      onAccept(request.id, selectedGoalId)
    }
  }

  if (!request) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Accept Track Change
          </DialogTitle>
          <DialogDescription>
            Assign goal for {metadata.desired_track}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track Change Summary - Compact */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span className="font-medium">{metadata.current_track}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{metadata.desired_track}</span>
              </div>
            </div>
          </div>


          {/* Goal Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <h3 className="font-medium">Assign Goal</h3>
            </div>

            {goalsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available goals...
              </div>
            ) : availableGoals && availableGoals.length > 0 ? (
              <div className="space-y-4">
                <RadioGroup value={selectedGoalId} onValueChange={setSelectedGoalId}>
                  {availableGoals.map((goal: any) => (
                    <div key={goal.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <RadioGroupItem value={goal.id} id={goal.id} />
                      <Label htmlFor={goal.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {trackType === 'agency' ? '$' + (goal.target_amount || 0).toLocaleString() : '$' + (goal.target_amount || 0).toLocaleString() + '/mo'}
                            </Badge>
                            <span className="font-medium">{goal.description || goal.name}</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {selectedGoalId && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Goal selected. Click "Accept & Assign Goal" to complete the track change.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  No goals available for {metadata.desired_track}. Please create goals for this track first.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAccepting}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!selectedGoalId || isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept & Assign Goal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}