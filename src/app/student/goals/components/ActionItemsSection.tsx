'use client'

import React, { useState } from 'react'
import { CheckSquare, Clock, Play, Upload, FileText, AlertCircle, Flame, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ActionItem {
  id: string
  type: 'reflection' | 'course' | 'call' | 'quiz' | 'milestone' | 'task'
  title: string
  description: string
  assignedBy: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  progress?: number
}

interface ActionItemsSectionProps {
  actionItems: ActionItem[]
}

export function ActionItemsSection({ actionItems }: ActionItemsSectionProps) {
  const [activeTab, setActiveTab] = useState<'todo' | 'completed' | 'all'>('todo')

  const todoItems = actionItems.filter(item => !item.completed)
  const completedItems = actionItems.filter(item => item.completed)
  const allItems = actionItems

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'todo':
        return todoItems
      case 'completed':
        return completedItems
      case 'all':
        return allItems
      default:
        return todoItems
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'reflection':
        return <FileText className="h-5 w-5" />
      case 'course':
        return <Play className="h-5 w-5" />
      case 'call':
        return <Upload className="h-5 w-5" />
      case 'quiz':
        return <CheckSquare className="h-5 w-5" />
      case 'milestone':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getActionEmoji = (type: string) => {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Flame className="h-4 w-4 text-red-500" />
      case 'medium':
        return <Zap className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'HIGH PRIORITY'
      case 'medium':
        return 'MEDIUM PRIORITY'
      default:
        return 'STUDY'
    }
  }

  const getActionButton = (item: ActionItem) => {
    switch (item.type) {
      case 'reflection':
        return (
          <Button size="sm" className="mr-2">
            <FileText className="h-4 w-4 mr-1" />
            Start Reflection
          </Button>
        )
      case 'course':
        return (
          <Button size="sm" className="mr-2">
            <Play className="h-4 w-4 mr-1" />
            Continue Course
          </Button>
        )
      case 'call':
        return (
          <Button size="sm" className="mr-2">
            <Upload className="h-4 w-4 mr-1" />
            Upload Recording
          </Button>
        )
      default:
        return (
          <Button size="sm" className="mr-2">
            <Play className="h-4 w-4 mr-1" />
            Start Task
          </Button>
        )
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const groupedItems = getCurrentItems().reduce((groups, item) => {
    if (!groups[item.priority]) {
      groups[item.priority] = []
    }
    groups[item.priority].push(item)
    return groups
  }, {} as Record<string, ActionItem[]>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">Action Items</CardTitle>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'todo' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            TO-DO ({todoItems.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'completed' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            COMPLETED ({completedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ALL ACTIONS ({allItems.length})
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'todo' && (
          <div className="space-y-6">
            {['high', 'medium', 'low'].map((priority) => {
              const items = groupedItems[priority] || []
              if (items.length === 0) return null

              return (
                <div key={priority}>
                  <div className="flex items-center gap-2 mb-3">
                    {getPriorityIcon(priority)}
                    <h4 className="font-semibold text-gray-900 text-sm tracking-wide">
                      {getPriorityText(priority)}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => {
                      const daysUntilDue = getDaysUntilDue(item.dueDate)
                      return (
                        <div 
                          key={item.id}
                          className={`border rounded-lg p-4 ${getPriorityColor(priority)}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getActionEmoji(item.type)}</span>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900 mb-1">
                                {item.title}
                              </h5>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>Assigned by: <span className="font-medium">{item.assignedBy}</span></span>
                                <span className="text-gray-400">•</span>
                                <span className={`font-medium ${
                                  daysUntilDue < 0 ? 'text-red-600' :
                                  daysUntilDue === 0 ? 'text-orange-600' :
                                  daysUntilDue <= 2 ? 'text-yellow-600' : 'text-gray-600'
                                }`}>
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                  {daysUntilDue < 0 && ' (Overdue)'}
                                  {daysUntilDue === 0 && ' (Due Today)'}
                                  {daysUntilDue === 1 && ' (Due Tomorrow)'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-3">
                                "{item.description}"
                              </p>
                              
                              {item.progress !== undefined && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-medium text-gray-900">{item.progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all"
                                      style={{ width: `${item.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex">
                                  {getActionButton(item)}
                                  <Button variant="outline" size="sm">
                                    Mark Complete
                                  </Button>
                                </div>
                                {daysUntilDue <= 1 && daysUntilDue >= 0 && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                                    {daysUntilDue === 0 ? 'Due Today' : 'Due Tomorrow'}
                                  </Badge>
                                )}
                                {daysUntilDue < 0 && (
                                  <Badge variant="destructive">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {todoItems.length === 0 && (
              <div className="text-center py-12">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">You have no pending action items.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed items</h3>
                <p className="text-gray-600">Complete some actions to see them here.</p>
              </div>
            ) : (
              completedItems.map((item) => (
                <div 
                  key={item.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getActionEmoji(item.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-green-900">{item.title}</h5>
                        <CheckSquare className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-sm text-green-700 mt-1">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-3">
            {allItems.map((item) => (
              <div 
                key={item.id}
                className={`border rounded-lg p-4 ${
                  item.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getActionEmoji(item.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className={`font-semibold ${
                        item.completed ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {item.title}
                      </h5>
                      {item.completed && <CheckSquare className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className={`text-sm mt-1 ${
                      item.completed ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}