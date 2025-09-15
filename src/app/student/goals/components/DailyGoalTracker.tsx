'use client'

import React, { useState } from 'react'
import { Target, Calendar, Plus, Clock, Video, MessageCircle, Trophy, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserGoalProgress, getDailyGoalData, createOrUpdateDailyNote } from '@/lib/actions/goals-actions'
import { createInstructorResponse, getInstructorResponsesForStudent, updateInstructorResponse } from '@/lib/actions/instructor-goals-actions'
import { uploadInstructorResponseFiles } from '@/lib/actions/instructor-response-attachments'
import { toast } from 'sonner'
import { DailyNoteImage } from './DailyNoteImage'
import { DailyNoteImageViewer } from './DailyNoteImageViewer'

interface DailyActivity {
  id: string
  type: 'auto' | 'manual'
  category: 'video' | 'quiz' | 'reflection' | 'hint' | 'question' | 'proposal' | 'call' | 'research' | 'application' | 'portfolio'
  description: string
  timestamp: string
  metadata?: {
    videoTitle?: string
    quizScore?: number
    hintsUsed?: number
    duration?: number
    platform?: string
    amount?: string
  }
}

interface DailyEntry {
  day: number
  date: string
  activities: DailyActivity[]
  studentNote?: string
  attachedFiles?: Array<{
    id: string
    filename: string
    original_filename: string
    file_size: number
    mime_type: string
    cdn_url?: string
    storage_path: string
    message_text?: string | null
  }>
}

interface Goal {
  id: string
  title: string
  currentAmount: string
  targetAmount: string
  progress: number
  targetDate: string
  startDate: string
  status: 'active' | 'completed'
}

// Mock data showing daily progress tracking
const mockGoal: Goal = {
  id: '1',
  title: 'UI/UX Designer to $4K/month',
  currentAmount: '$450',
  targetAmount: '$4,000',
  progress: 11,
  targetDate: '2025-03-17',
  startDate: '2024-09-17',
  status: 'active'
}


interface DailyGoalTrackerProps {
  goalProgress?: any
  dailyData?: any
  isLoading?: boolean
  studentId?: string // For instructor view
  isInstructorView?: boolean
  instructorId?: string
}

export function DailyGoalTracker({ 
  goalProgress: propGoalProgress,
  dailyData: propDailyData,
  isLoading: propIsLoading = false,
  studentId, 
  isInstructorView = false, 
  instructorId 
}: DailyGoalTrackerProps = {}) {
  const [newActivity, setNewActivity] = useState('')
  const [activityType, setActivityType] = useState<string>('')
  const [dailyNote, setDailyNote] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Per-day response state for instructors
  const [respondingToDay, setRespondingToDay] = useState<number | null>(null)
  const [dayResponseText, setDayResponseText] = useState('')
  const [isSubmittingDayResponse, setIsSubmittingDayResponse] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editingResponseText, setEditingResponseText] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null)

  // File upload state for instructor responses
  const [responseFiles, setResponseFiles] = useState<File[]>([])
  const [isResponseDragOver, setIsResponseDragOver] = useState(false)
  const queryClient = useQueryClient()

  // Instructor response state
  const [instructorResponse, setInstructorResponse] = useState('')
  const [selectedResponseDate, setSelectedResponseDate] = useState('')
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)

  // Get user's goal progress
  // Use passed props or fallback to fetching data for backwards compatibility
  // Don't fetch if this is instructor view or if props are being passed
  const shouldFetchOwnData = !isInstructorView && propGoalProgress === undefined && propDailyData === undefined
  
  const { data: goalProgress, isLoading: isLoadingGoal } = useQuery({
    queryKey: ['user-goal-progress'],
    queryFn: getUserGoalProgress,
    enabled: shouldFetchOwnData
  })

  const { data: dailyData, isLoading: isLoadingData } = useQuery({
    queryKey: ['daily-goal-data'],
    queryFn: () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      return getDailyGoalData({
        startDate: startDate.toISOString().split('T')[0],
        limit: 50
      })
    },
    refetchInterval: 30000,
    enabled: shouldFetchOwnData
  })

  // Use props if provided, otherwise use query results
  const finalGoalProgress = propGoalProgress || goalProgress
  const finalDailyData = propDailyData || dailyData
  const isLoading = propIsLoading || isLoadingGoal || isLoadingData

  // Mutation for creating daily notes
  const createNoteMutation = useMutation({
    mutationFn: createOrUpdateDailyNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-goal-data'] })
      setDailyNote('')
      setIsEditingNote(false)
      setAttachedFiles([])
      toast.success('Daily update saved!')
    },
    onError: (error) => {
      toast.error('Failed to save daily update')
      console.error(error)
    }
  })

  // Query to fetch instructor responses for this student
  const { data: instructorResponses, refetch: refetchInstructorResponses } = useQuery({
    queryKey: ['instructor-responses', studentId],
    queryFn: () => studentId ? getInstructorResponsesForStudent(studentId) : Promise.resolve([]),
    enabled: !!studentId,
    staleTime: 30000, // 30 seconds
  })

  // Mutation for instructor responses
  const createResponseMutation = useMutation({
    mutationFn: createInstructorResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-goal-data'] })
      refetchInstructorResponses() // Refetch to show new response
      setInstructorResponse('')
      setSelectedResponseDate('')
      setIsSubmittingResponse(false)
      toast.success('Response sent successfully!')
    },
    onError: (error) => {
      toast.error('Failed to send response')
      console.error(error)
      setIsSubmittingResponse(false)
    }
  })

  // Mutation for updating instructor responses
  const updateResponseMutation = useMutation({
    mutationFn: ({ responseId, updates }: { responseId: string, updates: any }) =>
      updateInstructorResponse(responseId, updates),
    onSuccess: () => {
      refetchInstructorResponses()
      setEditingResponseId(null)
      setEditingResponseText('')
      toast.success('Response updated successfully!')
    },
    onError: (error) => {
      toast.error('Failed to update response')
      console.error(error)
    }
  })

  // Use real goal data or fallback to mock
  const currentGoal = finalGoalProgress ? {
    id: '1',
    title: finalGoalProgress.goal_title || 'Set Your Goal',
    currentAmount: finalGoalProgress.goal_current_amount || '$0',
    targetAmount: finalGoalProgress.goal_target_amount || '$1,000',
    progress: finalGoalProgress.goal_progress || 0,
    targetDate: finalGoalProgress.goal_target_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startDate: finalGoalProgress.goal_start_date || new Date().toISOString().split('T')[0],
    status: finalGoalProgress.goal_status || 'active'
  } : mockGoal

  // Transform real data to match V1 format
  const transformedDailyEntries = React.useMemo(() => {
    if (!finalDailyData) return []
    
    const { dailyNotes, userActions } = finalDailyData
    const entriesMap = new Map<string, DailyEntry>()
    
    // Group user actions by date
    userActions.forEach(action => {
      const date = action.action_date
      if (!entriesMap.has(date)) {
        const daysSinceStart = Math.floor((new Date(date).getTime() - new Date(currentGoal.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        entriesMap.set(date, {
          day: daysSinceStart,
          date,
          activities: [],
          studentNote: undefined
        })
      }
      
      const entry = entriesMap.get(date)!
      entry.activities.push({
        id: action.id,
        type: action.action_type?.is_auto_tracked ? 'auto' : 'manual',
        category: mapActionTypeToCategory(action.action_type?.name || ''),
        description: action.description,
        timestamp: action.created_at,
        metadata: action.metadata
      })
    })
    
    // Add daily notes
    dailyNotes.forEach(note => {
      const date = note.note_date
      if (!entriesMap.has(date)) {
        const daysSinceStart = Math.floor((new Date(date).getTime() - new Date(currentGoal.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        entriesMap.set(date, {
          day: daysSinceStart,
          date,
          activities: [],
          studentNote: undefined,
          attachedFiles: []
        })
      }
      
      const entry = entriesMap.get(date)!
      entry.studentNote = note.note
      // Add attached files if they exist
      if (note.attachedFiles) {
        entry.attachedFiles = note.attachedFiles
      }
    })
    
    // Convert to array and sort by day descending
    return Array.from(entriesMap.values()).sort((a, b) => b.day - a.day)
  }, [finalDailyData, currentGoal.startDate])

  const currentDay = transformedDailyEntries.length > 0 ? Math.max(...transformedDailyEntries.map(entry => entry.day)) : 1
  const todaysEntry = transformedDailyEntries.find(entry => entry.day === currentDay)

  // Helper function to map action type names to V1 categories
  const mapActionTypeToCategory = (actionTypeName: string): DailyActivity['category'] => {
    const name = actionTypeName.toLowerCase()
    if (name.includes('video')) return 'video'
    if (name.includes('quiz')) return 'quiz' 
    if (name.includes('reflection')) return 'reflection'
    if (name.includes('hint')) return 'hint'
    if (name.includes('question')) return 'question'
    if (name.includes('call')) return 'call'
    if (name.includes('research')) return 'research'
    if (name.includes('application') || name.includes('proposal')) return 'application'
    if (name.includes('portfolio')) return 'portfolio'
    return 'research' // default fallback
  }

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'video': return '📹'
      case 'quiz': return '📝'
      case 'reflection': return '💭'
      case 'hint': return '💡'
      case 'question': return '❓'
      case 'proposal': return '📄'
      case 'call': return '📞'
      case 'research': return '🔍'
      case 'application': return '📧'
      case 'portfolio': return '🎨'
      default: return '✅'
    }
  }

  const getActivityTypeColor = (type: 'auto' | 'manual') => {
    return type === 'auto' ? 'text-blue-600' : 'text-gray-600'
  }

  const addManualActivity = () => {
    if (!newActivity.trim() || !activityType) return
    
    console.log('Adding manual activity:', { type: activityType, description: newActivity })
    setNewActivity('')
    setActivityType('')
  }

  const handleFilesDrop = (files: FileList) => {
    const newFiles = Array.from(files)
    setAttachedFiles(prev => [...prev, ...newFiles])
    console.log('Files attached:', newFiles.map(f => f.name))
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleFilePicker = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,application/pdf,.txt,.doc,.docx'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        handleFilesDrop(target.files)
      }
    }
    input.click()
  }

  const openImageViewer = (entry: DailyEntry, imageIndex: number) => {
    console.log('🖼️ openImageViewer called:', { entry, imageIndex })
    setSelectedEntry(entry)
    setSelectedImageIndex(imageIndex)
    setImageViewerOpen(true)
    console.log('🖼️ Modal state set to open')
  }

  const closeImageViewer = () => {
    setImageViewerOpen(false)
    setSelectedEntry(null)
    setSelectedImageIndex(0)
  }

  // File handling for instructor responses
  const handleResponseFilesDrop = (files: FileList) => {
    const newFiles = Array.from(files)
    setResponseFiles(prev => [...prev, ...newFiles])
    console.log('Response files attached:', newFiles.map(f => f.name))
  }

  const removeResponseFile = (index: number) => {
    setResponseFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleResponseFilePicker = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,application/pdf,.txt,.doc,.docx'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        handleResponseFilesDrop(target.files)
      }
    }
    input.click()
  }

  // Helper function to get instructor response for a specific date (only one per day)
  const getResponseForDate = (date: string) => {
    if (!instructorResponses) return null
    const responses = instructorResponses.filter((response: any) => response.target_date === date)
    return responses.length > 0 ? responses[0] : null // Only return the first/latest response
  }

  const updateDailyNote = () => {
    if (!dailyNote.trim()) return
    
    // Prepare FormData for files if any are attached
    let formData: FormData | undefined
    if (attachedFiles.length > 0) {
      formData = new FormData()
      attachedFiles.forEach((file, index) => {
        formData!.append(`file_${index}`, file)
      })
    }
    
    createNoteMutation.mutate({
      note: dailyNote.trim(),
      noteDate: new Date().toISOString().split('T')[0],
      files: formData
    })
  }

  // Handle day-specific instructor response submission
  const handleDayResponse = async (entry: DailyEntry) => {
    if (!dayResponseText.trim() || !studentId || !isInstructorView) {
      toast.error('Please enter a response message')
      return
    }

    setIsSubmittingDayResponse(true)

    try {
      // First create the response
      const response = await createInstructorResponse({
        studentId,
        message: dayResponseText.trim(),
        targetDate: entry.date,
        responseType: 'feedback'
      })

      // Then upload files if any
      if (responseFiles.length > 0 && response) {
        const formData = new FormData()
        responseFiles.forEach((file, index) => {
          formData.append(`file_${index}`, file)
        })

        try {
          await uploadInstructorResponseFiles({
            responseId: response.id,
            files: formData
          })
        } catch (fileError) {
          console.error('File upload error:', fileError)
          toast.error('Response sent but some files failed to upload')
        }
      }

      // Reset form and refetch data
      setRespondingToDay(null)
      setDayResponseText('')
      setResponseFiles([])
      setIsSubmittingDayResponse(false)
      refetchInstructorResponses() // Refetch to show new response
      toast.success('Response sent successfully!')

    } catch (error) {
      console.error('Response creation error:', error)
      setIsSubmittingDayResponse(false)
      toast.error('Failed to send response')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your goal progress...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Goal Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <div>
                <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">{currentGoal.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span>Current: <span className="font-semibold text-gray-900 dark:text-gray-100">{currentGoal.currentAmount}</span></span>
                  <span>Target: <span className="font-semibold text-gray-900 dark:text-gray-100">{currentGoal.targetAmount}</span></span>
                  <span>Started: {new Date(currentGoal.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">Day {currentDay}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{currentGoal.progress}% Complete</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gray-900 dark:bg-gray-300 h-3 rounded-full transition-all"
                style={{ width: `${currentGoal.progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>


      {/* Today's Activity Input - Only for students */}
      {!isInstructorView && (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Day {currentDay} - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-tracked activities for today */}
          {todaysEntry && todaysEntry.activities.filter(a => a.type === 'auto').length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unpuzzle tracked your activity today ({todaysEntry.activities.filter(a => a.type === 'auto').length} activities)
                </h4>
                {todaysEntry.activities.filter(a => a.type === 'auto').length > 3 && (
                  <button 
                    onClick={() => setShowAllActivities(!showAllActivities)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAllActivities ? 'Show less' : 'View all'}
                  </button>
                )}
              </div>
              
              <div className={`space-y-1 ${!showAllActivities && todaysEntry.activities.filter(a => a.type === 'auto').length > 3 ? 'max-h-24 overflow-hidden' : ''}`}>
                {todaysEntry.activities
                  .filter(a => a.type === 'auto')
                  .map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-800 rounded border border-blue-200 dark:border-gray-700">
                      <span className="text-sm">{getActivityIcon(activity.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-900 dark:text-gray-100 text-xs font-medium truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-gray-400">
                          <span>{new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}</span>
                          {activity.metadata && (
                            <>
                              {activity.metadata.duration && <span>• {activity.metadata.duration}min</span>}
                              {activity.metadata.quizScore && <span>• {activity.metadata.quizScore}%</span>}
                              {activity.metadata.hintsUsed && <span>• {activity.metadata.hintsUsed} hints</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {!showAllActivities && todaysEntry.activities.filter(a => a.type === 'auto').length > 3 && (
                <div className="text-center mt-2">
                  <button 
                    onClick={() => setShowAllActivities(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    +{todaysEntry.activities.filter(a => a.type === 'auto').length - 3} more activities
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Single journal-style input - only show if no note exists for today */}
          {!todaysEntry?.studentNote && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What else did you do today to get closer to your goal?
            </h4>
            
            {/* Drag and drop area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleFilesDrop(e.dataTransfer.files)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragOver(false)
              }}
            >
              <Textarea
                placeholder="Applied to 5 UI jobs on LinkedIn today. Also had a great call with a potential client about their e-commerce redesign - they want to pay $1200! 

Share what you accomplished, any challenges you faced, insights you gained, or how you're feeling about your progress..."
                value={dailyNote}
                onChange={(e) => setDailyNote(e.target.value)}
                className="min-h-[120px] border-none resize-none shadow-none p-0 focus-visible:ring-0 bg-transparent"
              />
              
              {/* Attached files display */}
              {attachedFiles.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Attached files ({attachedFiles.length}):
                  </div>
                  <div className="space-y-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📎</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(file.size / 1024)}KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📎 Drag files here or</span>
                  <button 
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    onClick={handleFilePicker}
                  >
                    browse to attach
                  </button>
                </div>
                <Button 
                  onClick={updateDailyNote} 
                  disabled={!dailyNote.trim() || createNoteMutation.isPending}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {createNoteMutation.isPending ? 'Saving...' : `Save Day ${currentDay}`}
                </Button>
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Daily Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Progress Timeline
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400">Track your daily actions and see your consistent progress</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {transformedDailyEntries.map((entry) => (
              <div key={entry.day} className="relative group">
                {/* Day Indicator */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white ${
                    entry.day === currentDay ? 'bg-gray-900' : 'bg-gray-400'
                  }`}>
                    <div className="text-center">
                      <div className="text-xs">DAY</div>
                      <div className="text-lg leading-none">{entry.day}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </h3>
                      {entry.day === currentDay && (
                        <Badge className="bg-gray-100 text-gray-800">Today</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.activities.length} activities completed
                    </div>
                  </div>

                  {/* Instructor Respond Button - appears on hover */}
                  {isInstructorView && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={() => {
                        const existingResponse = getResponseForDate(entry.date)
                        if (existingResponse) {
                          setEditingResponseId(existingResponse.id)
                          setEditingResponseText(existingResponse.message)
                        } else {
                          setRespondingToDay(entry.day)
                          setDayResponseText('')
                          setResponseFiles([])
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {getResponseForDate(entry.date) ? 'Edit Response' : 'Respond'}
                    </Button>
                  )}
                </div>

                {/* Activities */}
                <div className="ml-20 space-y-2">
                  {/* Separate auto-tracked and manual activities */}
                  {entry.activities.filter(a => a.type === 'auto').length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-blue-700 dark:text-gray-300 mb-1">
                        Unpuzzle tracked ({entry.activities.filter(a => a.type === 'auto').length})
                      </h5>
                      {entry.activities.filter(a => a.type === 'auto').map((activity) => (
                        <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-800 rounded border border-blue-200 dark:border-gray-700">
                          <span className="text-sm">{getActivityIcon(activity.category)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-900 dark:text-gray-100 text-xs font-medium truncate">{activity.description}</p>
                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-gray-400">
                              <span>{new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}</span>
                              {activity.metadata && (
                                <>
                                  {activity.metadata.duration && <span>• {activity.metadata.duration}min</span>}
                                  {activity.metadata.quizScore && <span>• {activity.metadata.quizScore}%</span>}
                                  {activity.metadata.hintsUsed && <span>• {activity.metadata.hintsUsed} hints</span>}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Student's daily message */}
                  {entry.studentNote ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">Your daily update</h5>
                        {entry.day === currentDay && !isEditingNote && !isInstructorView && (
                          <button
                            onClick={() => {
                              setIsEditingNote(true)
                              setDailyNote('') // Start with empty to add new bullet point
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Add more
                          </button>
                        )}
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed whitespace-pre-line">{entry.studentNote}</p>
                        
                        {/* Display attached files */}
                        {entry.attachedFiles && entry.attachedFiles.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            {console.log('🖼️ DEBUG: Attached files for entry:', entry.attachedFiles)}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {entry.attachedFiles.map((file, fileIndex) => (
                                <div key={file.id} className="group relative">
                                  {file.mime_type.startsWith('image/') ? (
                                    // Image preview using signed URL
                                    <div className="relative">
                                      <DailyNoteImage
                                        privateUrl={file.cdn_url}
                                        originalFilename={file.original_filename}
                                        className="w-full h-32"
                                        onClick={() => {
                                          console.log('🖼️ Image clicked!', file.original_filename)
                                          const imageFiles = entry.attachedFiles?.filter(f => f.mime_type.startsWith('image/')) || []
                                          const imageIndex = imageFiles.findIndex(f => f.id === file.id)
                                          console.log('🖼️ Opening viewer with index:', imageIndex, 'of', imageFiles.length, 'images')
                                          openImageViewer(entry, imageIndex)
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-end pointer-events-none">
                                        <div className="p-2 w-full pointer-events-none">
                                          <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate pointer-events-none">
                                            {file.original_filename}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Non-image file
                                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                                      <div className="text-lg">📄</div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                          {file.original_filename}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {Math.round(file.file_size / 1024)}KB
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Inline edit input - appears right below the note */}
                      {entry.day === currentDay && isEditingNote && !isInstructorView && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Add another accomplishment:</span>
                            <button
                              onClick={() => {
                                setIsEditingNote(false)
                                setDailyNote('')
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                          
                          {/* Drag and drop area for inline input */}
                          <div 
                            className={`border border-dashed rounded p-3 transition-colors ${
                              isDragOver 
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                            }`}
                            onDrop={(e) => {
                              e.preventDefault()
                              setIsDragOver(false)
                              handleFilesDrop(e.dataTransfer.files)
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              setIsDragOver(true)
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault()
                              setIsDragOver(true)
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              setIsDragOver(false)
                            }}
                          >
                            <Textarea
                              placeholder="Another win for today... (or drag files here)"
                              value={dailyNote}
                              onChange={(e) => setDailyNote(e.target.value)}
                              className="min-h-[60px] text-sm border-none resize-none shadow-none p-0 focus-visible:ring-0 bg-transparent"
                            />
                            
                            {/* Attached files display for inline input */}
                            {attachedFiles.length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Attached ({attachedFiles.length}):
                                </div>
                                <div className="space-y-1">
                                  {attachedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-1 bg-white dark:bg-gray-600 rounded text-xs">
                                      <div className="flex items-center gap-1">
                                        <span>📎</span>
                                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                          {file.name}
                                        </span>
                                        <span className="text-gray-500">
                                          ({Math.round(file.size / 1024)}KB)
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => removeFile(index)}
                                        className="text-red-500 hover:text-red-700 ml-1"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>📎 Drag files or</span>
                                <button 
                                  className="text-blue-600 hover:text-blue-700 font-medium"
                                  onClick={handleFilePicker}
                                >
                                  browse
                                </button>
                              </div>
                              <Button 
                                onClick={updateDailyNote} 
                                disabled={!dailyNote.trim() || createNoteMutation.isPending}
                                size="sm"
                                className="bg-gray-900 hover:bg-gray-800"
                              >
                                {createNoteMutation.isPending ? 'Adding...' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : entry.day === currentDay ? (
                    <div className="mt-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-xs italic">Pending your progress update for today...</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Instructor Response Display (only one per day) */}
                  {getResponseForDate(entry.date) && (
                    <div className="mt-4">
                      <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Instructor Feedback
                      </h6>
                      {editingResponseId === getResponseForDate(entry.date)?.id ? (
                        // Edit mode
                        <div className="p-3 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg">
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Edit your response..."
                              value={editingResponseText}
                              onChange={(e) => setEditingResponseText(e.target.value)}
                              className="min-h-[80px] text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingResponseId(null)
                                  setEditingResponseText('')
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateResponseMutation.mutate({
                                    responseId: getResponseForDate(entry.date)!.id,
                                    updates: { message: editingResponseText }
                                  })
                                }}
                                disabled={!editingResponseText.trim() || updateResponseMutation.isPending}
                              >
                                {updateResponseMutation.isPending ? 'Updating...' : 'Update'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                  Instructor Response
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  {new Date(getResponseForDate(entry.date)!.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                {getResponseForDate(entry.date)!.message}
                              </p>

                              {/* Display attached files in instructor responses */}
                              {getResponseForDate(entry.date)!.attachedFiles && getResponseForDate(entry.date)!.attachedFiles!.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {getResponseForDate(entry.date)!.attachedFiles!.map((file, fileIndex) => (
                                      <div key={file.id} className="group relative">
                                        {file.mime_type.startsWith('image/') ? (
                                          // Image preview
                                          <div className="relative">
                                            <DailyNoteImage
                                              privateUrl={file.cdn_url}
                                              originalFilename={file.original_filename}
                                              className="w-full h-32"
                                              onClick={() => {
                                                // Create temporary entry structure for image viewer
                                                const tempEntry = {
                                                  ...entry,
                                                  attachedFiles: getResponseForDate(entry.date)!.attachedFiles
                                                }
                                                const imageFiles = getResponseForDate(entry.date)!.attachedFiles!.filter(f => f.mime_type.startsWith('image/')) || []
                                                const imageIndex = imageFiles.findIndex(f => f.id === file.id)
                                                openImageViewer(tempEntry, imageIndex)
                                              }}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-end pointer-events-none">
                                              <div className="p-2 w-full pointer-events-none">
                                                <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate pointer-events-none">
                                                  {file.original_filename}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          // Non-image file
                                          <div className="flex items-center gap-2 p-3 bg-white dark:bg-green-800 rounded-lg border border-green-200 dark:border-green-600">
                                            <div className="text-lg">📄</div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-green-900 dark:text-green-100 truncate">
                                                {file.original_filename}
                                              </p>
                                              <p className="text-xs text-green-600 dark:text-green-400">
                                                {Math.round(file.file_size / 1024)}KB
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructor Response Form */}
                  {isInstructorView && respondingToDay === entry.day && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Respond to Day {entry.day}
                        </h6>
                        <button
                          onClick={() => {
                            setRespondingToDay(null)
                            setResponseFiles([])
                          }}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Quick Response Templates */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDayResponseText('Great progress! Keep up the excellent work. Your dedication is really showing in your results.')}
                          >
                            🌟 Encourage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDayResponseText('I\'d like you to focus on [specific area] next. This will help accelerate your progress toward your goal.')}
                          >
                            📋 Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDayResponseText('Let\'s schedule a quick 15-minute call to discuss your progress and next steps. When works best for you?')}
                          >
                            📞 Call
                          </Button>
                        </div>

                        {/* Response Input */}
                        <Textarea
                          placeholder="Provide feedback, encouragement, or assign tasks..."
                          value={dayResponseText}
                          onChange={(e) => setDayResponseText(e.target.value)}
                          className="min-h-[80px] text-sm"
                        />

                        {/* File Upload Section */}
                        <div className="space-y-3">
                          {/* File Drop Zone */}
                          <div
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                              isResponseDragOver
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault()
                              setIsResponseDragOver(true)
                            }}
                            onDragLeave={() => setIsResponseDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setIsResponseDragOver(false)
                              if (e.dataTransfer.files) {
                                handleResponseFilesDrop(e.dataTransfer.files)
                              }
                            }}
                          >
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                              <span className="text-lg">📎</span>
                              <p>Drag files here or <button
                                type="button"
                                onClick={handleResponseFilePicker}
                                className="text-blue-600 hover:text-blue-700 underline"
                              >
                                click to browse
                              </button></p>
                              <p className="text-xs mt-1">Images, PDFs, Word docs (5MB max per file)</p>
                            </div>
                          </div>

                          {/* Attached Files List */}
                          {responseFiles.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Attached files ({responseFiles.length}):
                              </div>
                              <div className="space-y-2">
                                {responseFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded border">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">📎</span>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                        {file.name}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({Math.round(file.size / 1024)}KB)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => removeResponseFile(index)}
                                      className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Send Button */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleDayResponse(entry)}
                            disabled={!dayResponseText.trim() || isSubmittingDayResponse}
                            size="sm"
                            className="min-w-[100px]"
                          >
                            {isSubmittingDayResponse ? 'Sending...' : 'Send Response'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline connector */}
                {entry.day > 1 && (
                  <div className="absolute left-8 top-20 w-0.5 h-12 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {selectedEntry && (
        <DailyNoteImageViewer
          isOpen={imageViewerOpen}
          onClose={closeImageViewer}
          initialImageIndex={selectedImageIndex}
          dailyEntry={selectedEntry}
        />
      )}
    </div>
  )
}