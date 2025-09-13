'use client'

import React from 'react'
import { Target, Trophy, BookOpen, TrendingUp, Clock, CheckCircle, Lock, Star, BarChart3 } from 'lucide-react'

interface Goal {
  id: string
  title: string
  track: 'agency' | 'saas'
  startAmount: string
  targetAmount: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  startDate: string
  completedDate?: string
  milestones: Milestone[]
  metrics?: GoalMetrics
  actions?: Action[]
}

interface GoalMetrics {
  learnRate: number // minutes of video content consumed per hour of session time
  executionRate: number // percentage of milestones hit on time
  executionPace: 'fast' | 'steady' | 'slow'
  ranking: number // ranking by speed (days to complete)
  daysToComplete?: number
}

interface Action {
  id: string
  type: 'course' | 'lesson' | 'quiz' | 'reflection' | 'milestone' | 'content' | 'call'
  title: string
  date: string
  details?: string
}

interface Milestone {
  id: string
  title: string
  targetAmount: string
  completed: boolean
  completedDate?: string
}

interface Course {
  id: string
  title: string
  completed: boolean
  completedDate?: string
  progress: number
}

interface ExecutionMetrics {
  learningRate: number // courses completed per month
  executionRate: number // milestones hit on time percentage
  executionPace: 'fast' | 'steady' | 'slow'
  consistency: number // percentage of weeks with activity
}

interface CommunityGoalsSectionProps {
  userRole: 'guest' | 'member' | 'instructor'
  isOwnProfile?: boolean
  memberName?: string
}

export function CommunityGoalsSection({ userRole, isOwnProfile = false, memberName }: CommunityGoalsSectionProps) {
  const [expandedGoal, setExpandedGoal] = React.useState<string | null>(null)

  // Mock data - replace with real data
  const mockGoals: Goal[] = [
    {
      id: '1',
      title: 'Goal: $5K Shopify Agency',
      track: 'agency',
      startAmount: '$3K',
      targetAmount: '$5K',
      status: 'active',
      progress: 75,
      startDate: '2024-07-01',
      milestones: [
        { id: '1', title: 'Optimize Operations', targetAmount: '$4K', completed: true, completedDate: '2024-08-15' },
        { id: '2', title: 'Hit $5K Monthly', targetAmount: '$5K', completed: false }
      ],
      actions: [
        { id: '1', type: 'course', title: 'Advanced Shopify Development', date: '2024-07-05', details: 'Completed 8/10 modules' },
        { id: '2', type: 'milestone', title: 'Hired first developer', date: '2024-07-15', details: 'Found via Upwork, $15/hr' },
        { id: '3', type: 'reflection', title: 'Weekly reflection #8', date: '2024-08-20', details: 'Focused on scaling challenges' },
        { id: '4', type: 'call', title: 'Client discovery call', date: '2024-08-22', details: '$2K project potential' },
        { id: '5', type: 'quiz', title: 'Quiz at 15:30 - Scaling Strategies', date: '2024-08-25', details: 'Advanced Shopify Development course' }
      ]
    },
    {
      id: '2',
      title: 'Goal: $3K Shopify Agency',
      track: 'agency',
      startAmount: '$2K',
      targetAmount: '$3K',
      status: 'completed',
      progress: 100,
      startDate: '2024-04-01',
      completedDate: '2024-06-30',
      milestones: [
        { id: '1', title: 'Streamline Process', targetAmount: '$2.5K', completed: true, completedDate: '2024-05-15' },
        { id: '2', title: 'Hit $3K Monthly', targetAmount: '$3K', completed: true, completedDate: '2024-06-30' }
      ],
      metrics: {
        learnRate: 42,
        executionRate: 94,
        executionPace: 'fast',
        ranking: 3,
        daysToComplete: 90
      },
      actions: [
        { id: '1', type: 'course', title: 'Client Acquisition Mastery', date: '2024-04-05', details: 'Completed all modules' },
        { id: '2', type: 'milestone', title: 'Created Shopify portfolio', date: '2024-04-12', details: '5 example stores built' },
        { id: '3', type: 'milestone', title: 'Hired UX/UI designer', date: '2024-04-20', details: 'Full-time contractor at $1/hr' },
        { id: '4', type: 'call', title: 'First sales call', date: '2024-04-25', details: 'Potential $1.5K project' },
        { id: '5', type: 'milestone', title: 'Closed first deal', date: '2024-05-02', details: '$1.8K Shopify store redesign' },
        { id: '6', type: 'reflection', title: 'Monthly reflection - Apr', date: '2024-05-01', details: 'Process optimization insights' },
        { id: '7', type: 'content', title: 'Created sales funnel template', date: '2024-05-10', details: 'Reusable for client onboarding' },
        { id: '8', type: 'quiz', title: 'Quiz at 8:45 - Advanced Funnels', date: '2024-05-12', details: 'Client Acquisition Mastery course' }
      ]
    },
    {
      id: '3',
      title: 'Goal: $2K Shopify Agency',
      track: 'agency',
      startAmount: '$1K',
      targetAmount: '$2K',
      status: 'completed',
      progress: 100,
      startDate: '2024-01-15',
      completedDate: '2024-03-30',
      milestones: [
        { id: '1', title: 'Get Second Client', targetAmount: '$1.5K', completed: true, completedDate: '2024-02-20' },
        { id: '2', title: 'Hit $2K Monthly', targetAmount: '$2K', completed: true, completedDate: '2024-03-30' }
      ]
    },
    {
      id: '4',
      title: 'Goal: $1K Shopify Agency',
      track: 'agency',
      startAmount: '$0',
      targetAmount: '$1K',
      status: 'completed',
      progress: 100,
      startDate: '2023-10-01',
      completedDate: '2024-01-10',
      milestones: [
        { id: '1', title: 'First Client', targetAmount: '$500', completed: true, completedDate: '2023-11-15' },
        { id: '2', title: 'Consistent $1K', targetAmount: '$1K', completed: true, completedDate: '2024-01-10' }
      ]
    }
  ]

  const mockCourses: Course[] = [
    { id: '1', title: 'Claude Code Fundamentals', completed: true, completedDate: '2024-01-20', progress: 100 },
    { id: '2', title: 'Client Acquisition Mastery', completed: true, completedDate: '2024-02-15', progress: 100 },
    { id: '3', title: 'Agency Scaling Systems', completed: false, progress: 75 },
    { id: '4', title: 'Team Building & Management', completed: false, progress: 30 }
  ]

  const mockMetrics: ExecutionMetrics = {
    learningRate: 1.5,
    executionRate: 87,
    executionPace: 'fast',
    consistency: 92
  }

  const currentGoal = mockGoals.find(g => g.status === 'active')
  const completedGoals = mockGoals.filter(g => g.status === 'completed')
  const allMilestones = mockGoals.flatMap(g => g.milestones.filter(m => m.completed))
  const completedCourses = mockCourses.filter(c => c.completed)

  const getDisplayName = () => {
    if (isOwnProfile) return 'Your'
    if (memberName) return `${memberName}'s`
    return 'Member'
  }

  const isRestricted = userRole === 'guest'

  // Sort all goals reverse chronologically (most recent first)
  const allGoalsChronological = [...completedGoals, ...(currentGoal ? [currentGoal] : [])].sort((a, b) => {
    const aDate = a.completedDate || a.startDate
    const bDate = b.completedDate || b.startDate
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getDisplayName()} Goal Journey
        </h2>
        <p className="text-gray-600">
          {isRestricted 
            ? 'See how our members progress toward their goals'
            : 'Complete timeline of goals and milestones achieved'
          }
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Learn Rate</div>
          <div className="text-xl font-medium text-gray-900">
            {isRestricted ? '42' : '38'} mins/hr
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Actions</div>
          <div className="text-xl font-medium text-gray-900">
            {isRestricted ? '94' : allGoalsChronological.reduce((total, goal) => total + (goal.actions?.length || 0), 0)}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Last Goal</div>
          <div className="text-sm font-medium text-gray-900">
            {isRestricted ? '$3K Shopify Agency' : (completedGoals.length > 0 ? completedGoals[0].targetAmount + ' Shopify Agency' : 'None')}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Goal Timeline */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="font-semibold text-gray-900">Goal Timeline</h3>
            <span className="text-sm text-gray-500">
              {allGoalsChronological.length} goal{allGoalsChronological.length !== 1 ? 's' : ''} in journey
            </span>
            {isRestricted && (
              <div className="ml-auto">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>

          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {allGoalsChronological.map((goal, goalIndex) => (
                <div key={`goal-timeline-${goal.id}`} className="relative">
                  {/* Goal Node */}
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 text-right w-16">
                      <div className="text-xs text-gray-500 font-medium">
                        {new Date(goal.startDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: '2-digit' 
                        })}
                      </div>
                      {goal.status === 'completed' && goal.completedDate && (
                        <div className="text-xs text-gray-400 mt-1">
                          to {new Date(goal.completedDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 relative">
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        goal.status === 'completed' ? 'bg-gray-900' :
                        goal.status === 'active' ? 'bg-gray-700' : 'bg-gray-400'
                      }`}>
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                    
                    <div className="flex-1 pb-6">
                      {/* Goal Header */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            {isRestricted ? `Goal: ${goal.targetAmount} Shopify Agency` : goal.title}
                          </h4>
                          {goal.status === 'active' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              Active
                            </span>
                          )}
                          {goal.status === 'completed' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                          <div>
                            <span>Target: </span>
                            <span className="font-medium text-gray-900">
                              {isRestricted ? '$5K' : `${goal.startAmount} → ${goal.targetAmount}`}
                            </span>
                          </div>
                          {goal.status === 'active' && (
                            <div>
                              <span>Progress: </span>
                              <span className="font-medium text-gray-900">
                                {isRestricted ? '75%' : `${goal.progress}%`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Goal Metrics (for completed goals) - integrated in main box */}
                        {goal.status === 'completed' && goal.metrics && !isRestricted && (
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <span>Learn Rate:</span>
                              <span className="font-medium text-gray-900">{goal.metrics.learnRate} mins/hr</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Execution:</span>
                              <span className="font-medium text-gray-900">{goal.metrics.executionRate}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Pace:</span>
                              <span className="font-medium text-gray-900 capitalize">{goal.metrics.executionPace}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Ranking:</span>
                              <span className="font-medium text-gray-900">#{goal.metrics.ranking} ({goal.metrics.daysToComplete}d)</span>
                            </div>
                          </div>
                        )}

                        {goal.status === 'active' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-gray-900 h-1.5 rounded-full transition-all"
                              style={{ width: isRestricted ? '75%' : `${goal.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {goal.actions && !isRestricted && (
                        <div className="mt-3 ml-2">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-sm font-medium text-gray-900">Actions</h6>
                            {goal.actions.length > 3 && (
                              <button 
                                onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {expandedGoal === goal.id ? 'View less' : `View more (${goal.actions.length})`}
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(expandedGoal === goal.id ? goal.actions : goal.actions.slice(0, 3)).map((action) => (
                              <div key={`action-${goal.id}-${action.id}`} className="flex items-start gap-3 py-2 px-3 bg-white border border-gray-100 rounded text-sm">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  action.type === 'course' ? 'bg-blue-500' :
                                  action.type === 'milestone' ? 'bg-green-500' :
                                  action.type === 'quiz' ? 'bg-purple-500' :
                                  action.type === 'reflection' ? 'bg-orange-500' :
                                  action.type === 'call' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-gray-900 font-medium">{action.title}</div>
                                  <div className="text-gray-500 text-xs mt-0.5">
                                    {new Date(action.date).toLocaleDateString()} • {action.details}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guest view - show milestones */}
                      {isRestricted && (
                        <div className="mt-3 ml-2">
                          <div className="space-y-2">
                            {goal.milestones.map((milestone, milestoneIndex) => (
                              <div key={`milestone-${goal.id}-${milestone.id}`} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  milestone.completed ? 'bg-gray-900' : 'bg-gray-300'
                                }`} />
                                <div className="flex-1">
                                  <div className={`text-sm ${
                                    milestone.completed ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    Milestone {milestoneIndex + 1}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* People in Same Goal Category */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="font-semibold text-gray-900">Similar Goals</h3>
            <span className="text-sm text-gray-500">
              {isRestricted ? '12' : '8'} members
            </span>
          </div>

          <div className="space-y-4">
            {/* Current Goal Members */}
            {currentGoal && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Working on {isRestricted ? '$5K Shopify Agency' : currentGoal.targetAmount + ' Shopify Agency'}
                </h4>
                <div className="space-y-3">
                  {[
                    { name: isRestricted ? 'Member A' : 'Sarah M.', progress: 82, days: 45 },
                    { name: isRestricted ? 'Member B' : 'Alex R.', progress: 65, days: 60 },
                    { name: isRestricted ? 'Member C' : 'Lisa K.', progress: 58, days: 72 }
                  ].map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.progress}% • {member.days} days</div>
                        </div>
                      </div>
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-gray-900 h-1.5 rounded-full"
                          style={{ width: `${member.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Completed */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recently Completed Goals</h4>
              <div className="space-y-2">
                {[
                  { name: isRestricted ? 'Member D' : 'Mike T.', goal: '$3K', days: 85, rank: 2 },
                  { name: isRestricted ? 'Member E' : 'Jenny L.', goal: '$2K', days: 120, rank: 7 },
                  { name: isRestricted ? 'Member F' : 'Tom W.', goal: '$3K', days: 95, rank: 4 }
                ].map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.goal} goal • #{member.rank} ranking</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{member.days}d</div>
                  </div>
                ))}
              </div>
            </div>

            {/* View All Link */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View all members →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
          <Lock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Unlock Your Goal Journey</h3>
          <p className="text-gray-600 mb-4">
            Start tracking your own goals and milestones with detailed progress insights.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Join Community - $97/month
          </button>
        </div>
      )}
    </div>
  )
}