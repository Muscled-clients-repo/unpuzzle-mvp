'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { History, Target, CheckCircle, ArrowRight, Calendar } from 'lucide-react'

interface TrackConversation {
  id: string
  status: string
  created_at: string
  ended_at: string | null
  end_reason: string | null
  track_name: string
  goal_name: string | null
  goal_description: string | null
  target_amount: number | null
  currency: string
  transition_to_track_name: string | null
}

export function TrackHistoryView() {
  const { user } = useAppStore()

  const { data: trackHistory, isLoading, error } = useQuery({
    queryKey: ['student-track-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const supabase = createClient()

      const { data: conversations, error } = await supabase
        .from('goal_conversations')
        .select(`
          id,
          status,
          created_at,
          ended_at,
          end_reason,
          tracks!goal_conversations_track_id_fkey (
            name
          ),
          track_goals (
            name,
            description,
            target_amount,
            currency
          ),
          transition_to_track:tracks!goal_conversations_transition_to_track_id_fkey (
            name
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch track history:', error)
        throw new Error('Failed to fetch track history')
      }

      // Transform data for display
      return (conversations || []).map(conv => ({
        id: conv.id,
        status: conv.status,
        created_at: conv.created_at,
        ended_at: conv.ended_at,
        end_reason: conv.end_reason,
        track_name: conv.tracks?.name || 'Unknown Track',
        goal_name: conv.track_goals?.name,
        goal_description: conv.track_goals?.description,
        target_amount: conv.track_goals?.target_amount,
        currency: conv.track_goals?.currency || 'USD',
        transition_to_track_name: conv.transition_to_track?.name
      })) as TrackConversation[]
    },
    enabled: !!user?.id
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'track_changed':
        return <Badge className="bg-yellow-100 text-yellow-800">Track Changed</Badge>
      case 'discontinued':
        return <Badge variant="outline">Discontinued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

  if (!trackHistory || trackHistory.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Track History</h3>
          <p className="text-muted-foreground">
            You haven't started any goal conversations yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {trackHistory.map((conversation, index) => (
          <Card key={conversation.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    conversation.status === 'active' ? 'bg-green-100 text-green-600' :
                    conversation.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {conversation.status === 'active' ? <Target className="h-5 w-5" /> :
                     conversation.status === 'completed' ? <CheckCircle className="h-5 w-5" /> :
                     <History className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{conversation.track_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {conversation.goal_name || conversation.goal_description || 'No goal assigned'}
                    </p>
                  </div>
                </div>
                {getStatusBadge(conversation.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Goal Details */}
              {conversation.goal_name && conversation.target_amount && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{conversation.goal_name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium">
                    {formatCurrency(conversation.target_amount, conversation.currency)}
                  </span>
                </div>
              )}

              {/* Timeline */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium">{formatDate(conversation.created_at)}</span>
                </div>

                {conversation.ended_at && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Ended:</span>
                      <span className="font-medium">{formatDate(conversation.ended_at)}</span>
                    </div>
                  </>
                )}

                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {calculateDuration(conversation.created_at, conversation.ended_at)} days
                </span>
              </div>

              {/* Transition Info */}
              {conversation.status === 'track_changed' && conversation.transition_to_track_name && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <ArrowRight className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Switched to <span className="font-medium">{conversation.transition_to_track_name}</span>
                  </span>
                </div>
              )}

              {/* End Reason */}
              {conversation.end_reason && conversation.status !== 'active' && (
                <div className="text-xs text-muted-foreground">
                  Reason: {conversation.end_reason.replace('_', ' ')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}