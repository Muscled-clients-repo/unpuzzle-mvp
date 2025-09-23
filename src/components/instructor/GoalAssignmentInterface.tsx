'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Target,
  CheckCircle,
  User,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface GoalAssignmentInterfaceProps {
  student: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  questionnaire: {
    hasEarned1k: string
    earningsAmount?: number
    timeCommitment?: number
    monthlyIncomeGoal?: number
    designSkillLevel?: number
    codingSkillLevel?: number
    businessSkillLevel?: number
    marketingSkillLevel?: number
    completedAt: string
  }
  trackType: 'agency' | 'saas'
  onAssignGoal: (goalId: string, notes?: string) => void
  onCancel?: () => void
  isAssigning?: boolean
}

interface Goal {
  id: string
  title: string
  description: string
  targetAmount: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: string
  prerequisites?: string[]
}

// Following architecture patterns - predefined goals data
const AGENCY_GOALS: Goal[] = [
  {
    id: 'agency-1k',
    title: 'First $1k Revenue',
    description: 'Land your first paying clients and earn $1,000 total from agency services',
    targetAmount: 1000,
    difficulty: 'beginner',
    estimatedDuration: '2-4 months',
    prerequisites: []
  },
  {
    id: 'agency-5k',
    title: '$5k Revenue Milestone',
    description: 'Scale your agency services to reach $5,000 in total revenue',
    targetAmount: 5000,
    difficulty: 'beginner',
    estimatedDuration: '4-8 months',
    prerequisites: ['Some client experience helpful']
  },
  {
    id: 'agency-10k',
    title: '$10k Revenue Growth',
    description: 'Grow your agency to $10,000 in total revenue with multiple clients',
    targetAmount: 10000,
    difficulty: 'intermediate',
    estimatedDuration: '6-12 months',
    prerequisites: ['Previous client work experience']
  },
  {
    id: 'agency-20k',
    title: '$20k Revenue Scale',
    description: 'Scale your agency operations to achieve $20,000 in total revenue',
    targetAmount: 20000,
    difficulty: 'intermediate',
    estimatedDuration: '8-15 months',
    prerequisites: ['Established client base']
  },
  {
    id: 'agency-50k',
    title: '$50k Revenue Expansion',
    description: 'Expand your agency to reach $50,000 in total revenue',
    targetAmount: 50000,
    difficulty: 'advanced',
    estimatedDuration: '12-24 months',
    prerequisites: ['Strong portfolio', 'Team management skills']
  }
]

const SAAS_GOALS: Goal[] = [
  {
    id: 'saas-1k',
    title: 'First $1k MRR',
    description: 'Launch your SaaS and reach $1,000 Monthly Recurring Revenue',
    targetAmount: 1000,
    difficulty: 'beginner',
    estimatedDuration: '3-8 months',
    prerequisites: []
  },
  {
    id: 'saas-3k',
    title: '$3k MRR Growth',
    description: 'Scale your SaaS product to $3,000 Monthly Recurring Revenue',
    targetAmount: 3000,
    difficulty: 'intermediate',
    estimatedDuration: '6-12 months',
    prerequisites: ['Working SaaS product']
  },
  {
    id: 'saas-5k',
    title: '$5k MRR Milestone',
    description: 'Grow your SaaS to $5,000 Monthly Recurring Revenue',
    targetAmount: 5000,
    difficulty: 'intermediate',
    estimatedDuration: '8-15 months',
    prerequisites: ['Product-market fit indicators']
  },
  {
    id: 'saas-10k',
    title: '$10k MRR Scale',
    description: 'Scale your SaaS operations to $10,000 Monthly Recurring Revenue',
    targetAmount: 10000,
    difficulty: 'advanced',
    estimatedDuration: '12-24 months',
    prerequisites: ['Proven revenue model', 'Marketing automation']
  },
  {
    id: 'saas-20k',
    title: '$20k MRR Expansion',
    description: 'Expand your SaaS to reach $20,000 Monthly Recurring Revenue',
    targetAmount: 20000,
    difficulty: 'advanced',
    estimatedDuration: '18-36 months',
    prerequisites: ['Team scaling', 'Advanced marketing']
  }
]

export function GoalAssignmentInterface({
  student,
  questionnaire,
  trackType,
  onAssignGoal,
  onCancel,
  isAssigning = false
}: GoalAssignmentInterfaceProps) {
  // Zustand: UI state ownership following architecture patterns
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [assignmentNotes, setAssignmentNotes] = useState('')

  const goals = trackType === 'agency' ? AGENCY_GOALS : SAAS_GOALS
  const selectedGoal = goals.find(g => g.id === selectedGoalId)

  // Business logic: Suggest goal based on questionnaire responses
  const suggestedGoal = getSuggestedGoal(questionnaire, trackType)

  const handleAssignment = () => {
    if (!selectedGoalId) return
    onAssignGoal(selectedGoalId, assignmentNotes.trim() || undefined)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getDifficultyBadge = (difficulty: Goal['difficulty']) => {
    const variants = {
      beginner: 'bg-green-100 text-green-800 hover:bg-green-100',
      intermediate: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      advanced: 'bg-red-100 text-red-800 hover:bg-red-100'
    }
    return <Badge className={variants[difficulty]}>{difficulty}</Badge>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Student Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{student.name}</h3>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
            <Badge variant="outline" className="ml-auto capitalize">
              {trackType} Track
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {questionnaire.hasEarned1k === 'true' ?
                  formatCurrency(questionnaire.earningsAmount || 0) :
                  '$0'
                }
              </div>
              <div className="text-xs text-muted-foreground">Current Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{questionnaire.timeCommitment || 0}h</div>
              <div className="text-xs text-muted-foreground">Hours/Week</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {formatCurrency(questionnaire.monthlyIncomeGoal || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Income Goal</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {Math.round(((questionnaire.designSkillLevel || 0) +
                            (questionnaire.codingSkillLevel || 0) +
                            (questionnaire.businessSkillLevel || 0) +
                            (questionnaire.marketingSkillLevel || 0)) / 4)}/10
              </div>
              <div className="text-xs text-muted-foreground">Avg Skill Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Goal */}
      {suggestedGoal && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Target className="h-5 w-5" />
              Recommended Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  {suggestedGoal.title}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  {suggestedGoal.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-blue-600 dark:text-blue-300">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(suggestedGoal.targetAmount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {suggestedGoal.estimatedDuration}
                  </span>
                  {getDifficultyBadge(suggestedGoal.difficulty)}
                </div>
              </div>
            </div>
            <Button
              onClick={() => setSelectedGoalId(suggestedGoal.id)}
              variant={selectedGoalId === suggestedGoal.id ? 'default' : 'outline'}
              className="w-full"
            >
              {selectedGoalId === suggestedGoal.id ? 'Selected' : 'Select Recommended Goal'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Goal Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="goal-select">Select Goal</Label>
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a goal for this student" />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title} - {formatCurrency(goal.targetAmount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Goal Details */}
          {selectedGoal && (
            <Card className="border-muted">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{selectedGoal.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedGoal.description}
                      </p>
                    </div>
                    {getDifficultyBadge(selectedGoal.difficulty)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Target: {formatCurrency(selectedGoal.targetAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Duration: {selectedGoal.estimatedDuration}</span>
                    </div>
                  </div>

                  {selectedGoal.prerequisites && selectedGoal.prerequisites.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Prerequisites</Label>
                      <ul className="text-sm space-y-1">
                        {selectedGoal.prerequisites.map((prereq, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                            {prereq}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific guidance or notes for this student..."
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAssignment}
              disabled={!selectedGoalId || isAssigning}
              className="flex-1"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Assigning Goal...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assign Goal
                </>
              )}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Business logic helper - follows architecture patterns
function getSuggestedGoal(questionnaire: any, trackType: 'agency' | 'saas'): Goal {
  const goals = trackType === 'agency' ? AGENCY_GOALS : SAAS_GOALS
  const hasExperience = questionnaire.hasEarned1k === 'true'
  const earningsAmount = questionnaire.earningsAmount || 0

  if (trackType === 'agency') {
    if (!hasExperience || earningsAmount < 1000) {
      return goals.find(g => g.id === 'agency-1k')!
    } else if (earningsAmount < 5000) {
      return goals.find(g => g.id === 'agency-5k')!
    } else if (earningsAmount < 10000) {
      return goals.find(g => g.id === 'agency-10k')!
    } else {
      return goals.find(g => g.id === 'agency-20k')!
    }
  } else {
    // SaaS track - typically start with first goal unless significant experience
    if (earningsAmount > 5000 && questionnaire.codingSkillLevel > 6) {
      return goals.find(g => g.id === 'saas-3k')!
    } else {
      return goals.find(g => g.id === 'saas-1k')!
    }
  }
}