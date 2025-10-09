'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Target, Calendar, MessageCircle, Plus, Clock, DollarSign, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useConversationData, useCreateMessageWithAttachments, useUpdateMessage, useUploadMessageAttachments, useDeleteMessageAttachment, usePublishDraftEdit } from '@/hooks/use-conversation-data'
import { updateMessage } from '@/lib/actions/conversation-actions'
import { useMessageForm, type ExistingAttachment } from '@/hooks/use-message-form'
import { useConversationUI } from '@/hooks/use-conversation-ui'
import { useConversationWebSocket } from '@/hooks/use-conversation-websocket'
import { useAppStore } from '@/stores/app-store'
import { ConversationMessage } from '@/lib/types/conversation-types'
import { InlineMessageComposer } from './InlineMessageComposer'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { DailyNoteImage } from '@/app/student/goals/components/DailyNoteImage'
import { DailyNoteImageViewer } from '@/app/student/goals/components/DailyNoteImageViewer'
import { useUITransitionStore } from '@/stores/ui-transition-store'
import { useConversationDrafts } from '@/hooks/use-conversation-drafts'
import { formatDate } from '@/lib/utils'
import { QuestionnaireReview } from '@/components/instructor/QuestionnaireReview'
import { RevenueSubmissionModal } from '@/app/student/goals/components/RevenueSubmissionModal'
import { getLatestRevenueSubmission } from '@/app/actions/revenue-actions'
import { RevenueReviewModal } from './RevenueReviewModal'

interface DailyGoalTrackerV2Props {
  studentId: string
  instructorId?: string
  isInstructorView?: boolean
  goalProgress?: any
  onGoalProgressUpdate?: () => void
}

interface DailyEntry {
  day: number
  date: string
  studentNotes: ConversationMessage[]
  instructorResponses: ConversationMessage[]
  activities: ConversationMessage[]
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

/**
 * New DailyGoalTracker component that uses the unified conversation system
 * but maintains the original UI/UX experience
 */
export function DailyGoalTrackerV2({
  studentId,
  instructorId,
  isInstructorView = false,
  goalProgress,
  onGoalProgressUpdate
}: DailyGoalTrackerV2Props) {
  const [respondingToDay, setRespondingToDay] = useState<number | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editingResponse, setEditingResponse] = useState<{ messageId: string; day: number; originalContent: string } | null>(null)
  const [imageViewer, setImageViewer] = useState<{
    isOpen: boolean
    dailyEntry: DailyEntry | null
    initialIndex: number
  }>({
    isOpen: false,
    dailyEntry: null,
    initialIndex: 0
  })

  // Revenue submission state
  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState<any>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)

  // Draft management
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>()
  const [instructorDraftId, setInstructorDraftId] = useState<string | undefined>()

  // Note: Auto-save is disabled in edit mode, using manual Save Draft button instead

  // UI Transition Store (Zustand layer for UI state)
  const { setImageTransition, clearImageTransition } = useUITransitionStore()

  // Get conversation data (must come before draft hooks that depend on conversationData)
  const {
    data: conversationData,
    isLoading,
    error,
    refetch
  } = useConversationData(studentId, {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    instructorId
  })

  // Conversation draft system hooks (depends on conversationData)
  const { drafts: conversationDrafts, isLoading: isDraftsLoading } = useConversationDrafts(
    conversationData?.conversation?.id
  )

  // Fetch revenue submission status
  const fetchSubmissionStatus = async () => {
    if (!conversationData?.conversation?.id) return

    setIsLoadingStatus(true)
    try {
      const result = await getLatestRevenueSubmission(conversationData.conversation.id)
      if (result.submission && result.submission.metadata) {
        const metadata = result.submission.metadata as any
        setSubmissionStatus(metadata.status || null)
        // Store full submission for instructor review
        if (isInstructorView && metadata.status === 'pending') {
          setPendingSubmission(result.submission)
        } else {
          setPendingSubmission(null)
        }
      } else {
        setSubmissionStatus(null)
        setPendingSubmission(null)
      }
    } catch (error) {
      console.error('Error fetching submission status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    fetchSubmissionStatus()
  }, [conversationData?.conversation?.id])


  // Form and UI state for message composer
  const messageForm = useMessageForm({
    messageType: isInstructorView ? 'instructor_response' : 'daily_note',
    targetDate: new Date().toISOString().split('T')[0]
  })
  const ui = useConversationUI()

  // Mutations for message operations
  const createMessageMutation = useCreateMessageWithAttachments()
  const updateMessageMutation = useUpdateMessage()
  const uploadAttachmentsMutation = useUploadMessageAttachments()
  const deleteAttachmentMutation = useDeleteMessageAttachment()
  const publishDraftEditMutation = usePublishDraftEdit()

  // Get current user for WebSocket connection
  const { user } = useAppStore()

  // WebSocket real-time updates (only connect when user is available)
  const { isConnected } = useConversationWebSocket(studentId, user?.id)

  const currentGoal = goalProgress || {
    id: '1',
    title: 'UI/UX Designer to $4K/month',
    currentAmount: '$0',
    targetAmount: '$4,000',
    progress: 0,
    targetDate: '2025-03-17',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    status: 'active'
  }

  // Transform conversation messages into daily entries
  const dailyEntries = useMemo(() => {
    const entriesMap = new Map<string, DailyEntry>()
    const startDate = new Date(currentGoal.startDate)
    const today = new Date().toISOString().split('T')[0]

    // Create entries for ALL days from start to today
    const daysSinceStart = Math.floor((new Date(today).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    for (let dayNum = 1; dayNum <= daysSinceStart; dayNum++) {
      const date = new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      entriesMap.set(date, {
        day: dayNum,
        date,
        studentNotes: [],
        instructorResponses: [],
        activities: []
      })
    }

    // Process existing messages to populate entries
    if (conversationData?.messages && conversationData.messages.length > 0) {
      console.log('🔍 DEBUG: Raw conversation data with', conversationData.messages.length, 'messages')
      if (conversationData.messages.length > 0) {
        console.log('🔍 DEBUG: First message:', conversationData.messages[0])
        const messagesWithAttachments = conversationData.messages.filter(m => m.attachments && m.attachments.length > 0)
        console.log('🔍 DEBUG: Messages with attachments:', messagesWithAttachments.length, messagesWithAttachments)
      }

      conversationData.messages.forEach(message => {
        const date = message.target_date || message.created_at.split('T')[0]

        console.log('🔍 DEBUG Processing message:')
        console.log('  messageId:', message.id)
        console.log('  messageType:', message.message_type)
        console.log('  targetDate:', message.target_date)
        console.log('  createdAt:', message.created_at)
        console.log('  calculatedDate:', date)

        // Get or create entry for this date
        const entry = entriesMap.get(date)
        if (!entry) return // Skip messages outside our date range

        switch (message.message_type) {
          case 'daily_note':
            entry.studentNotes.push(message)
            break
          case 'instructor_response':
            entry.instructorResponses.push(message)
            break
          case 'activity':
            entry.activities.push(message)
            break
        }

        // Collect attachments from all messages for this entry
        if (message.attachments && message.attachments.length > 0) {
          console.log(`🔍 DEBUG: Found ${message.attachments.length} attachments for message ${message.id}:`, message.attachments)
          if (!entry.attachedFiles) entry.attachedFiles = []

          message.attachments.forEach(attachment => {
            entry.attachedFiles!.push({
              ...attachment,
              message_text: message.content
            })
          })
          console.log(`🔍 DEBUG: Entry ${date} now has ${entry.attachedFiles.length} total files`)
        }
      })
    }

    // Convert to array and sort by day descending
    return Array.from(entriesMap.values()).sort((a, b) => b.day - a.day)
  }, [conversationData?.messages, currentGoal.startDate])

  const currentDay = dailyEntries.length > 0 ? Math.max(...dailyEntries.map(entry => entry.day)) : 1
  const todaysEntry = dailyEntries.find(entry => entry.day === currentDay)

  const getActivityIcon = (messageType: string) => {
    switch (messageType) {
      case 'daily_note': return '📝'
      case 'activity': return '✅'
      case 'instructor_response': return '💬'
      default: return '📄'
    }
  }

  const handleStartResponse = (entry: DailyEntry) => {
    setRespondingToDay(entry.day)
    messageForm.setMessageType('instructor_response')
    messageForm.setTargetDate(entry.date)
    messageForm.setMessageText('')
    messageForm.setAttachedFiles([])
  }

  const handleEditStudentNote = (noteId: string, currentContent: string, targetDate: string, day: number, attachments: any[] = [], draftContent?: string | null) => {
    // Pre-populate existing attachments
    const existingAttachments = attachments.map(att => ({
      id: att.id,
      url: att.cdn_url,
      name: att.original_filename,
      size: att.file_size,
      mimeType: att.mime_type
    }))

    // Use draft_content if it exists, otherwise use published content
    const contentToEdit = draftContent || currentContent

    setEditingStudentNote({
      messageId: noteId,
      day,
      originalContent: currentContent,
      originalAttachments: existingAttachments
    })
    setShowAddMore(false) // Make sure add more is cleared
    setCurrentDraftId(undefined) // Clear draft ID to prevent auto-save conflicts in edit mode
    messageForm.setMessageText(contentToEdit)
    messageForm.setMessageType('daily_note')
    messageForm.setTargetDate(targetDate)
    messageForm.setAttachedFiles([])
    messageForm.setExistingAttachments(existingAttachments)
  }

  const handleEditResponse = (responseId: string, currentContent: string, targetDate: string, day: number, draftContent?: string | null) => {
    // Use draft_content if it exists, otherwise use published content
    const contentToEdit = draftContent || currentContent

    setEditingResponse({
      messageId: responseId,
      day,
      originalContent: currentContent
    })
    setRespondingToDay(null) // Make sure responding is cleared
    setInstructorDraftId(undefined) // Clear draft ID to prevent auto-save conflicts in edit mode
    messageForm.setMessageText(contentToEdit)
    messageForm.setMessageType('instructor_response')
    messageForm.setTargetDate(targetDate)
    messageForm.setAttachedFiles([])
  }

  const [showAddMore, setShowAddMore] = useState(false)
  const [editingStudentNote, setEditingStudentNote] = useState<{
    messageId: string;
    day: number;
    originalContent: string;
    originalAttachments: ExistingAttachment[];
  } | null>(null)

  const openImageViewer = (entry: DailyEntry, imageId: string) => {
    const imageFiles = entry.attachedFiles?.filter(file => file.mime_type.startsWith('image/')) || []
    const initialIndex = imageFiles.findIndex(file => file.id === imageId)

    setImageViewer({
      isOpen: true,
      dailyEntry: entry,
      initialIndex: Math.max(0, initialIndex)
    })
  }

  // Auto-restore edit mode for messages with pending draft edits
  useEffect(() => {
    if (!conversationData?.messages || editingStudentNote || editingResponse) return

    const messages = conversationData.messages

    // Find first message with draft_content for current user
    if (!isInstructorView) {
      // Student view: check student notes for draft_content
      const noteWithDraft = messages.find(msg =>
        msg.message_type === 'daily_note' &&
        msg.draft_content &&
        msg.sender_id === user?.id
      )

      if (noteWithDraft) {
        console.log('[DRAFT EDIT RESTORE] Auto-restoring edit mode for student note:', noteWithDraft.id)
        handleEditStudentNote(
          noteWithDraft.id,
          noteWithDraft.content,
          noteWithDraft.target_date || new Date().toISOString().split('T')[0],
          0, // day number doesn't matter for this
          noteWithDraft.attachments || [],
          noteWithDraft.draft_content
        )
        return
      }
    } else {
      // Instructor view: check instructor responses for draft_content
      const responseWithDraft = messages.find(msg =>
        msg.message_type === 'instructor_response' &&
        msg.draft_content &&
        msg.sender_id === user?.id
      )

      if (responseWithDraft) {
        console.log('[DRAFT EDIT RESTORE] Auto-restoring edit mode for instructor response:', responseWithDraft.id)
        handleEditResponse(
          responseWithDraft.id,
          responseWithDraft.content,
          responseWithDraft.target_date || new Date().toISOString().split('T')[0],
          0, // day number doesn't matter for this
          responseWithDraft.draft_content
        )
        return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationData?.messages?.length, isInstructorView, user?.id])

  // Auto-load draft on mount for today's entry (using conversation drafts)
  // Only run once on initial mount, not on every draft update
  useEffect(() => {
    if (!isInstructorView && conversationDrafts.length > 0 && !showAddMore && !editingStudentNote) {
      const today = new Date().toISOString().split('T')[0]
      const todayDraft = conversationDrafts.find(draft =>
        draft.message_type === 'daily_note' && draft.target_date === today
      )

      if (todayDraft && todayDraft.content && !currentDraftId) {
        console.log('[DRAFT AUTO-LOAD] Found draft for today:', todayDraft)
        // Auto-show composer with draft loaded
        setShowAddMore(true)
        setCurrentDraftId(todayDraft.id)
        messageForm.setMessageType('daily_note')
        messageForm.setTargetDate(today)
        messageForm.setMessageText(todayDraft.content)
      } else {
        console.log('[DRAFT AUTO-LOAD] No draft found for today. Total drafts:', conversationDrafts.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationDrafts.length, isInstructorView, showAddMore, editingStudentNote, currentDraftId])

  const handleAddMore = () => {
    setShowAddMore(true)
    const today = new Date().toISOString().split('T')[0]
    messageForm.setMessageType('daily_note')
    messageForm.setTargetDate(today)
    messageForm.setMessageText('')
    messageForm.setAttachedFiles([])
  }

  // Show minimal loading state since parent handles user loading
  if (isLoading && !conversationData) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorFallback
          error={error}
          onRetry={refetch}
          title="Failed to load goal data"
        />
      </div>
    )
  }

  // Check if no conversation exists yet (student hasn't submitted questionnaire)
  if (!conversationData?.conversation) {
    if (isInstructorView) {
      return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Target className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Questionnaire Submitted Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">
                    This student hasn't completed their onboarding questionnaire yet.
                    Once they submit it, you'll be able to review their responses and assign an appropriate starting goal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    } else {
      return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Complete Your Questionnaire
                  </h3>
                  <p className="text-orange-700 dark:text-orange-200 text-sm max-w-md mb-4">
                    Please complete your track questionnaire to get started with your personalized goals.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/student/track-selection/questionnaire'}
                    className="bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 text-white"
                  >
                    Complete Questionnaire
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  // Check if conversation is pending instructor review
  if (conversationData?.conversation?.status === 'pending_instructor_review') {
    if (isInstructorView) {
      // Show questionnaire review for instructor
      const questionnaireMessage = conversationData.messages.find(msg => msg.message_type === 'questionnaire_response')

      if (questionnaireMessage && questionnaireMessage.metadata?.questionnaire_responses) {
        return (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <QuestionnaireReview
              conversationId={conversationData.conversation.id}
              studentId={studentId}
              studentName={conversationData.conversation.student_name || 'Student'}
              trackType={goalProgress?.trackName?.toLowerCase().includes('saas') ? 'saas' : 'agency'}
              questionnaireData={questionnaireMessage.metadata.questionnaire_responses}
              submittedAt={questionnaireMessage.created_at}
              onGoalAssigned={() => refetch()}
            />
          </div>
        )
      }
    } else {
      // Show pending message for student
      return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Questionnaire Submitted!
                  </h3>
                  <p className="text-blue-700 dark:text-blue-200 mb-4">
                    Your instructor is reviewing your responses and will assign you a goal soon.
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    You'll be able to start tracking your progress once your goal is assigned.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
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
                <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
                  {currentGoal.title}
                </CardTitle>
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
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
              <div
                className="bg-gray-900 dark:bg-gray-300 h-3 rounded-full transition-all"
                style={{ width: `${currentGoal.progress}%` }}
              />
            </div>

            {/* Revenue Submission/Review Buttons */}
            {conversationData?.conversation?.id && (
              <div className="mt-3">
                {!isInstructorView ? (
                  // Student view - submission button
                  <>
                    {isLoadingStatus ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading status...
                      </Button>
                    ) : submissionStatus === 'pending' ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                        <span className="text-yellow-700">Under Review</span>
                      </Button>
                    ) : submissionStatus === 'approved' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900"
                        onClick={() => setShowRevenueModal(true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        <span className="text-green-700 dark:text-green-300">Last submission approved - Submit new proof</span>
                      </Button>
                    ) : submissionStatus === 'rejected' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900"
                        onClick={() => setShowRevenueModal(true)}
                      >
                        <DollarSign className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300">Resubmit Revenue Proof</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowRevenueModal(true)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Submit Revenue Proof
                      </Button>
                    )}
                  </>
                ) : (
                  // Instructor view - review button
                  <>
                    {isLoadingStatus ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </Button>
                    ) : pendingSubmission ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:hover:bg-yellow-900"
                        onClick={() => setShowReviewModal(true)}
                      >
                        <Clock className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-700 dark:text-yellow-300">Revenue Submission Pending - Click to Review</span>
                      </Button>
                    ) : submissionStatus === 'approved' ? (
                      <div className="text-sm text-green-600 dark:text-green-400 text-center py-2">
                        <CheckCircle className="h-4 w-4 inline mr-2" />
                        Last submission approved
                      </div>
                    ) : submissionStatus === 'rejected' ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
                        Last submission rejected
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>


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
            {dailyEntries.map((entry) => (
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
                        {formatDate(entry.date)}
                      </h3>
                      {entry.day === currentDay && (
                        <Badge className="bg-gray-100 text-gray-800">Today</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.studentNotes.length + entry.activities.length} activities completed
                    </div>
                  </div>

                  {/* Instructor Respond Button - only show if no responses exist */}
                  {isInstructorView && entry.instructorResponses.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={() => handleStartResponse(entry)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Respond
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="ml-20 space-y-3">
                  {/* Student Notes - Only show first note (one per day) */}
                  {entry.studentNotes.length > 0 && (
                    <div key={entry.studentNotes[0].id} className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Student Update</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {new Date(entry.studentNotes[0].created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {entry.studentNotes[0].draft_content && !isInstructorView && (
                            <Badge variant="outline" className="text-xs px-2 py-0 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                              Unsaved edits
                            </Badge>
                          )}
                          {!isInstructorView && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditStudentNote(
                                  entry.studentNotes[0].id,
                                  entry.studentNotes[0].content,
                                  entry.studentNotes[0].target_date || entry.date,
                                  entry.day,
                                  entry.studentNotes[0].attachments || [],
                                  entry.studentNotes[0].draft_content
                                )
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {editingStudentNote?.messageId === entry.studentNotes[0].id ? (
                        <div className="space-y-3">
                          {/* Show published message above edit area */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Published message:</span>
                              <Badge variant="outline" className="text-xs px-2 py-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                Read-only
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {editingStudentNote.originalContent}
                            </p>
                          </div>

                          {/* Edit composer */}
                          <InlineMessageComposer
                            messageText={messageForm.messageText}
                            onMessageChange={messageForm.setMessageText}
                            attachedFiles={messageForm.attachedFiles}
                            onAddFiles={messageForm.addFiles}
                            onRemoveFile={messageForm.removeFile}
                            existingAttachments={messageForm.existingAttachments}
                            onRemoveExistingAttachment={messageForm.removeExistingAttachment}
                            placeholder="Edit your message..."
                            isEditMode={true}
                            editingMessageId={editingStudentNote.messageId}
                            originalMessageText={editingStudentNote.originalContent}
                            originalAttachments={editingStudentNote.originalAttachments}
                            messageType="daily_note"
                            targetDate={entry.date}
                            conversationId={conversationData?.conversation?.id}
                            onSaveDraft={async () => {
                              // Manual save to draft_content immediately
                              if (editingStudentNote.messageId && messageForm.messageText.trim()) {
                                await updateMessage(editingStudentNote.messageId, {
                                  draftContent: messageForm.messageText
                                })
                              }
                            }}
                            onCancel={() => {
                              setEditingStudentNote(null)
                              messageForm.resetForm()
                            }}
                            onSend={async () => {
                              if (!messageForm.isValid) return

                              const messageId = editingStudentNote.messageId
                              const newContent = messageForm.messageText

                              // Check if anything actually changed
                              const originalAttachmentIds = editingStudentNote.originalAttachments.map(att => att.id).sort()
                              const currentAttachmentIds = messageForm.existingAttachments.map(att => att.id).sort()
                              const hasNewFiles = messageForm.attachedFiles.length > 0
                              const contentChanged = newContent.trim() !== editingStudentNote.originalContent.trim()
                              const attachmentsChanged = JSON.stringify(originalAttachmentIds) !== JSON.stringify(currentAttachmentIds)

                              // If nothing changed, just exit edit mode
                              if (!contentChanged && !attachmentsChanged && !hasNewFiles) {
                                setEditingStudentNote(null)
                                messageForm.resetForm()
                                return
                              }

                              try {
                                // Handle removed attachments first
                                if (attachmentsChanged) {
                                  const removedAttachmentIds = originalAttachmentIds.filter(id =>
                                    !currentAttachmentIds.includes(id)
                                  )

                                  for (const attachmentId of removedAttachmentIds) {
                                    deleteAttachmentMutation.mutate(attachmentId)
                                  }
                                }

                                // Handle file attachments if any
                                if (hasNewFiles) {
                                  const formData = new FormData()
                                  messageForm.attachedFiles.forEach((file, index) => {
                                    formData.append(`file_${index}`, file)
                                  })

                                  // Publish content directly (bypass draft system)
                                  if (contentChanged) {
                                    await updateMessageMutation.mutateAsync({
                                      messageId,
                                      updates: {
                                        content: newContent,
                                        draft_content: null // Clear draft
                                      }
                                    })
                                  }

                                  // Then add the new attachments
                                  await uploadAttachmentsMutation.mutateAsync({
                                    messageId,
                                    files: formData
                                  })
                                } else if (contentChanged) {
                                  // Publish content directly (bypass draft system)
                                  await updateMessageMutation.mutateAsync({
                                    messageId,
                                    updates: {
                                      content: newContent,
                                      draftContent: null // Clear draft (camelCase for server action)
                                    }
                                  })
                                }

                                // Exit edit mode and reset form
                                setEditingStudentNote(null)
                                messageForm.resetForm()

                              } catch (error) {
                                console.error('Failed to update student note:', error)
                              }
                            }}
                          isLoading={updateMessageMutation.isPending || uploadAttachmentsMutation.isPending}
                          isDirty={messageForm.isDirty}
                          isValid={messageForm.isValid}
                          isDragOver={ui.fileUpload.isDragOver}
                          onDragOver={ui.setDragOver}
                        />
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed whitespace-pre-line">
                            {entry.studentNotes[0].content}
                          </p>

                          {/* Attachments */}
                          {entry.studentNotes[0].attachments && entry.studentNotes[0].attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {entry.studentNotes[0].attachments.map((file) => (
                                  <div key={file.id} className="group relative">
                                    {file.mime_type.startsWith('image/') ? (
                                      <DailyNoteImage
                                        attachmentId={file.id}
                                        originalFilename={file.original_filename}
                                        className="w-full h-32"
                                        fileSize={file.file_size}
                                        onClick={() => openImageViewer(entry, file.id)}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-600 rounded-lg border">
                                        <div className="text-lg">📄</div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{file.original_filename}</p>
                                          <p className="text-xs text-gray-500">{Math.round(file.file_size / 1024)}KB</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* No Activity Message for past days */}
                  {entry.studentNotes.length === 0 && entry.instructorResponses.length === 0 && entry.activities.length === 0 && entry.day !== currentDay && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                        No activity
                      </p>
                    </div>
                  )}

                  {/* Start Today's Entry for empty days only */}
                  {!isInstructorView && entry.day === currentDay && entry.studentNotes.length === 0 && !editingStudentNote && (
                    <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        What did you do today to get closer to your goal?
                      </p>
                      {!showAddMore ? (
                        <Button
                          onClick={handleAddMore}
                          className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Start Today's Entry
                        </Button>
                      ) : (
                        <InlineMessageComposer
                          messageText={messageForm.messageText}
                          onMessageChange={messageForm.setMessageText}
                          attachedFiles={messageForm.attachedFiles}
                          onAddFiles={messageForm.addFiles}
                          onRemoveFile={messageForm.removeFile}
                          existingAttachments={messageForm.existingAttachments}
                          onRemoveExistingAttachment={messageForm.removeExistingAttachment}
                          placeholder="What did you accomplish today to get closer to your goal..."
                          messageType="daily_note"
                          targetDate={entry.date}
                          currentDraftId={currentDraftId}
                          onDraftIdChange={setCurrentDraftId}
                          conversationId={conversationData?.conversation?.id}
                          onCancel={() => {
                            setShowAddMore(false)
                            messageForm.resetForm()
                            setCurrentDraftId(undefined)
                          }}
                          onSend={async () => {
                            if (!messageForm.isValid) return

                            try {
                              // Prepare form data for file attachments
                              let formData: FormData | undefined
                              if (messageForm.attachedFiles.length > 0) {
                                formData = new FormData()
                                messageForm.attachedFiles.forEach((file, index) => {
                                  formData!.append(`file_${index}`, file)
                                })
                              }

                              // Create new message with attachments
                              await createMessageMutation.mutateAsync({
                                messageData: {
                                  studentId,
                                  conversationId: conversationData?.conversation.id,
                                  messageType: messageForm.messageType,
                                  content: messageForm.messageText,
                                  targetDate: messageForm.targetDate,
                                  metadata: messageForm.metadata
                                },
                                attachments: formData
                              })

                              // Delete draft after successful send
                              if (currentDraftId) {
                                deleteDraft(currentDraftId)
                              }

                              // Reset form on success
                              messageForm.resetForm()
                              setShowAddMore(false)
                              setCurrentDraftId(undefined)

                            } catch (error) {
                              console.error('Failed to send message:', error)
                            }
                          }}
                          isLoading={createMessageMutation.isPending}
                          isDirty={messageForm.isDirty}
                          isValid={messageForm.isValid}
                          isDragOver={ui.fileUpload.isDragOver}
                          onDragOver={ui.setDragOver}
                        />
                      )}
                    </div>
                  )}

                  {/* Activities */}
                  {entry.activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-800 rounded border border-blue-200 dark:border-gray-700">
                      <span className="text-sm">{getActivityIcon(activity.message_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-900 dark:text-gray-100 text-xs font-medium truncate">{activity.content}</p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-gray-400">
                          <span>{new Date(activity.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Instructor Responses */}
                  {entry.instructorResponses.map((response) => (
                    <div key={response.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                Instructor Response
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {new Date(response.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                              {response.draft_content && isInstructorView && (
                                <Badge variant="outline" className="text-xs px-2 py-0 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                                  Unsaved edits
                                </Badge>
                              )}
                            </div>
                            {isInstructorView && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEditResponse(response.id, response.content, response.target_date || entry.date, entry.day, response.draft_content)
                                }}
                                className="text-xs text-green-600 hover:text-green-700 font-medium"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {editingResponse?.messageId === response.id ? (
                            <div className="space-y-3">
                              {/* Show published message above edit area */}
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Published message:</span>
                                  <Badge variant="outline" className="text-xs px-2 py-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                                    Read-only
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {editingResponse.originalContent}
                                </p>
                              </div>

                              {/* Edit textarea */}
                              <div className="space-y-2">
                                <textarea
                                  value={messageForm.messageText}
                                  onChange={(e) => messageForm.setMessageText(e.target.value)}
                                  className="w-full p-2 text-sm bg-white dark:bg-green-800 border border-green-300 dark:border-green-600 rounded resize-none min-h-[60px]"
                                  placeholder="Edit your response..."
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingResponse(null)
                                      messageForm.resetForm()
                                    }}
                                    className="px-3 py-1 text-xs text-green-600 hover:text-green-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!messageForm.messageText.trim()) return

                                      const messageId = editingResponse.messageId
                                      const newContent = messageForm.messageText

                                      // Check if content actually changed
                                      const contentChanged = newContent.trim() !== editingResponse.originalContent.trim()

                                      if (!contentChanged) {
                                        // No changes, just exit edit mode
                                        setEditingResponse(null)
                                        messageForm.resetForm()
                                        return
                                      }

                                      // Instructor responses use plain textarea (no auto-save), so update directly
                                      await updateMessageMutation.mutateAsync({
                                        messageId,
                                        updates: { content: newContent }
                                      })

                                      // Exit edit mode after save
                                      setEditingResponse(null)
                                      messageForm.resetForm()
                                    }}
                                    disabled={!messageForm.messageText.trim() || updateMessageMutation.isPending}
                                    className="px-3 py-1 text-xs bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                                  >
                                    {updateMessageMutation.isPending ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                              {response.content}
                            </p>
                          )}

                          {/* Response attachments */}
                          {response.attachments && response.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {response.attachments.map((file) => (
                                  <div key={file.id} className="group relative">
                                    {file.mime_type.startsWith('image/') ? (
                                      <DailyNoteImage
                                        attachmentId={file.id}
                                        originalFilename={file.original_filename}
                                        className="w-full h-32"
                                        fileSize={file.file_size}
                                        onClick={() => openImageViewer(entry, file.id)}
                                      />
                                    ) : (
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
                  ))}

                  {/* Instructor Response Composer - only for new responses */}
                  {isInstructorView && respondingToDay === entry.day && !editingResponse && (
                    <InlineMessageComposer
                      messageText={messageForm.messageText}
                      onMessageChange={messageForm.setMessageText}
                      attachedFiles={messageForm.attachedFiles}
                      onAddFiles={messageForm.addFiles}
                      onRemoveFile={messageForm.removeFile}
                      existingAttachments={messageForm.existingAttachments}
                      onRemoveExistingAttachment={messageForm.removeExistingAttachment}
                      placeholder="Provide feedback, encouragement, or assign tasks..."
                      messageType="instructor_response"
                      targetDate={entry.date}
                      currentDraftId={instructorDraftId}
                      onDraftIdChange={setInstructorDraftId}
                      conversationId={conversationData?.conversation?.id}
                      onCancel={() => {
                        setRespondingToDay(null)
                        messageForm.resetForm()
                        setInstructorDraftId(undefined)
                      }}
                      onSend={async () => {
                        if (!messageForm.isValid) return

                        try {
                          // Prepare form data for file attachments
                          let formData: FormData | undefined
                          if (messageForm.attachedFiles.length > 0) {
                            formData = new FormData()
                            messageForm.attachedFiles.forEach((file, index) => {
                              formData!.append(`file_${index}`, file)
                            })
                          }

                          // Create new instructor response with attachments
                          await createMessageMutation.mutateAsync({
                            messageData: {
                              studentId,
                              conversationId: conversationData?.conversation.id,
                              messageType: 'instructor_response',
                              content: messageForm.messageText,
                              targetDate: entry.date,
                              metadata: messageForm.metadata
                            },
                            attachments: formData
                          })

                          // Delete draft after successful send
                          if (instructorDraftId) {
                            deleteDraft(instructorDraftId)
                          }

                          // Reset form on success
                          messageForm.resetForm()
                          setRespondingToDay(null)
                          setInstructorDraftId(undefined)

                        } catch (error) {
                          console.error('Failed to send instructor response:', error)
                        }
                      }}
                      isLoading={createMessageMutation.isPending || updateMessageMutation.isPending}
                      isDirty={messageForm.isDirty}
                      isValid={messageForm.isValid}
                      isDragOver={ui.fileUpload.isDragOver}
                      onDragOver={ui.setDragOver}
                    />
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
      {imageViewer.dailyEntry && (
        <DailyNoteImageViewer
          isOpen={imageViewer.isOpen}
          onClose={() => setImageViewer({ isOpen: false, dailyEntry: null, initialIndex: 0 })}
          initialImageIndex={imageViewer.initialIndex}
          dailyEntry={imageViewer.dailyEntry}
        />
      )}

      {/* Revenue Submission Modal (Student) */}
      {!isInstructorView && conversationData?.conversation?.id && (
        <RevenueSubmissionModal
          isOpen={showRevenueModal}
          onClose={() => setShowRevenueModal(false)}
          conversationId={conversationData.conversation.id}
          trackType={goalProgress?.trackName?.toLowerCase().includes('saas') ? 'saas' : 'agency'}
          onSuccess={() => {
            fetchSubmissionStatus()
            onGoalProgressUpdate?.()
          }}
        />
      )}

      {/* Revenue Review Modal (Instructor) */}
      {isInstructorView && pendingSubmission && (
        <RevenueReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          messageId={pendingSubmission.id}
          studentName={goalProgress?.studentName}
          trackType={goalProgress?.trackName?.toLowerCase().includes('saas') ? 'saas' : 'agency'}
          submittedAmount={pendingSubmission.metadata?.submitted_amount || 0}
          proofVideoUrl={pendingSubmission.metadata?.proof_video_url || ''}
          onSuccess={() => {
            fetchSubmissionStatus()
            onGoalProgressUpdate?.()
          }}
        />
      )}

    </div>
  )
}