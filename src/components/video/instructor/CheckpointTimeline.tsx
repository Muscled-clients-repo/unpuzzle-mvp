"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit2, Play, Users, CheckCircle, XCircle } from "lucide-react"
import { InstructorCheckpoint } from "@/app/actions/instructor-checkpoints-actions"
import { cn } from "@/lib/utils"

interface CheckpointTimelineProps {
  checkpoints: InstructorCheckpoint[]
  currentVideoTime: number
  onEditCheckpoint: (checkpoint: InstructorCheckpoint) => void
  onSeekToCheckpoint: (timestamp: number) => void
}

export function CheckpointTimeline({
  checkpoints,
  currentVideoTime,
  onEditCheckpoint,
  onSeekToCheckpoint
}: CheckpointTimelineProps) {

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get icon and color for checkpoint type
  const getCheckpointIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return { icon: '🎯', label: 'Quiz', color: 'text-blue-600' }
      case 'reflection':
        return { icon: '💭', label: 'Reflection', color: 'text-purple-600' }
      case 'voice_memo':
        return { icon: '🎤', label: 'Voice Memo', color: 'text-green-600' }
      default:
        return { icon: '📝', label: 'Checkpoint', color: 'text-gray-600' }
    }
  }

  // Sort checkpoints by timestamp
  const sortedCheckpoints = [...checkpoints].sort((a, b) =>
    a.timestamp_seconds - b.timestamp_seconds
  )

  return (
    <div className="space-y-3">
      {sortedCheckpoints.map((checkpoint) => {
        const { icon, label, color } = getCheckpointIcon(checkpoint.prompt_type)
        const isActive = currentVideoTime >= checkpoint.timestamp_seconds - 5 &&
                        currentVideoTime <= checkpoint.timestamp_seconds + 5

        return (
          <Card
            key={checkpoint.id}
            className={cn(
              "p-4 transition-all border-l-4",
              isActive ? "border-l-primary bg-primary/5" : "border-l-border",
              !checkpoint.is_active && "opacity-60"
            )}
          >
            <div className="space-y-3">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatTime(checkpoint.timestamp_seconds)}
                    </Badge>
                    {checkpoint.is_required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {!checkpoint.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate">
                    {checkpoint.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {label}
                    {checkpoint.instructions && ` • ${checkpoint.instructions.substring(0, 50)}${checkpoint.instructions.length > 50 ? '...' : ''}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onSeekToCheckpoint(checkpoint.timestamp_seconds)}
                    title="Jump to timestamp"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEditCheckpoint(checkpoint)}
                    title="Edit checkpoint"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Quiz-specific info */}
              {checkpoint.prompt_type === 'quiz' && checkpoint.quiz_questions && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    {Array.isArray(checkpoint.quiz_questions) ? checkpoint.quiz_questions.length : 0} question{Array.isArray(checkpoint.quiz_questions) && checkpoint.quiz_questions.length !== 1 ? 's' : ''}
                  </span>
                  {checkpoint.passing_score && (
                    <span>Passing: {checkpoint.passing_score}%</span>
                  )}
                </div>
              )}

              {/* Reflection-specific info */}
              {checkpoint.prompt_type === 'reflection' && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  {checkpoint.requires_video && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Video required
                    </span>
                  )}
                  {checkpoint.requires_audio && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Audio required
                    </span>
                  )}
                  {!checkpoint.requires_video && !checkpoint.requires_audio && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Text only
                    </span>
                  )}
                </div>
              )}

              {/* Placeholder for completion stats */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Users className="h-3 w-3" />
                <span>0 completions</span>
                <span className="text-muted-foreground/60">•</span>
                <span>0% completion rate</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
