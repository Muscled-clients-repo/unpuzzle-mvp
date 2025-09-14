'use client'

import React, { useState } from 'react'
import { Target, Clock, AlertCircle, CheckCircle, Send, Paperclip, Upload, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface TimelineEvent {
  id: string
  type: 'instructor_request' | 'student_completion' | 'system_notification'
  timestamp: string
  title: string
  content: string
  taskType?: 'course' | 'video' | 'reflection' | 'call' | 'upwork' | 'portfolio' | 'screenshot' | 'meeting'
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  dueDate?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
  attachments?: string[]
  relatedTaskId?: string
}

interface Goal {
  id: string
  title: string
  currentAmount: string
  targetAmount: string
  progress: number
  targetDate: string
}

const mockGoal: Goal = {
  id: '1',
  title: 'Shopify Agency to $5K/month',
  currentAmount: '$3,750',
  targetAmount: '$5,000',
  progress: 75,
  targetDate: '2024-12-31'
}

// Mock timeline events (most recent first)
const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'instructor_request',
    timestamp: '2024-09-17T15:30:00',
    title: 'Schedule Strategy Call - Scaling to $7K',
    content: 'You\'re almost at $5K consistently. Time to plan the next phase. Let\'s hop on a 30-minute call this week to discuss team building, service expansion, and premium pricing strategies. What times work for you?',
    taskType: 'meeting',
    priority: 'high',
    dueDate: '2024-09-19',
    status: 'pending'
  },
  {
    id: '2',
    type: 'system_notification',
    timestamp: '2024-09-17T11:20:00',
    title: 'Due Date Reminder',
    content: 'Upwork Applications task is due tomorrow (Sep 18)',
    status: 'pending'
  },
  {
    id: '3',
    type: 'instructor_request',
    timestamp: '2024-09-16T16:45:00',
    title: 'Share Last 10 Upwork Applications',
    content: 'Send me links to the last 10 jobs you applied to on Upwork, plus the actual proposals you sent. I want to see if you\'re targeting the right clients and if your proposals are compelling enough. We need to get your close rate above 15%.',
    taskType: 'upwork',
    priority: 'medium',
    dueDate: '2024-09-18',
    status: 'pending'
  },
  {
    id: '4',
    type: 'student_completion',
    timestamp: '2024-09-16T14:22:00',
    title: 'Completed Advanced Shopify Development Course',
    content: 'Finished the course! The client onboarding automation section was gold - I\'ve already started implementing the 3-step process you mentioned. Biggest takeaway: setting proper expectations upfront saves so much back-and-forth later.',
    attachments: ['course_completion_certificate.pdf', 'onboarding_process_notes.md'],
    relatedTaskId: '5'
  },
  {
    id: '5',
    type: 'instructor_request',
    timestamp: '2024-09-14T09:30:00',
    title: 'Complete "Advanced Shopify Development" Course',
    content: 'This course covers exactly what you need for scaling past $4K. Focus on the client onboarding modules - that\'s where I see most agencies struggle. Take notes and let me know your biggest takeaway.',
    taskType: 'course',
    priority: 'high',
    dueDate: '2024-09-18',
    status: 'completed'
  },
  {
    id: '6',
    type: 'instructor_request',
    timestamp: '2024-09-15T16:45:00',
    title: 'Submit Sales Call Recording + Analysis',
    content: 'I want you to record your next client discovery call. Focus on asking the questions we discussed: budget, timeline, previous experiences, and pain points. After the call, write a 2-3 sentence analysis of what went well and what you\'d improve.',
    taskType: 'call',
    priority: 'urgent',
    dueDate: '2024-09-20',
    status: 'in_progress'
  },
  {
    id: '7',
    type: 'student_completion',
    timestamp: '2024-09-13T10:15:00',
    title: 'Submitted Client Onboarding Process Documentation',
    content: 'Created the 3-step onboarding process we discussed. Included email templates, project timeline template, and client expectation checklist. Already tested it with 2 new clients and they love the clarity!',
    attachments: ['onboarding_process_v1.pdf', 'email_templates.docx'],
    relatedTaskId: '8'
  },
  {
    id: '8',
    type: 'instructor_request',
    timestamp: '2024-09-12T14:20:00',
    title: 'Document Your Client Onboarding Process',
    content: 'Based on our last call, I want you to write down your current client onboarding process. What steps do you take from contract signing to project kickoff? We need to systematize this before you scale further.',
    taskType: 'reflection',
    priority: 'medium',
    dueDate: '2024-09-15',
    status: 'completed'
  }
]

export function GoalTimeline() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [newResponse, setNewResponse] = useState('')

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleResponse = (eventId: string) => {
    console.log('Submitting response for event:', eventId, 'Response:', newResponse)
    setNewResponse('')
    setSelectedEventId(null)
  }

  // Group events by date
  const groupedEvents = mockTimelineEvents.reduce((groups, event) => {
    const dateKey = formatDate(event.timestamp)
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(event)
    return groups
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Goal Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">{mockGoal.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>Current: <span className="font-semibold text-green-600">{mockGoal.currentAmount}</span></span>
                  <span>Target: <span className="font-semibold text-blue-600">{mockGoal.targetAmount}</span></span>
                  <span>Due: {new Date(mockGoal.targetDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{mockGoal.progress}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                style={{ width: `${mockGoal.progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Goal Progress Timeline
          </CardTitle>
          <p className="text-gray-600">Chronological view of instructor requests and your completions</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, events]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center mb-6">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold text-sm rounded-full">
                    {date}
                  </div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Events for this date */}
                <div className="space-y-6 relative">
                  {/* Timeline line */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-300 h-full"></div>
                  
                  {events.map((event, index) => {
                    const daysUntilDue = getDaysUntilDue(event.dueDate)
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0
                    const isDueToday = daysUntilDue === 0
                    const isDueSoon = daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue > 0

                    if (event.type === 'instructor_request') {
                      return (
                        <div key={event.id} className="flex items-start gap-4">
                          {/* Left side - Instructor Request */}
                          <div className="flex-1 max-w-md">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
                              <div className="absolute -right-2 top-4 w-4 h-4 bg-blue-50 border-r border-b border-blue-200 transform rotate-45"></div>
                              
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                                  JS
                                </div>
                                <span className="font-semibold text-gray-900">John Smith</span>
                                <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                                {event.priority && (
                                  <Badge className={getPriorityColor(event.priority)}>
                                    {event.priority.toUpperCase()}
                                  </Badge>
                                )}
                                {event.status && (
                                  <Badge className={getStatusColor(event.status)}>
                                    {event.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              
                              <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                              <p className="text-gray-700 text-sm mb-3">{event.content}</p>
                              
                              {event.dueDate && (
                                <div className="text-xs text-gray-600 mb-2">
                                  Due: {new Date(event.dueDate).toLocaleDateString()}
                                  {daysUntilDue !== null && (
                                    <span className={`ml-2 font-medium ${
                                      isOverdue ? 'text-red-600' : 
                                      isDueToday ? 'text-orange-600' : 
                                      isDueSoon ? 'text-yellow-600' : 'text-gray-600'
                                    }`}>
                                      ({isOverdue ? 'OVERDUE' : 
                                        isDueToday ? 'DUE TODAY' : 
                                        daysUntilDue === 1 ? 'DUE TOMORROW' : 
                                        `${daysUntilDue} days left`})
                                    </span>
                                  )}
                                </div>
                              )}

                              {event.status === 'pending' && (
                                <div className="mt-3">
                                  {selectedEventId === event.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Share your progress, questions, or completed work..."
                                        value={newResponse}
                                        onChange={(e) => setNewResponse(e.target.value)}
                                        className="text-sm"
                                        rows={3}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => handleResponse(event.id)} disabled={!newResponse.trim()}>
                                          <Send className="h-3 w-3 mr-1" />
                                          Submit
                                        </Button>
                                        <Button variant="outline" size="sm">
                                          <Upload className="h-3 w-3 mr-1" />
                                          Attach
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedEventId(null)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button size="sm" onClick={() => setSelectedEventId(event.id)}>
                                      Respond
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Timeline dot */}
                          <div className="relative z-10">
                            <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
                          </div>

                          {/* Right side - empty for instructor requests */}
                          <div className="flex-1 max-w-md"></div>
                        </div>
                      )
                    } else if (event.type === 'student_completion') {
                      return (
                        <div key={event.id} className="flex items-start gap-4">
                          {/* Left side - empty for student completions */}
                          <div className="flex-1 max-w-md"></div>

                          {/* Timeline dot */}
                          <div className="relative z-10">
                            <div className="w-3 h-3 bg-green-600 rounded-full border-2 border-white"></div>
                          </div>

                          {/* Right side - Student Completion */}
                          <div className="flex-1 max-w-md">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 relative">
                              <div className="absolute -left-2 top-4 w-4 h-4 bg-green-50 border-l border-t border-green-200 transform rotate-45"></div>
                              
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-xs">
                                  ME
                                </div>
                                <span className="font-semibold text-gray-900">You</span>
                                <span className="text-xs text-gray-500">{formatTime(event.timestamp)}</span>
                                <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                              </div>
                              
                              <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                              <p className="text-gray-700 text-sm mb-3">{event.content}</p>
                              
                              {event.attachments && event.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {event.attachments.map((attachment, i) => (
                                    <div key={i} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-green-300">
                                      <Paperclip className="h-3 w-3" />
                                      {attachment}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    } else if (event.type === 'system_notification') {
                      return (
                        <div key={event.id} className="flex items-center justify-center">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-md">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium text-yellow-900">{event.title}</span>
                              <span className="text-yellow-700">- {event.content}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return null
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}