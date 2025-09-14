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
      title: 'UI/UX Designer to $4K/month',
      currentAmount: '$0',
      targetAmount: '$4,000',
      progress: 0,
      targetDate: '2025-03-31',
      status: 'active',
      startDate: '2024-09-17'
    },
    tasks: []
  },
  {
    goal: {
      id: '2',
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
      },
      {
        id: '4',
        type: 'portfolio',
        title: 'Update Portfolio with Recent Client Work',
        instructorComment: 'Add the 3 Shopify stores you completed last month to your portfolio. Make sure to include before/after screenshots, the specific challenges you solved, and results if you have them (conversion improvements, load time, etc).',
        dueDate: '2024-09-25',
        priority: 'medium',
        requestedAt: '2024-09-17 10:15',
        status: 'pending'
      },
      {
        id: '5',
        type: 'meeting',
        title: 'Schedule Strategy Call - Scaling to $7K',
        instructorComment: 'You\'re almost at $5K consistently. Time to plan the next phase. Let\'s hop on a 30-minute call this week to discuss team building, service expansion, and premium pricing strategies. What times work for you?',
        dueDate: '2024-09-19',
        priority: 'high',
        requestedAt: '2024-09-17 15:30',
        status: 'pending'
      }
    ]
  },
  {
    goal: {
      id: '3',
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
      },
      {
        id: '7',
        type: 'upwork',
        title: 'Apply to 20 High-Quality Writing Jobs',
        instructorComment: 'Focus on jobs $500+ with established clients. Write personalized proposals that show you understand their business. Quality over quantity - I\'d rather see 5 great proposals than 20 generic ones.',
        dueDate: '2024-03-01',
        priority: 'urgent',
        requestedAt: '2024-02-20 14:30',
        status: 'completed',
        studentResponse: {
          comment: 'Applied to 22 jobs, got 8 responses and 3 interviews! Your proposal template was perfect. Landed 2 long-term clients at $50/hour each. One is a SaaS company, the other does marketing for law firms.',
          submittedAt: '2024-02-28 19:45',
          attachments: ['successful_proposals.docx', 'client_contracts.pdf']
        }
      },
      {
        id: '8',
        type: 'reflection',
        title: 'Month 3 Revenue Analysis',
        instructorComment: 'Break down your revenue sources, time spent per client, and hourly rates. What\'s working best? What clients should you focus on replicating? Let\'s optimize your client mix.',
        dueDate: '2024-04-05',
        priority: 'medium',
        requestedAt: '2024-04-01 11:15',
        status: 'completed',
        studentResponse: {
          comment: 'Hit $2,800 in March! SaaS client pays best ($75/hr), law firm marketing is $50/hr but more hours. Blog writing is only $35/hr - should phase this out. Ready to raise rates and focus on B2B tech writing.',
          submittedAt: '2024-04-04 20:20',
          attachments: ['march_revenue_breakdown.xlsx']
        }
      }
    ]
  },
  {
    goal: {
      id: '4',
      title: 'E-commerce Store to $10K/month',
      currentAmount: '$8,500',
      targetAmount: '$10,000',
      progress: 85,
      targetDate: '2025-01-31',
      status: 'completed',
      startDate: '2024-03-01',
      completedDate: '2024-12-20',
      finalAmount: '$11,200'
    },
    tasks: [
      {
        id: '9',
        type: 'course',
        title: 'Complete Facebook Ads Masterclass',
        instructorComment: 'Your organic reach is maxed out. Time to master paid ads. This course covers everything from pixel setup to scaling winning campaigns. Focus on the e-commerce sections.',
        dueDate: '2024-04-15',
        priority: 'high',
        requestedAt: '2024-03-10 09:00',
        status: 'completed',
        studentResponse: {
          comment: 'Course completed! Set up my first campaign following the framework. Spent $500 in testing, found 2 winning ad sets. ROAS is 3.2x so far. Ready to scale up the budget next week.',
          submittedAt: '2024-04-12 14:15',
          attachments: ['fb_ads_completion_certificate.pdf', 'first_campaign_results.png']
        }
      },
      {
        id: '10',
        type: 'screenshot',
        title: 'Submit Ad Performance Screenshots',
        instructorComment: 'Show me your Facebook Ads Manager dashboard. I want to see your best performing ad sets, ROAS, and cost per acquisition. We\'ll use this data to optimize your scaling strategy.',
        dueDate: '2024-05-01',
        priority: 'medium',
        requestedAt: '2024-04-25 16:20',
        status: 'completed',
        studentResponse: {
          comment: 'Ads are performing great! Best ad set has 4.5x ROAS, CPA is $22 with $89 AOV. Scaling this to $200/day next week. The video ad you suggested is our top performer.',
          submittedAt: '2024-04-30 18:45',
          attachments: ['ads_manager_dashboard.png', 'top_performing_ads.png', 'revenue_breakdown.xlsx']
        }
      }
    ]
  }
]

export function GoalConversation() {
  const [selectedGoalId, setSelectedGoalId] = useState(mockGoalsData[0].goal.id) // Default to first goal (active)
  const [newResponse, setNewResponse] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')

  // Get current selected goal and its tasks
  const currentGoalData = mockGoalsData.find(data => data.goal.id === selectedGoalId) || mockGoalsData[0]
  const { goal: mockGoal, tasks: mockTasks } = currentGoalData

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'course': return <FileText className="h-5 w-5" />
      case 'video': return <FileText className="h-5 w-5" />
      case 'reflection': return <FileText className="h-5 w-5" />
      case 'call': return <Phone className="h-5 w-5" />
      case 'upwork': return <ExternalLink className="h-5 w-5" />
      case 'portfolio': return <Link2 className="h-5 w-5" />
      case 'screenshot': return <Camera className="h-5 w-5" />
      case 'meeting': return <Calendar className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleResponse = (taskId: string) => {
    // Handle submitting response
    console.log('Submitting response for task:', taskId, 'Response:', newResponse)
    setNewResponse('')
    setSelectedTaskId(null)
  }

  const handleSendMessage = () => {
    // Handle sending new message to instructor
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
    // In real implementation, this would update the task to remove studentResponse
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Goal Header */}
      <Card className="mb-8">
        <CardHeader>
          {/* Goal Selector */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Goal:</label>
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockGoalsData.map((goalData) => (
                  <SelectItem key={goalData.goal.id} value={goalData.goal.id}>
                    <div className="flex items-center gap-3">
                      {goalData.goal.status === 'completed' ? (
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      ) : goalData.goal.status === 'active' ? (
                        <Target className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={goalData.goal.status === 'completed' ? 'text-green-700' : ''}>
                        {goalData.goal.title}
                      </span>
                      {goalData.goal.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          ACHIEVED {goalData.goal.finalAmount}
                        </Badge>
                      )}
                      {goalData.goal.status === 'active' && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mockGoal.status === 'completed' ? (
                <div className="flex items-center gap-1">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <Target className="h-8 w-8 text-blue-600" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{mockGoal.title}</CardTitle>
                  {mockGoal.status === 'completed' && (
                    <Badge className="bg-green-100 text-green-800">
                      COMPLETED
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {mockGoal.status === 'completed' ? (
                    <>
                      <span>Started: <span className="font-semibold">{new Date(mockGoal.startDate).toLocaleDateString()}</span></span>
                      <span>Achieved: <span className="font-semibold text-green-600">{mockGoal.finalAmount}</span></span>
                      <span>Completed: <span className="font-semibold text-green-600">{mockGoal.completedDate && new Date(mockGoal.completedDate).toLocaleDateString()}</span></span>
                    </>
                  ) : (
                    <>
                      <span>Current: <span className="font-semibold text-green-600">{mockGoal.currentAmount}</span></span>
                      <span>Target: <span className="font-semibold text-blue-600">{mockGoal.targetAmount}</span></span>
                      <span>Due: {new Date(mockGoal.targetDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{mockGoal.progress}%</div>
              <div className="text-sm text-gray-600">
                {mockGoal.status === 'completed' ? 'Achieved' : 'Complete'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gray-900 h-3 rounded-full transition-all"
                style={{ width: `${mockGoal.progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Message Input for Student */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-1">
              ME
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Send message to instructor</span>
              </div>
              <Textarea
                placeholder="Ask a question, share an update, request help, or let your instructor know about any challenges you're facing..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px] mb-3"
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach Files
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Conversation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Instructor Tasks & Communication
          </CardTitle>
          <p className="text-gray-600">Complete tasks assigned by your instructor John Smith to reach your goal faster</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate)
              const isOverdue = daysUntilDue < 0
              const isDueToday = daysUntilDue === 0
              const isDueSoon = daysUntilDue <= 2 && daysUntilDue > 0

              return (
                <div key={task.id} className="border rounded-lg">
                  {/* Instructor Request */}
                  <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                        JS
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">John Smith</span>
                          <span className="text-xs text-gray-500">{task.requestedAt}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          {getTaskIcon(task.type)}
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        </div>
                        
                        <p className="text-gray-700 mb-3 bg-white p-3 rounded border-l-4 border-gray-300">
                          {task.instructorComment}
                        </p>
                        
                        <div className="text-xs text-gray-600">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {daysUntilDue >= 0 && (
                            <span className="ml-2">
                              ({daysUntilDue === 0 ? 'Due today' : 
                                daysUntilDue === 1 ? 'Due tomorrow' : 
                                `${daysUntilDue} days left`})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Response */}
                  {task.studentResponse ? (
                    <div className="bg-gray-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm">
                          ME
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">You</span>
                            <span className="text-xs text-gray-500">{task.studentResponse.submittedAt}</span>
                          </div>
                          <p className="text-gray-700 mb-3 bg-white p-3 rounded border-l-4 border-gray-300">
                            {task.studentResponse.comment}
                          </p>
                          {task.studentResponse.attachments && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {task.studentResponse.attachments.map((attachment, index) => (
                                <div key={index} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border">
                                  <Paperclip className="h-3 w-3" />
                                  {attachment}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Delete/Edit options for recent submissions */}
                          {canDeleteSubmission(task.studentResponse.submittedAt) && (
                            <div className="flex items-center gap-2 text-xs">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSubmission(task.id)}
                                className="text-red-600 hover:text-red-700 h-6 px-2"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                              <span className="text-gray-500">
                                (Can delete within 24 hours of submission)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50">
                      {selectedTaskId === task.id ? (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Share what you've completed, your thoughts, questions, or any challenges you faced..."
                            value={newResponse}
                            onChange={(e) => setNewResponse(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button onClick={() => handleResponse(task.id)} disabled={!newResponse.trim()}>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Response
                            </Button>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Attach Files
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => setSelectedTaskId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Button 
                            onClick={() => setSelectedTaskId(task.id)}
                            variant={task.status === 'pending' ? 'default' : 'outline'}
                          >
                            Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}