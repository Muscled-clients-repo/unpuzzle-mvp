'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  UserCheck,
  Clock,
  ArrowUpDown,
  Target,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from 'lucide-react'
import { getInstructorPendingReviews, assignGoalToStudent } from '@/lib/actions/track-actions'
import { getAllRequests, acceptTrackChangeRequest } from '@/lib/actions/request-actions'
import { toast } from 'sonner'
import AcceptTrackChangeModal from '@/components/instructor/AcceptTrackChangeModal'

export default function TrackAssignmentsPage() {
  const [selectedTab, setSelectedTab] = useState('new-signups')
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const queryClient = useQueryClient()

  // TanStack Query: Server-related state ownership
  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['instructor-pending-reviews'],
    queryFn: getInstructorPendingReviews
  })

  const { data: trackChangeRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['track-change-requests'],
    queryFn: async () => {
      const allRequests = await getAllRequests()
      return allRequests.filter(req =>
        req.request_type === 'track_change' &&
        (req.status === 'pending' || req.status === 'approved')
      )
    }
  })

  // Goal assignment mutation following TanStack pattern
  const assignGoalMutation = useMutation({
    mutationFn: ({ studentId, goalId, trackType }: {
      studentId: string;
      goalId: string;
      trackType: 'agency' | 'saas'
    }) => assignGoalToStudent(studentId, goalId, trackType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-pending-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['track-change-requests'] })
      toast.success('Goal assigned successfully!')
    },
    onError: (error) => {
      toast.error('Failed to assign goal')
      console.error(error)
    }
  })

  // Track change acceptance mutation
  const acceptTrackChangeMutation = useMutation({
    mutationFn: ({ requestId, goalId }: { requestId: string; goalId?: string }) =>
      acceptTrackChangeRequest(requestId, goalId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instructor-pending-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['track-change-requests'] })

      // Update the request with the conversation ID for direct linking
      if (selectedRequest && data.conversationId) {
        setSelectedRequest({
          ...selectedRequest,
          conversationId: data.conversationId,
          status: 'approved'
        })
      }

      setAcceptModalOpen(false)
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error('Failed to accept track change request')
      console.error(error)
    }
  })

  const handleGoalAssignment = (studentId: string, goalId: string, trackType: 'agency' | 'saas') => {
    assignGoalMutation.mutate({ studentId, goalId, trackType })
  }

  const handleAcceptTrackChange = (request: any) => {
    setSelectedRequest(request)
    setAcceptModalOpen(true)
  }

  const handleModalAccept = (requestId: string, goalId: string) => {
    acceptTrackChangeMutation.mutate({ requestId, goalId })
  }

  if (reviewsLoading || requestsLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading track assignments...</p>
          </div>
        </div>
      </div>
    )
  }

  const newSignups = pendingReviews || []
  const trackChanges = trackChangeRequests || []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Track Assignments
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review questionnaires and assign goals for new track signups and track changes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              New Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newSignups.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting goal assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Track Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trackChanges.length}</div>
            <p className="text-xs text-muted-foreground">Approved changes pending assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newSignups.length + trackChanges.length}</div>
            <p className="text-xs text-muted-foreground">Requiring your review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for New Signups vs Track Changes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-signups" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            New Signups ({newSignups.length})
          </TabsTrigger>
          <TabsTrigger value="track-changes" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Track Changes ({trackChanges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-signups" className="space-y-6 mt-6">
          {newSignups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No new signups</h3>
                <p className="text-muted-foreground">
                  All new students have been assigned goals.
                </p>
              </CardContent>
            </Card>
          ) : (
            newSignups.map((review) => (
              <ReviewCard
                key={review.conversation_id}
                review={review}
                type="new-signup"
                onAssignGoal={handleGoalAssignment}
                isAssigning={assignGoalMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="track-changes" className="space-y-6 mt-6">
          {trackChanges.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ArrowUpDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No track changes</h3>
                <p className="text-muted-foreground">
                  No approved track changes pending goal assignment.
                </p>
              </CardContent>
            </Card>
          ) : (
            trackChanges.map((request) => (
              <TrackChangeCard
                key={request.id}
                request={request}
                onAcceptRequest={handleAcceptTrackChange}
                isAccepting={acceptTrackChangeMutation.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Accept Track Change Modal */}
      <AcceptTrackChangeModal
        isOpen={acceptModalOpen}
        onClose={() => {
          setAcceptModalOpen(false)
          setSelectedRequest(null)
        }}
        request={selectedRequest}
        onAccept={handleModalAccept}
        isAccepting={acceptTrackChangeMutation.isPending}
      />
    </div>
  )
}

// Component for reviewing new signup questionnaires
function ReviewCard({ review, type, onAssignGoal, isAssigning }: {
  review: any
  type: 'new-signup' | 'track-change'
  onAssignGoal: (studentId: string, goalId: string, trackType: 'agency' | 'saas') => void
  isAssigning: boolean
}) {
  const [showFullQuestionnaire, setShowFullQuestionnaire] = useState(false)
  const questionnaireData = review.questionnaire_data || {}
  const trackType = review.track_type as 'agency' | 'saas'

  // DEBUG: Log the actual data structure
  console.log('🔍 ReviewCard Data:', {
    review,
    questionnaireData,
    trackType,
    keys: Object.keys(review)
  })

  // Suggest goal based on questionnaire responses
  const suggestedGoal = getSuggestedGoal(questionnaireData, trackType)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{review.student_name}</h3>
              <p className="text-sm text-muted-foreground">{review.student_email}</p>
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {trackType} Track
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Questionnaire Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trackType === 'agency' ? (
            <>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Experience Level</h4>
                <p className="text-sm text-muted-foreground">
                  {questionnaireData.hasEarned1k === 'true' ?
                    `Experienced - $${questionnaireData.earningsAmount || 'N/A'} earned` :
                    'Beginner - Less than $1k earned'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Skills</h4>
                <p className="text-sm text-muted-foreground">
                  Design: {questionnaireData.designSkillLevel || 'N/A'}/10,
                  Coding: {questionnaireData.codingSkillLevel || 'N/A'}/10
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Product Experience</h4>
                <p className="text-sm text-muted-foreground">
                  {questionnaireData.hasBuiltProduct === 'true' ?
                    `Has built products - $${questionnaireData.productRevenue || 0}/month revenue` :
                    'No product experience yet'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Skills</h4>
                <p className="text-sm text-muted-foreground">
                  Technical: {questionnaireData.technicalSkillLevel || 'N/A'}/10,
                  Business: {questionnaireData.businessSkillLevel || 'N/A'}/10
                </p>
              </div>
            </>
          )}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Time Commitment</h4>
            <p className="text-sm text-muted-foreground">
              {questionnaireData.timeCommitment || 'N/A'} hours/week
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{trackType === 'agency' ? 'Income Goal' : 'MRR Goal'}</h4>
            <p className="text-sm text-muted-foreground">
              ${questionnaireData.monthlyIncomeGoal?.toLocaleString() || 'N/A'}/month
            </p>
          </div>
        </div>

        <Separator />

        {/* Full Questionnaire Details */}
        {showFullQuestionnaire && (
          <>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Complete Questionnaire Responses</h4>
              {Object.keys(questionnaireData).length === 0 ? (
                <div className="text-center py-4">
                  <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No questionnaire data available for this request.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    This request was created before questionnaire integration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {Object.entries(questionnaireData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-muted-foreground">
                        {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Suggested Goal */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Suggested Goal
          </h4>
          <p className="text-sm mb-3">{suggestedGoal.description}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAssignGoal(review.student_id, suggestedGoal.id, trackType)}
              disabled={isAssigning}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Assign Suggested Goal
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFullQuestionnaire(!showFullQuestionnaire)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showFullQuestionnaire ? 'Hide' : 'Review'} Full Questionnaire
            </Button>
          </div>
        </div>

        {/* Submission Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Submitted {new Date(review.questionnaire_submitted_at).toLocaleDateString()}</span>
          <span>{review.conversation_id}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Component for track change requests
function TrackChangeCard({ request, onAcceptRequest, isAccepting }: {
  request: any
  onAcceptRequest: (request: any) => void
  isAccepting: boolean
}) {
  const [showFullQuestionnaire, setShowFullQuestionnaire] = useState(false)
  const metadata = request.metadata || {}
  const newTrack = metadata.desired_track
  const trackType = metadata.desired_track_type || (newTrack?.toLowerCase().includes('saas') ? 'saas' : 'agency')
  const questionnaireData = metadata.questionnaire_responses || {}

  // DEBUG: Log the actual data structure
  console.log('🔍 TrackChangeCard Data:', {
    request,
    metadata,
    questionnaireData,
    trackType,
    metadataKeys: Object.keys(metadata),
    requestKeys: Object.keys(request)
  })

  // Suggest goal based on questionnaire responses
  const suggestedGoal = getSuggestedGoal(questionnaireData, trackType)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{request.profiles?.full_name}</h3>
            <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
          </div>
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            Track Change
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-sm font-medium">{metadata.current_track}</p>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">{metadata.desired_track}</p>
            <p className="text-xs text-muted-foreground">Requested</p>
          </div>
        </div>

        {/* Questionnaire Summary or Missing Data Notice */}
        {Object.keys(questionnaireData).length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-yellow-600" />
              <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                No Questionnaire Data Available
              </h4>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
              This track change request was created before questionnaire integration.
              The student did not complete a questionnaire as part of their request.
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Consider requesting the student to complete a new track change request with the current flow,
              or manually assign a goal based on their track preference and your knowledge of their progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackType === 'agency' ? (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Experience Level</h4>
                  <p className="text-sm text-muted-foreground">
                    {questionnaireData.hasEarned1k === 'true' ?
                      `Experienced - $${questionnaireData.earningsAmount || 'N/A'} earned` :
                      'Beginner - Less than $1k earned'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Skills</h4>
                  <p className="text-sm text-muted-foreground">
                    Design: {questionnaireData.designSkillLevel || 'N/A'}/10,
                    Coding: {questionnaireData.codingSkillLevel || 'N/A'}/10
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Product Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    {questionnaireData.hasBuiltProduct === 'true' ?
                      `Has built products - $${questionnaireData.productRevenue || 0}/month revenue` :
                      'No product experience yet'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Skills</h4>
                  <p className="text-sm text-muted-foreground">
                    Technical: {questionnaireData.technicalSkillLevel || 'N/A'}/10,
                    Business: {questionnaireData.businessSkillLevel || 'N/A'}/10
                  </p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Time Commitment</h4>
              <p className="text-sm text-muted-foreground">
                {questionnaireData.timeCommitment || 'N/A'} hours/week
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{trackType === 'agency' ? 'Income Goal' : 'MRR Goal'}</h4>
              <p className="text-sm text-muted-foreground">
                ${questionnaireData.monthlyIncomeGoal?.toLocaleString() || 'N/A'}/month
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Full Questionnaire Details */}
        {showFullQuestionnaire && (
          <>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Complete Questionnaire Responses</h4>
              {Object.keys(questionnaireData).length === 0 ? (
                <div className="text-center py-4">
                  <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No questionnaire data available for this request.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    This request was created before questionnaire integration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {Object.entries(questionnaireData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-muted-foreground">
                        {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Action Section */}
        {Object.keys(questionnaireData).length === 0 ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-red-800 dark:text-red-200">
              <XCircle className="h-4 w-4" />
              Cannot Accept Request
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              This request cannot be accepted because it lacks questionnaire data.
              Please ask the student to submit a new track change request using the current system.
            </p>
            <Button size="sm" variant="outline" disabled>
              <XCircle className="h-4 w-4 mr-1" />
              Cannot Accept Legacy Request
            </Button>
          </div>
        ) : request.status === 'pending' ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ready for Acceptance
            </h4>
            <p className="text-sm mb-3">
              Student has completed the questionnaire. Accept this request to create a conversation for goal assignment.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onAcceptRequest(request)}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept & Create Conversation
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFullQuestionnaire(!showFullQuestionnaire)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showFullQuestionnaire ? 'Hide' : 'Review'} Full Questionnaire
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              Request Accepted
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              This request has been accepted and a conversation has been created.
              Go to Student Goals to assign a goal to this student.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={`/instructor/student-goals/${request.user_id}`}>
                  <Target className="h-4 w-4 mr-1" />
                  Go to Student Conversation
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFullQuestionnaire(!showFullQuestionnaire)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showFullQuestionnaire ? 'Hide' : 'Review'} Full Questionnaire
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Approved {new Date(request.created_at).toLocaleDateString()}</span>
          <span>{request.id}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to suggest goals based on questionnaire
function getSuggestedGoal(questionnaire: any, trackType: 'agency' | 'saas') {
  // If no questionnaire data, provide default beginner goals
  if (!questionnaire || Object.keys(questionnaire).length === 0) {
    if (trackType === 'agency') {
      return {
        id: 'agency-1k',
        description: 'Earn $1k total from agency services (Default goal - no questionnaire data available)'
      }
    } else {
      return {
        id: 'saas-mvp',
        description: 'Build and launch your first SaaS MVP (Default goal - no questionnaire data available)'
      }
    }
  }

  if (trackType === 'agency') {
    const hasExperience = questionnaire.hasEarned1k === 'true'
    const earningsAmount = questionnaire.earningsAmount || 0

    if (!hasExperience || earningsAmount < 1000) {
      return { id: 'agency-1k', description: 'Earn $1k total from agency services' }
    } else if (earningsAmount < 5000) {
      return { id: 'agency-5k', description: 'Earn $5k total from agency services' }
    } else {
      return { id: 'agency-10k', description: 'Earn $10k total from agency services' }
    }
  } else {
    // SaaS track
    const hasBuiltProduct = questionnaire.hasBuiltProduct === 'true'
    const productRevenue = questionnaire.productRevenue || 0
    const technicalSkillLevel = questionnaire.technicalSkillLevel || 0

    if (!hasBuiltProduct || productRevenue < 100) {
      return { id: 'saas-mvp', description: 'Build and launch your first SaaS MVP' }
    } else if (productRevenue < 1000) {
      return { id: 'saas-1k', description: 'Reach $1k Monthly Recurring Revenue' }
    } else if (productRevenue < 5000) {
      return { id: 'saas-5k', description: 'Scale to $5k Monthly Recurring Revenue' }
    } else {
      return { id: 'saas-10k', description: 'Grow to $10k+ Monthly Recurring Revenue' }
    }
  }
}