'use client'

import React, { useState } from 'react'
import { Target, Send, Paperclip, Calendar, ExternalLink, Upload, FileText, Phone, Camera, Link2, Clock, ChevronDown, Trophy, CheckCircle, MessageCircle, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TaskRequest {
  id: string
  type: 'course' | 'video' | 'reflection' | 'call' | 'upwork' | 'portfolio' | 'screenshot' | 'meeting'
  title: string
  instructorComment: string
  dueDate: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  requestedAt: string
  status: 'pending' | 'in_progress' | 'completed'
  studentResponse?: {
    comment: string
    submittedAt: string
    attachments?: string[]
  }
}

interface Goal {
  id: string
  title: string
  currentAmount: string
  targetAmount: string
  progress: number
  targetDate: string
  status: 'active' | 'completed' | 'paused'
  startDate: string
  completedDate?: string
  finalAmount?: string
}

interface GoalData {
  goal: Goal
  tasks: TaskRequest[]
}

// Mock data for multiple goals
const mockGoalsData: GoalData[] = [
  {
    goal: {
      id: '1',
      title: 'Shopify Agency to $5K/month',
      currentAmount: '$3,750',
      targetAmount: '$5,000',
      progress: 75,
      targetDate: '2024-12-31',
      status: 'active',
      startDate: '2024-07-01'
    },
    tasks: [
      {
        id: '1',
        type: 'course',
        title: 'Complete "Advanced Shopify Development" Course',
        instructorComment: 'This course covers exactly what you need for scaling past $4K. Focus on the client onboarding modules - that\'s where I see most agencies struggle. Take notes and let me know your biggest takeaway.',
        dueDate: '2024-09-18',
        priority: 'high',
        requestedAt: '2024-09-14 09:30',
        status: 'completed',
        studentResponse: {
          comment: 'Finished the course! The client onboarding automation section was gold - I\'ve already started implementing the 3-step process you mentioned. Biggest takeaway: setting proper expectations upfront saves so much back-and-forth later.',
          submittedAt: '2024-09-16 14:22',
          attachments: ['course_completion_certificate.pdf', 'onboarding_process_notes.md']
        }
      },
      {
        id: '2',
        type: 'call',
        title: 'Submit Sales Call Recording + Analysis',
        instructorComment: 'I want you to record your next client discovery call. Focus on asking the questions we discussed: budget, timeline, previous experiences, and pain points. After the call, write a 2-3 sentence analysis of what went well and what you\'d improve.',
        dueDate: '2024-09-20',
        priority: 'urgent',
        requestedAt: '2024-09-15 16:45',
        status: 'in_progress'
      },
      {
        id: '3',
        type: 'upwork',
        title: 'Share Last 10 Upwork Applications',
        instructorComment: 'Send me links to the last 10 jobs you applied to on Upwork, plus the actual proposals you sent. I want to see if you\'re targeting the right clients and if your proposals are compelling enough. We need to get your close rate above 15%.',
        dueDate: '2024-09-22',
        priority: 'medium',
        requestedAt: '2024-09-16 11:20',
        status: 'pending'
      }
    ]
  },
  {
    goal: {
      id: '2',
      title: 'Freelance Writing to $3K/month',
      currentAmount: '$3,200',
      targetAmount: '$3,000',
      progress: 100,
      targetDate: '2024-06-30',
      status: 'completed',
      startDate: '2024-01-15',
      completedDate: '2024-06-15',
      finalAmount: '$3,200'
    },
    tasks: [
      {
        id: '6',
        type: 'portfolio',
        title: 'Build Writing Portfolio Website',
        instructorComment: 'Create a professional portfolio showcasing your best work. Include 5-6 diverse writing samples, client testimonials, and clear pricing. This will be crucial for landing higher-paying clients.',
        dueDate: '2024-02-15',
        priority: 'high',
        requestedAt: '2024-01-20 10:00',
        status: 'completed',
        studentResponse: {
          comment: 'Portfolio is live! Used WordPress with a clean theme. Added 6 writing samples across different niches, got testimonials from my first 3 clients, and created a clear pricing page. Already getting inquiries!',
          submittedAt: '2024-02-10 16:30',
          attachments: ['portfolio_website_screenshots.pdf', 'www.mywritingportfolio.com']
        }
      }
    ]
  }
]

export function GoalConversationMinimal() {
  const [selectedGoalId, setSelectedGoalId] = useState(mockGoalsData[0].goal.id)
  const [newResponse, setNewResponse] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')

  const currentGoalData = mockGoalsData.find(data => data.goal.id === selectedGoalId) || mockGoalsData[0]
  const { goal: mockGoal, tasks: mockTasks } = currentGoalData

  const handleResponse = (taskId: string) => {
    console.log('Submitting response for task:', taskId, 'Response:', newResponse)
    setNewResponse('')
    setSelectedTaskId(null)
  }

  const handleSendMessage = () => {
    console.log('Sending message to instructor:', newMessage)
    setNewMessage('')
  }

  const canDeleteSubmission = (submittedAt: string) => {
    const submissionTime = new Date(submittedAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - submissionTime.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 24
  }

  const handleDeleteSubmission = (taskId: string) => {
    console.log('Deleting submission for task:', taskId)
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'w-2 h-2 rounded-full bg-red-500'
      case 'high': return 'w-2 h-2 rounded-full bg-orange-500'
      case 'medium': return 'w-2 h-2 rounded-full bg-blue-500'
      default: return 'w-2 h-2 rounded-full bg-gray-400'
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Minimal Goal Header */}
      <div className="mb-8">
        {/* Goal Selector */}
        <div className="mb-6">
          <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
            <SelectTrigger className="w-full max-w-md border-none shadow-none bg-transparent p-0 h-auto">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-600" />
                <span className="text-lg font-medium text-gray-900">{mockGoal.title}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {mockGoalsData.map((goalData) => (
                <SelectItem key={goalData.goal.id} value={goalData.goal.id}>
                  <div className="flex items-center gap-2">
                    {goalData.goal.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Target className="h-4 w-4 text-gray-600" />
                    )}
                    <span>{goalData.goal.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{mockGoal.currentAmount} → {mockGoal.targetAmount}</span>
            <span>{mockGoal.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gray-900 h-1 rounded-full transition-all"
              style={{ width: `${mockGoal.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Minimal Message Input */}
      <div className="mb-8">
        <div className="border border-gray-200 rounded-lg p-4 focus-within:border-gray-400 transition-colors">
          <Textarea
            placeholder="Send a message to your instructor..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="border-none resize-none shadow-none p-0 focus-visible:ring-0"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim()}
              size="sm"
              className="bg-gray-900 hover:bg-gray-800"
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Minimal Task List */}
      <div className="space-y-6">
        {mockTasks.map((task) => {
          const daysUntilDue = getDaysUntilDue(task.dueDate)
          const isOverdue = daysUntilDue < 0

          return (
            <div key={task.id} className="border border-gray-200 rounded-lg">
              {/* Instructor Request */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">JS</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">John Smith</span>
                      <div className={getPriorityDot(task.priority)}></div>
                      <span className="text-xs text-gray-500">{task.requestedAt}</span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-3">{task.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{task.instructorComment}</p>
                    
                    {task.dueDate && (
                      <div className="text-xs text-gray-500">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                        {isOverdue && <span className="text-red-600 ml-1">(Overdue)</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Response or Input */}
              {task.studentResponse ? (
                <div className="p-6 bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">ME</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">You</span>
                        <span className="text-xs text-gray-500">{task.studentResponse.submittedAt}</span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">{task.studentResponse.comment}</p>
                      
                      {task.studentResponse.attachments && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.studentResponse.attachments.map((attachment, index) => (
                            <span key={index} className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                              {attachment}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {canDeleteSubmission(task.studentResponse.submittedAt) && (
                        <button 
                          onClick={() => handleDeleteSubmission(task.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete (within 24h)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {selectedTaskId === task.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Share what you've completed..."
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        className="border-gray-200"
                        rows={4}
                      />
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleResponse(task.id)} 
                          disabled={!newResponse.trim()}
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800"
                        >
                          Submit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTaskId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setSelectedTaskId(task.id)}
                      variant="outline"
                      size="sm"
                      className="border-gray-300"
                    >
                      Respond
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}