'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Bug,
  Lightbulb,
  ArrowUpDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react'
import { getAllRequests, updateRequestStatus, approveTrackChangeRequest } from '@/lib/actions/request-actions'
import { toast } from 'sonner'

export default function RequestsPage() {
  const [filter, setFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['all-requests'],
    queryFn: getAllRequests
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) =>
      updateRequestStatus(requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] })
      toast.success('Request status updated successfully')
    },
    onError: () => {
      toast.error('Failed to update request status')
    }
  })

  const approveTrackChangeMutation = useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string }) =>
      approveTrackChangeRequest(requestId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] })
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error('Failed to approve track change request')
      console.error(error)
    }
  })

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'bug_report': return <Bug className="h-4 w-4 text-red-500" />
      case 'feature_request': return <Lightbulb className="h-4 w-4 text-blue-500" />
      case 'track_change': return <ArrowUpDown className="h-4 w-4 text-orange-500" />
      case 'refund': return <DollarSign className="h-4 w-4 text-green-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case 'in_review':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">In Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Completed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Medium</Badge>
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const filteredRequests = requests?.filter(request => {
    if (filter === 'all') return true
    return request.request_type === filter
  }) || []

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading requests...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Student Requests
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage student requests for bug reports, features, track changes, and refunds.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="bug_report">Bug Reports</SelectItem>
            <SelectItem value="feature_request">Feature Requests</SelectItem>
            <SelectItem value="track_change">Track Changes</SelectItem>
            <SelectItem value="refund">Refunds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No requests found.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getRequestIcon(request.request_type)}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        by {request.profiles?.full_name || request.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(request.priority)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {request.description}
                </p>

                {/* Track Change Metadata */}
                {request.request_type === 'track_change' && request.metadata && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Track Change Details:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From: <span className="font-medium">{request.metadata.current_track}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      To: <span className="font-medium">{request.metadata.desired_track}</span>
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({
                          requestId: request.id,
                          status: 'in_review'
                        })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => {
                          if (request.request_type === 'track_change') {
                            approveTrackChangeMutation.mutate({
                              requestId: request.id,
                              notes: 'Track change approved - student will need to complete questionnaire for new track'
                            })
                          } else {
                            updateStatusMutation.mutate({
                              requestId: request.id,
                              status: 'approved'
                            })
                          }
                        }}
                        disabled={updateStatusMutation.isPending || approveTrackChangeMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {request.request_type === 'track_change' ? 'Approve & Send to Questionnaire' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => updateStatusMutation.mutate({
                          requestId: request.id,
                          status: 'rejected'
                        })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({
                        requestId: request.id,
                        status: 'completed'
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}