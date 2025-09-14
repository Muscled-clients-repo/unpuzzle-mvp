'use client'

import React from 'react'
import { Target, Calendar, Edit, Eye, CheckCircle, Clock, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
}

export function CurrentGoalCard({ goal }: CurrentGoalCardProps) {
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
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
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
    </Card>
  )
}