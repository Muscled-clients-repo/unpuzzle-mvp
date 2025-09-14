'use client'

import React, { useState } from 'react'
import { Target, Calendar, Plus, Clock, Video, MessageCircle, Trophy, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DailyActivity {
  id: string
  type: 'auto' | 'manual'
  category: 'video' | 'quiz' | 'reflection' | 'hint' | 'question' | 'proposal' | 'call' | 'research' | 'application' | 'portfolio'
  description: string
  timestamp: string
  metadata?: {
    videoTitle?: string
    quizScore?: number
    hintsUsed?: number
    duration?: number
    platform?: string
    amount?: string
  }
}

interface DailyEntry {
  day: number
  date: string
  activities: DailyActivity[]
  studentNote?: string
}

interface Goal {
  id: string
  title: string
  currentAmount: string
  targetAmount: string
  progress: number
  targetDate: string
  startDate: string
  status: 'active' | 'completed'
}

// Mock data showing daily progress tracking
const mockGoal: Goal = {
  id: '1',
  title: 'UI/UX Designer to $4K/month',
  currentAmount: '$450',
  targetAmount: '$4,000',
  progress: 11,
  targetDate: '2025-03-17',
  startDate: '2024-09-17',
  status: 'active'
}

const mockDailyEntries: DailyEntry[] = [
  {
    day: 8,
    date: '2024-09-24',
    activities: [
      {
        id: '1',
        type: 'auto',
        category: 'video',
        description: 'Watched "Figma Advanced Prototyping" video',
        timestamp: '2024-09-24 14:30:00',
        metadata: { videoTitle: 'Figma Advanced Prototyping', duration: 18 }
      },
      {
        id: '2',
        type: 'auto',
        category: 'quiz',
        description: 'Completed quiz on prototyping principles',
        timestamp: '2024-09-24 14:55:00',
        metadata: { quizScore: 85 }
      }
    ]
  },
  {
    day: 7,
    date: '2024-09-23',
    activities: [
      {
        id: '5',
        type: 'auto',
        category: 'video',
        description: 'Watched "User Research Methods" video',
        timestamp: '2024-09-23 10:15:00',
        metadata: { videoTitle: 'User Research Methods', duration: 25 }
      },
      {
        id: '6',
        type: 'auto',
        category: 'hint',
        description: 'Used 3 hints during design exercise',
        timestamp: '2024-09-23 10:45:00',
        metadata: { hintsUsed: 3 }
      },
      {
        id: '7',
        type: 'manual',
        category: 'research',
        description: 'Researched 10 competitor SaaS designs for inspiration',
        timestamp: '2024-09-23 15:30:00',
        metadata: { duration: 90 }
      }
    ],
    studentNote: 'User research is more complex than I thought. Need to practice more.'
  },
  {
    day: 6,
    date: '2024-09-22',
    activities: [
      {
        id: '8',
        type: 'auto',
        category: 'reflection',
        description: 'Submitted reflection on design thinking process',
        timestamp: '2024-09-22 11:20:00'
      },
      {
        id: '9',
        type: 'manual',
        category: 'call',
        description: 'Had 30-min call with potential client about website redesign',
        timestamp: '2024-09-22 14:00:00',
        metadata: { duration: 30, amount: '$800 project discussed' }
      }
    ],
    studentNote: 'First potential client call! They liked my portfolio but want to see more e-commerce work.'
  },
  {
    day: 5,
    date: '2024-09-21',
    activities: [
      {
        id: '10',
        type: 'auto',
        category: 'video',
        description: 'Watched "Design Systems Fundamentals"',
        timestamp: '2024-09-21 13:15:00',
        metadata: { videoTitle: 'Design Systems Fundamentals', duration: 22 }
      },
      {
        id: '11',
        type: 'auto',
        category: 'question',
        description: 'Asked AI about component libraries',
        timestamp: '2024-09-21 13:40:00'
      }
    ]
  },
  {
    day: 4,
    date: '2024-09-20',
    activities: [
      {
        id: '12',
        type: 'manual',
        category: 'portfolio',
        description: 'Created mobile version of skincare website design',
        timestamp: '2024-09-20 16:00:00'
      }
    ]
  },
  {
    day: 3,
    date: '2024-09-19',
    activities: [
      {
        id: '13',
        type: 'auto',
        category: 'video',
        description: 'Watched "Mobile-First Design Principles"',
        timestamp: '2024-09-19 09:30:00',
        metadata: { videoTitle: 'Mobile-First Design Principles', duration: 16 }
      },
      {
        id: '14',
        type: 'manual',
        category: 'research',
        description: 'Analyzed 15 top skincare brand websites',
        timestamp: '2024-09-19 14:20:00',
        metadata: { duration: 120 }
      }
    ]
  },
  {
    day: 2,
    date: '2024-09-18',
    activities: [
      {
        id: '15',
        type: 'auto',
        category: 'video',
        description: 'Watched "Figma Basics for Beginners"',
        timestamp: '2024-09-18 11:00:00',
        metadata: { videoTitle: 'Figma Basics for Beginners', duration: 28 }
      },
      {
        id: '16',
        type: 'auto',
        category: 'quiz',
        description: 'Completed Figma basics quiz',
        timestamp: '2024-09-18 11:35:00',
        metadata: { quizScore: 92 }
      }
    ]
  },
  {
    day: 1,
    date: '2024-09-17',
    activities: [
      {
        id: '17',
        type: 'manual',
        category: 'research',
        description: 'Set up goal and researched UI/UX learning path',
        timestamp: '2024-09-17 16:30:00',
        metadata: { duration: 45 }
      }
    ],
    studentNote: 'Starting my UI/UX journey! Excited but also nervous. Need to stay consistent.'
  }
]

export function DailyGoalTracker() {
  const [newActivity, setNewActivity] = useState('')
  const [activityType, setActivityType] = useState<string>('')
  const [dailyNote, setDailyNote] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAllActivities, setShowAllActivities] = useState(false)

  // For now, use the highest day in our mock data as "current day"
  // In real implementation, this would calculate based on actual start date
  const currentDay = Math.max(...mockDailyEntries.map(entry => entry.day))
  const todaysEntry = mockDailyEntries.find(entry => entry.day === currentDay)

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'video': return '📹'
      case 'quiz': return '📝'
      case 'reflection': return '💭'
      case 'hint': return '💡'
      case 'question': return '❓'
      case 'proposal': return '📄'
      case 'call': return '📞'
      case 'research': return '🔍'
      case 'application': return '📧'
      case 'portfolio': return '🎨'
      default: return '✅'
    }
  }

  const getActivityTypeColor = (type: 'auto' | 'manual') => {
    return type === 'auto' ? 'text-blue-600' : 'text-gray-600'
  }

  const addManualActivity = () => {
    if (!newActivity.trim() || !activityType) return
    
    console.log('Adding manual activity:', { type: activityType, description: newActivity })
    setNewActivity('')
    setActivityType('')
  }

  const updateDailyNote = () => {
    console.log('Updating daily note:', dailyNote)
    setDailyNote('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Goal Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-gray-600" />
              <div>
                <CardTitle className="text-2xl">{mockGoal.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>Current: <span className="font-semibold text-gray-900">{mockGoal.currentAmount}</span></span>
                  <span>Target: <span className="font-semibold text-gray-900">{mockGoal.targetAmount}</span></span>
                  <span>Started: {new Date(mockGoal.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">Day {currentDay}</div>
              <div className="text-sm text-gray-600">{mockGoal.progress}% Complete</div>
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

      {/* Today's Activity Input */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Day {currentDay} - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-tracked activities for today */}
          {todaysEntry && todaysEntry.activities.filter(a => a.type === 'auto').length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Unpuzzle tracked your activity today ({todaysEntry.activities.filter(a => a.type === 'auto').length} activities)
                </h4>
                {todaysEntry.activities.filter(a => a.type === 'auto').length > 3 && (
                  <button 
                    onClick={() => setShowAllActivities(!showAllActivities)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAllActivities ? 'Show less' : 'View all'}
                  </button>
                )}
              </div>
              
              <div className={`space-y-1 ${!showAllActivities && todaysEntry.activities.filter(a => a.type === 'auto').length > 3 ? 'max-h-24 overflow-hidden' : ''}`}>
                {todaysEntry.activities
                  .filter(a => a.type === 'auto')
                  .map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-sm">{getActivityIcon(activity.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-900 text-xs font-medium truncate">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <span>{new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}</span>
                          {activity.metadata && (
                            <>
                              {activity.metadata.duration && <span>• {activity.metadata.duration}min</span>}
                              {activity.metadata.quizScore && <span>• {activity.metadata.quizScore}%</span>}
                              {activity.metadata.hintsUsed && <span>• {activity.metadata.hintsUsed} hints</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {!showAllActivities && todaysEntry.activities.filter(a => a.type === 'auto').length > 3 && (
                <div className="text-center mt-2">
                  <button 
                    onClick={() => setShowAllActivities(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    +{todaysEntry.activities.filter(a => a.type === 'auto').length - 3} more activities
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Single journal-style input */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              What else did you do today to get closer to your goal?
            </h4>
            
            {/* Drag and drop area */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
              onDrop={(e) => {
                e.preventDefault()
                console.log('Files dropped:', e.dataTransfer.files)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <Textarea
                placeholder="Applied to 5 UI jobs on LinkedIn today. Also had a great call with a potential client about their e-commerce redesign - they want to pay $1200! 

Share what you accomplished, any challenges you faced, insights you gained, or how you're feeling about your progress..."
                value={dailyNote}
                onChange={(e) => setDailyNote(e.target.value)}
                className="min-h-[120px] border-none resize-none shadow-none p-0 focus-visible:ring-0 bg-transparent"
              />
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📎 Drag files here or</span>
                  <button 
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => console.log('File picker opened')}
                  >
                    browse to attach
                  </button>
                </div>
                <Button 
                  onClick={updateDailyNote} 
                  disabled={!dailyNote.trim()}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Save Day {currentDay}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Progress Timeline
          </CardTitle>
          <p className="text-gray-600">Track your daily actions and see your consistent progress</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {mockDailyEntries.map((entry) => (
              <div key={entry.day} className="relative">
                {/* Day Indicator */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white ${
                    entry.day === currentDay ? 'bg-gray-900' : 'bg-gray-400'
                  }`}>
                    <div className="text-center">
                      <div className="text-xs">DAY</div>
                      <div className="text-lg leading-none">{entry.day}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </h3>
                      {entry.day === currentDay && (
                        <Badge className="bg-gray-100 text-gray-800">Today</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.activities.length} activities completed
                    </div>
                  </div>
                </div>

                {/* Activities */}
                <div className="ml-20 space-y-2">
                  {/* Separate auto-tracked and manual activities */}
                  {entry.activities.filter(a => a.type === 'auto').length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-blue-700 mb-1">
                        Unpuzzle tracked ({entry.activities.filter(a => a.type === 'auto').length})
                      </h5>
                      {entry.activities.filter(a => a.type === 'auto').map((activity) => (
                        <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <span className="text-sm">{getActivityIcon(activity.category)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-900 text-xs font-medium truncate">{activity.description}</p>
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                              <span>{new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}</span>
                              {activity.metadata && (
                                <>
                                  {activity.metadata.duration && <span>• {activity.metadata.duration}min</span>}
                                  {activity.metadata.quizScore && <span>• {activity.metadata.quizScore}%</span>}
                                  {activity.metadata.hintsUsed && <span>• {activity.metadata.hintsUsed} hints</span>}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Student's daily message */}
                  {entry.studentNote ? (
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Your daily update</h5>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-800 text-sm leading-relaxed">{entry.studentNote}</p>
                      </div>
                    </div>
                  ) : entry.day === currentDay ? (
                    <div className="mt-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-xs italic">Pending your progress update for today...</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Timeline connector */}
                {entry.day > 1 && (
                  <div className="absolute left-8 top-20 w-0.5 h-12 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}