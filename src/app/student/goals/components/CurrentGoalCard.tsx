'use client'

import React, { useState, useEffect } from 'react'
import { Target, Calendar, Edit, Eye, CheckCircle, Clock, Circle, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueSubmissionModal } from './RevenueSubmissionModal'
import { getLatestRevenueSubmission } from '@/app/actions/revenue-actions'

interface Milestone {
  id: string
  title: string
  targetAmount: string
  completed: boolean
  completedDate?: string
}

interface RecentAction {
  id: string
  type: string
  title: string
  date: string
}

interface Goal {
  id: string
  title: string
  track: 'agency' | 'saas'
  startAmount: string
  targetAmount: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  startDate: string
  targetDate: string
  milestones: Milestone[]
  recentActions: RecentAction[]
}

interface CurrentGoalCardProps {
  goal: Goal
  conversationId?: string // Optional: for revenue submission
}

export function CurrentGoalCard({ goal, conversationId }: CurrentGoalCardProps) {
  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  // Fetch submission status on mount and after submission
  const fetchSubmissionStatus = async () => {
    if (!conversationId) return

    setIsLoadingStatus(true)
    try {
      const result = await getLatestRevenueSubmission(conversationId)
      if (result.submission && result.submission.metadata) {
        const metadata = result.submission.metadata as any
        setSubmissionStatus(metadata.status || null)
      } else {
        setSubmissionStatus(null)
      }
    } catch (error) {
      console.error('Error fetching submission status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    fetchSubmissionStatus()
  }, [conversationId])

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'reflection':
        return '📝'
      case 'course':
        return '🎥'
      case 'call':
        return '📞'
      case 'quiz':
        return '📋'
      case 'milestone':
        return '🎯'
      default:
        return '💡'
    }
  }

  const getMilestoneIcon = (completed: boolean) => {
    if (completed) return <CheckCircle className="h-5 w-5 text-green-600" />
    return <Circle className="h-5 w-5 text-gray-400" />
  }

  const getMilestoneStatus = (milestone: Milestone, index: number) => {
    if (milestone.completed) return 'completed'
    if (index === 0 || goal.milestones[index - 1]?.completed) return 'current'
    return 'upcoming'
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">{goal.title}</CardTitle>
          </div>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Goal
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Started: {new Date(goal.startDate).toLocaleDateString()}
          </div>
          <span className="text-gray-400">•</span>
          <div>Target: {new Date(goal.targetDate).toLocaleDateString()}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar with Revenue Submission */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Revenue Progress</span>
            <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${goal.progress}%` }}
            />
          </div>

          {/* Revenue Submission Button */}
          {conversationId && (
            <div className="mt-3">
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
                  className="w-full border-green-200 bg-green-50 hover:bg-green-100"
                  onClick={() => setShowRevenueModal(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  <span className="text-green-700">Last submission approved - Submit new proof</span>
                </Button>
              ) : submissionStatus === 'rejected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-200 bg-red-50 hover:bg-red-100"
                  onClick={() => setShowRevenueModal(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2 text-red-600" />
                  <span className="text-red-700">Resubmit Revenue Proof</span>
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
            </div>
          )}
        </div>

        {/* Milestones */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Milestones</h4>
          <div className="space-y-3">
            {goal.milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone, index)
              return (
                <div 
                  key={milestone.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    status === 'completed' ? 'bg-green-50 border-green-200' :
                    status === 'current' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  {getMilestoneIcon(milestone.completed)}
                  <div className="flex-1">
                    <div className={`font-medium ${
                      milestone.completed ? 'text-green-900' : 
                      status === 'current' ? 'text-blue-900' : 'text-gray-500'
                    }`}>
                      {milestone.title} ({milestone.targetAmount})
                    </div>
                    {milestone.completed && milestone.completedDate && (
                      <div className="text-xs text-green-600 mt-1">
                        Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {status === 'completed' && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                      Done
                    </span>
                  )}
                  {status === 'current' && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                      In Progress
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Actions */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Recent Actions</h4>
          <div className="space-y-2">
            {goal.recentActions.map((action) => (
              <div 
                key={action.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-lg">{getActionIcon(action.type)}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{action.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(action.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            View Full Timeline
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Goal History
          </Button>
        </div>
      </CardContent>

      {/* Revenue Submission Modal */}
      {conversationId && (
        <RevenueSubmissionModal
          isOpen={showRevenueModal}
          onClose={() => setShowRevenueModal(false)}
          conversationId={conversationId}
          trackType={goal.track}
          onSuccess={fetchSubmissionStatus}
        />
      )}
    </Card>
  )
}