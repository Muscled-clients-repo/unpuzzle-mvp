"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Trash2, Plus, X, RefreshCw } from "lucide-react"
import {
  createCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  toggleCheckpointActive,
  type InstructorCheckpoint,
  type CheckpointType
} from "@/app/actions/instructor-checkpoints-actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CheckpointFormProps {
  videoId: string
  checkpoint?: InstructorCheckpoint | null
  defaultTimestamp: number
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  inline?: boolean // If true, render without Dialog wrapper
  videoPlayerRef?: React.RefObject<{ getCurrentTime: () => number }>
}

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
}

export function CheckpointForm({
  videoId,
  checkpoint,
  defaultTimestamp,
  onSave,
  onDelete,
  onClose,
  inline = false,
  videoPlayerRef
}: CheckpointFormProps) {
  const isEditing = !!checkpoint

  // Form state
  const [checkpointType, setCheckpointType] = useState<CheckpointType>(
    checkpoint?.prompt_type || 'quiz'
  )
  const [timestamp, setTimestamp] = useState(
    checkpoint?.timestamp_seconds || defaultTimestamp
  )
  const [title, setTitle] = useState(checkpoint?.title || '')
  const [instructions, setInstructions] = useState(checkpoint?.instructions || '')
  const [isRequired, setIsRequired] = useState(checkpoint?.is_required || false)
  const [isActive, setIsActive] = useState(checkpoint?.is_active ?? true)

  // Quiz-specific state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    checkpoint?.quiz_questions || [{ question: '', options: ['', '', '', ''], correctAnswer: '' }]
  )
  const [passingScore, setPassingScore] = useState(checkpoint?.passing_score || 70)

  // Reflection-specific state
  const [reflectionPrompt, setReflectionPrompt] = useState(checkpoint?.reflection_prompt || '')
  const [requiresVideo, setRequiresVideo] = useState(checkpoint?.requires_video || false)
  const [requiresAudio, setRequiresAudio] = useState(checkpoint?.requires_audio || false)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Format seconds to MM:SS for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Parse MM:SS to seconds
  const parseTime = (timeString: string): number => {
    const [mins, secs] = timeString.split(':').map(Number)
    return (mins || 0) * 60 + (secs || 0)
  }

  const handleAddQuizQuestion = () => {
    setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correctAnswer: '' }])
  }

  const handleRemoveQuizQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const updated = [...quizQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setQuizQuestions(updated)
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizQuestions]
    updated[questionIndex].options[optionIndex] = value
    setQuizQuestions(updated)
  }

  const handleUpdateTimestamp = () => {
    if (videoPlayerRef?.current) {
      const currentTime = videoPlayerRef.current.getCurrentTime()
      setTimestamp(currentTime)
    }
  }

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (checkpointType === 'quiz' && quizQuestions.length === 0) {
      toast.error('Please add at least one quiz question')
      return
    }

    if (checkpointType === 'quiz') {
      for (const q of quizQuestions) {
        if (!q.question.trim()) {
          toast.error('All quiz questions must have text')
          return
        }
        if (q.options.some(opt => !opt.trim())) {
          toast.error('All quiz options must be filled')
          return
        }
        if (!q.correctAnswer.trim()) {
          toast.error('Each quiz question must have a correct answer')
          return
        }
      }
    }

    if (checkpointType === 'reflection' && !reflectionPrompt.trim()) {
      toast.error('Please enter a reflection prompt')
      return
    }

    setIsSaving(true)

    try {
      const data = {
        media_file_id: videoId,
        prompt_type: checkpointType,
        timestamp_seconds: timestamp,
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        is_required: isRequired,
        is_active: isActive,
        ...(checkpointType === 'quiz' && {
          quiz_questions: quizQuestions,
          passing_score: passingScore
        }),
        ...(checkpointType === 'reflection' && {
          reflection_prompt: reflectionPrompt.trim(),
          requires_video: requiresVideo,
          requires_audio: requiresAudio
        })
      }

      let result
      if (isEditing) {
        result = await updateCheckpoint(checkpoint.id, data)
      } else {
        result = await createCheckpoint(data)
      }

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? 'Checkpoint updated' : 'Checkpoint created')
      onSave()
    } catch (error) {
      toast.error('An error occurred')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!checkpoint) return

    if (!confirm('Are you sure you want to delete this checkpoint?')) {
      return
    }

    setIsDeleting(true)

    try {
      const result = await deleteCheckpoint(checkpoint.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Checkpoint deleted')
      onDelete()
    } catch (error) {
      toast.error('Failed to delete checkpoint')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formContent = (
    <div className="space-y-6">
          {/* Basic Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Checkpoint Type</Label>
                <Select
                  value={checkpointType}
                  onValueChange={(value) => setCheckpointType(value as CheckpointType)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">🎯 Quiz</SelectItem>
                    <SelectItem value="reflection">💭 Reflection</SelectItem>
                    <SelectItem value="voice_memo">🎤 Voice Memo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp">Timestamp</Label>
                <div className="flex gap-2">
                  <Input
                    id="timestamp"
                    value={formatTime(timestamp)}
                    onChange={(e) => setTimestamp(parseTime(e.target.value))}
                    placeholder="5:30"
                    className="flex-1"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleUpdateTimestamp}
                          disabled={!videoPlayerRef}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Update to current video time</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Understanding useState"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Additional context or instructions for students"
                rows={2}
              />
            </div>

            {/* Settings */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="required" className="font-medium">Required Checkpoint</Label>
                <p className="text-xs text-muted-foreground">Block video progress until completed</p>
              </div>
              <Switch
                id="required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="active" className="font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Visible to students</p>
              </div>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          {/* Type-Specific Fields */}
          <Tabs value={checkpointType} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="reflection">Reflection</TabsTrigger>
              <TabsTrigger value="voice_memo">Voice Memo</TabsTrigger>
            </TabsList>

            <TabsContent value="quiz" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Quiz Questions</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuizQuestion}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>

                {quizQuestions.map((q, qIndex) => (
                  <Card key={qIndex} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          placeholder={`Question ${qIndex + 1}`}
                          value={q.question}
                          onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                        />
                        {quizQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuizQuestion(qIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Options</Label>
                        {q.options.map((opt, oIndex) => (
                          <Input
                            key={oIndex}
                            placeholder={`Option ${oIndex + 1}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          />
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`correct-${qIndex}`} className="text-xs">Correct Answer</Label>
                        <Input
                          id={`correct-${qIndex}`}
                          placeholder="Enter the correct answer (must match one option exactly)"
                          value={q.correctAnswer}
                          onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing-score">Passing Score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                />
              </div>
            </TabsContent>

            <TabsContent value="reflection" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reflection-prompt">Reflection Prompt</Label>
                <Textarea
                  id="reflection-prompt"
                  value={reflectionPrompt}
                  onChange={(e) => setReflectionPrompt(e.target.value)}
                  placeholder="What did you learn from this section? How would you apply it?"
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Submission Requirements</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="requires-video">Requires Video Response</Label>
                  <Switch
                    id="requires-video"
                    checked={requiresVideo}
                    onCheckedChange={setRequiresVideo}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="requires-audio">Requires Audio Response</Label>
                  <Switch
                    id="requires-audio"
                    checked={requiresAudio}
                    onCheckedChange={setRequiresAudio}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="voice_memo" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Students will be prompted to record a voice memo at this timestamp.
                The prompt will use the title and instructions you provided above.
              </p>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
  )

  // Render inline (in sidebar)
  if (inline) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              {isEditing ? 'Edit Checkpoint' : 'Create Checkpoint'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Modify this checkpoint' : 'Add a new checkpoint at'} {formatTime(timestamp)}
          </p>
        </div>

        {/* Form Content - Scrollable */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {formContent}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Render as modal (default)
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Checkpoint' : 'Create Checkpoint'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modify this checkpoint' : 'Add a new checkpoint at'} {formatTime(timestamp)}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
