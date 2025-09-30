'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowUpDown, Loader2, Clock, Sparkles, BookOpen } from 'lucide-react'
import { getUserCurrentTrack, getAllTracks, createRequest, getStudentTrackChangeStatus } from '@/lib/actions/request-actions'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'
import { useTrackRequestWebSocket } from '@/hooks/use-track-request-websocket'

interface Track {
  id: string
  name: string
  description: string
}

export default function TrackSelectionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Select user directly from store (correct pattern)
  const user = useAppStore((state) => state.user)

  // Setup websocket for real-time track request updates
  useTrackRequestWebSocket(user?.id || '', 'student')

  // Get user's current track
  const { data: currentTrack, isLoading: currentTrackLoading } = useQuery({
    queryKey: ['user-current-track'],
    queryFn: getUserCurrentTrack
  })

  // Get all available tracks
  const { data: allTracks, isLoading: allTracksLoading } = useQuery({
    queryKey: ['all-tracks'],
    queryFn: getAllTracks
  })

  // Check for pending track change requests
  const { data: pendingRequest, isLoading: pendingRequestLoading } = useQuery({
    queryKey: ['student-track-change-status'],
    queryFn: () => getStudentTrackChangeStatus('current-user'), // Will use current user internally
    enabled: !!currentTrack // Only run if we have current track data
  })

  // Request track switch mutation
  const requestSwitchMutation = useMutation({
    mutationFn: async (desiredTrack: Track) => {
      return createRequest({
        request_type: 'track_change',
        title: `Request to switch to ${desiredTrack.name}`,
        description: `I would like to switch from my current track "${currentTrack?.name}" to "${desiredTrack.name}".`,
        metadata: {
          current_track: currentTrack?.name || 'Unknown',
          current_track_id: currentTrack?.id || null,
          desired_track: desiredTrack.name,
          desired_track_id: desiredTrack.id
        },
        priority: 'medium'
      })
    },
    onSuccess: () => {
      toast.success('Track switch request submitted! An instructor will review your request.')
      queryClient.invalidateQueries({ queryKey: ['user-requests'] })
    },
    onError: (error) => {
      toast.error('Failed to submit request')
      console.error(error)
    }
  })

  const handleRequestSwitch = (desiredTrack: Track) => {
    // Instead of directly submitting the request, redirect to questionnaire first
    const trackType = desiredTrack.name.toLowerCase().includes('saas') ? 'saas' : 'agency'
    const questionnaireUrl = `/student/track-selection/questionnaire?track=${trackType}&track_change=true&desired_track=${encodeURIComponent(desiredTrack.name)}`
    window.location.href = questionnaireUrl
  }

  // Find the other available track (not current track)
  const otherTrack = allTracks?.find(track => track.id !== currentTrack?.id)

  if (currentTrackLoading || allTracksLoading || pendingRequestLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">Loading tracks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Your Learning Track
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your current track and request to switch if needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* Approved Track Assignment - Success Card */}
        {pendingRequest && pendingRequest.status === 'approved' && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Track & Goal Assigned Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-green-700 dark:text-green-200">
                  Your track and goal have been assigned. You can now access your courses and start chatting with your instructor in Goal Digger!
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push('/student/courses')}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    View Your Courses
                  </Button>
                  <Button
                    onClick={() => router.push('/student/goals')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Say Hi in Goal Digger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Track */}
        {currentTrack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Current Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {currentTrack.name}
                </h3>
                <p className="text-muted-foreground">
                  {currentTrack.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Track Change Request */}
        {pendingRequest && (pendingRequest.status === 'pending' || pendingRequest.status === 'in_review') && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Track Change Request Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">{pendingRequest.metadata?.current_track}</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{pendingRequest.metadata?.desired_track}</p>
                    <p className="text-xs text-muted-foreground">Requested</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {pendingRequest.status === 'pending' ? 'Awaiting Instructor Review' :
                       pendingRequest.status === 'approved' ? 'Approved - Awaiting Goal Assignment' :
                       'In Review'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mb-3">
                    {pendingRequest.status === 'pending'
                      ? 'Your track change request and questionnaire have been submitted. An instructor will review and assign an appropriate goal.'
                      : 'Your track change has been approved! An instructor will assign your goal soon.'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Submitted {new Date(pendingRequest.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Available Track */}
        {otherTrack && (!pendingRequest || pendingRequest.status === 'approved') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Switch to Another Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {otherTrack.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {otherTrack.description}
                  </p>
                </div>

                <Button
                  onClick={() => handleRequestSwitch(otherTrack)}
                  disabled={requestSwitchMutation.isPending}
                  className="w-full"
                >
                  {requestSwitchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    `Request to Switch to ${otherTrack.name}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No tracks available */}
        {!currentTrack && !otherTrack && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No tracks available at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

