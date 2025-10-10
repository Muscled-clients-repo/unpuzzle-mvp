"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Target } from "lucide-react"
import { CheckpointTimeline } from "./CheckpointTimeline"
import { CheckpointForm } from "./CheckpointForm"
import { getVideoCheckpoints, type InstructorCheckpoint } from "@/app/actions/instructor-checkpoints-actions"
import { VideoPlayerCoreRef } from "../core/VideoPlayerCore"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

interface CheckpointEditorSidebarProps {
  videoId: string
  currentVideoTime: number
  videoPlayerRef: React.RefObject<VideoPlayerCoreRef>
}

export function CheckpointEditorSidebar({
  videoId,
  currentVideoTime,
  videoPlayerRef
}: CheckpointEditorSidebarProps) {
  const [checkpoints, setCheckpoints] = useState<InstructorCheckpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCheckpointForm, setShowCheckpointForm] = useState(false)
  const [editingCheckpoint, setEditingCheckpoint] = useState<InstructorCheckpoint | null>(null)
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null)

  // Load checkpoints
  useEffect(() => {
    loadCheckpoints()
  }, [videoId])

  const loadCheckpoints = async () => {
    setIsLoading(true)
    const result = await getVideoCheckpoints(videoId, false) // Load all (active + inactive)
    if (result.checkpoints) {
      setCheckpoints(result.checkpoints as InstructorCheckpoint[])
    }
    setIsLoading(false)
  }

  const handleAddCheckpoint = () => {
    // Use current video time as default timestamp
    const timestamp = videoPlayerRef.current?.getCurrentTime() || 0
    setSelectedTimestamp(timestamp)
    setEditingCheckpoint(null)
    setShowCheckpointForm(true)
  }

  const handleEditCheckpoint = (checkpoint: InstructorCheckpoint) => {
    setEditingCheckpoint(checkpoint)
    setSelectedTimestamp(checkpoint.timestamp_seconds)
    setShowCheckpointForm(true)
  }

  const handleCloseForm = () => {
    setShowCheckpointForm(false)
    setEditingCheckpoint(null)
    setSelectedTimestamp(null)
  }

  const handleCheckpointSaved = () => {
    loadCheckpoints()
    handleCloseForm()
  }

  const handleCheckpointDeleted = () => {
    loadCheckpoints()
    handleCloseForm()
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Show form view when creating/editing
  if (showCheckpointForm) {
    return (
      <div className="flex flex-col h-full">
        <CheckpointForm
          videoId={videoId}
          checkpoint={editingCheckpoint}
          defaultTimestamp={selectedTimestamp || 0}
          onSave={handleCheckpointSaved}
          onDelete={handleCheckpointDeleted}
          onClose={handleCloseForm}
          inline={true}
          videoPlayerRef={videoPlayerRef}
        />
      </div>
    )
  }

  // Show timeline view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Checkpoints</h2>
          </div>
          <Button
            size="sm"
            onClick={handleAddCheckpoint}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} on this video
        </p>
      </div>

      {/* Checkpoint Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {checkpoints.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No checkpoints yet
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Add quizzes, reflections, or voice memos at specific timestamps
              </p>
              <Button onClick={handleAddCheckpoint} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create First Checkpoint
              </Button>
            </div>
          ) : (
            <CheckpointTimeline
              checkpoints={checkpoints}
              currentVideoTime={currentVideoTime}
              onEditCheckpoint={handleEditCheckpoint}
              onSeekToCheckpoint={(timestamp) => {
                // Seek video to checkpoint timestamp
                if (videoPlayerRef.current) {
                  videoPlayerRef.current.pause()
                  // VideoPlayerCore doesn't expose seek directly, would need to add it
                  // For now, this is a placeholder
                }
              }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
