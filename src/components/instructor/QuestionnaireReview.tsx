'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Clock,
  User,
  Target,
  Code,
  Palette,
  Globe
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignGoalToStudentConversation } from '@/lib/actions/track-actions'
import { toast } from 'sonner'

interface QuestionnaireData {
  hasEarned1k: string
  earningsAmount?: number
  servicesProvided?: string[]
  trackChoiceReason?: string[]
  designSkillLevel?: number
  codingSkillLevel?: number
  portfolioStatus?: string
  portfolioUrl?: string
  noPortfolio?: boolean
  monthlyIncomeGoal: number
  timeCommitment: number
  approachPreference: 'direct' | 'patient'
}

interface QuestionnaireReviewProps {
  conversationId: string
  studentId: string
  studentName: string
  trackType: 'agency' | 'saas'
  questionnaireData: QuestionnaireData
  submittedAt: string
  onGoalAssigned?: () => void
}

export function QuestionnaireReview({
  conversationId,
  studentId,
  studentName,
  trackType,
  questionnaireData,
  submittedAt,
  onGoalAssigned
}: QuestionnaireReviewProps) {
  const [selectedGoal, setSelectedGoal] = useState('')
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const getTrackGoals = (track: 'agency' | 'saas') => {
    if (track === 'agency') {
      return [
        { id: 'agency-1k', label: 'Earn $1k total from agency services', amount: 1000 },
        { id: 'agency-5k', label: 'Earn $5k total from agency services', amount: 5000 },
        { id: 'agency-10k', label: 'Earn $10k total from agency services', amount: 10000 },
        { id: 'agency-20k', label: 'Earn $20k total from agency services', amount: 20000 },
        { id: 'agency-50k', label: 'Earn $50k total from agency services', amount: 50000 },
        { id: 'agency-100k', label: 'Earn $100k total from agency services', amount: 100000 },
        { id: 'agency-250k', label: 'Earn $250k total from agency services', amount: 250000 },
        { id: 'agency-500k', label: 'Earn $500k total from agency services', amount: 500000 }
      ]
    } else {
      return [
        { id: 'saas-1k', label: 'Reach $1k Monthly Recurring Revenue', amount: 1000 },
        { id: 'saas-3k', label: 'Reach $3k Monthly Recurring Revenue', amount: 3000 },
        { id: 'saas-5k', label: 'Reach $5k Monthly Recurring Revenue', amount: 5000 },
        { id: 'saas-10k', label: 'Reach $10k Monthly Recurring Revenue', amount: 10000 },
        { id: 'saas-20k', label: 'Reach $20k Monthly Recurring Revenue', amount: 20000 }
      ]
    }
  }

  const getRecommendedGoal = () => {
    const goals = getTrackGoals(trackType)

    if (trackType === 'agency') {
      if (questionnaireData.hasEarned1k === 'false') {
        return goals[0] // Start with $1k
      } else if (questionnaireData.earningsAmount) {
        const earned = questionnaireData.earningsAmount
        if (earned < 5000) return goals[1] // $5k
        if (earned < 10000) return goals[2] // $10k
        if (earned < 20000) return goals[3] // $20k
        if (earned < 50000) return goals[4] // $50k
        return goals[5] // $100k+
      }
    } else {
      // SaaS track - start based on technical skills
      const techScore = (questionnaireData.designSkillLevel || 0) + (questionnaireData.codingSkillLevel || 0)
      if (techScore < 10) return goals[0] // $1k MRR
      if (techScore < 15) return goals[1] // $3k MRR
      return goals[2] // $5k MRR
    }

    return goals[0]
  }

  const recommendedGoal = getRecommendedGoal()

  // Auto-select recommended goal on mount
  React.useEffect(() => {
    if (!selectedGoal && recommendedGoal) {
      setSelectedGoal(recommendedGoal.id)
    }
  }, [selectedGoal, recommendedGoal])

  const assignGoalMutation = useMutation({
    mutationFn: async () => {
      const goalTitle = getTrackGoals(trackType).find(g => g.id === selectedGoal)?.label || 'Unknown Goal'

      return assignGoalToStudentConversation({
        conversationId,
        goalId: selectedGoal,
        goalTitle,
        notes
      })
    },
    onSuccess: () => {
      toast.success('Goal assigned successfully!')
      queryClient.invalidateQueries({ queryKey: ['conversation-data'] })
      onGoalAssigned?.()
    },
    onError: () => {
      toast.error('Failed to assign goal')
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const questionsAndAnswers = [
    {
      question: `Have you earned $1,000+ from ${trackType === 'agency' ? 'agency services' : 'SaaS products'} before?`,
      answer: questionnaireData.hasEarned1k === 'true' ? 'Yes' : 'No'
    },
    ...(questionnaireData.earningsAmount ? [{
      question: 'How much have you earned in total?',
      answer: formatCurrency(questionnaireData.earningsAmount)
    }] : []),
    ...(questionnaireData.servicesProvided && questionnaireData.servicesProvided.length > 0 ? [{
      question: 'What services have you provided?',
      answer: questionnaireData.servicesProvided.map(service => service.replace('_', ' ')).join(', ')
    }] : []),
    ...(questionnaireData.trackChoiceReason && questionnaireData.trackChoiceReason.length > 0 ? [{
      question: 'Why did you choose this track?',
      answer: questionnaireData.trackChoiceReason.map(reason => reason.replace('_', ' ')).join(', ')
    }] : []),
    {
      question: 'Design skill level (1-10)',
      answer: `${questionnaireData.designSkillLevel || 'Not specified'}/10`
    },
    {
      question: 'Coding skill level (1-10)',
      answer: `${questionnaireData.codingSkillLevel || 'Not specified'}/10`
    },
    {
      question: 'Portfolio',
      answer: questionnaireData.portfolioUrl ?
        `Portfolio available: ${questionnaireData.portfolioUrl}` :
        questionnaireData.noPortfolio ? 'No portfolio yet' : 'Not specified'
    },
    {
      question: 'Monthly income goal',
      answer: `${formatCurrency(questionnaireData.monthlyIncomeGoal)}${trackType === 'saas' ? '/month' : ' total'}`
    },
    {
      question: 'Time commitment per week',
      answer: `${questionnaireData.timeCommitment} hours/week`
    },
    {
      question: 'Learning approach preference',
      answer: questionnaireData.approachPreference === 'direct' ? 'Direct & No BS' : 'Soft & Patient'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Questionnaire Review
              </h3>
              <p className="text-orange-700 dark:text-orange-200 text-sm">
                {studentName} completed their {trackType === 'agency' ? 'Agency' : 'SaaS'} track questionnaire {timeAgo(submittedAt)}.
                Review their responses and assign an appropriate starting goal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: 70% Questions/Answers, 30% Goal Assignment */}
      <div className="grid grid-cols-10 gap-8">
        {/* Left Column - Questions & Answers (70%) */}
        <div className="col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Questionnaire Responses</CardTitle>
              <CardDescription>{trackType === 'agency' ? 'Agency' : 'SaaS'} Track Assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {questionsAndAnswers.map((qa, index) => (
                  <div key={index} className="space-y-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                      {index + 1}. {qa.question}
                    </div>
                    <div className="pl-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {qa.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Goal Assignment (30%) */}
        <div className="col-span-3 space-y-4">
          {/* Recommended Goal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommended Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  {recommendedGoal.label}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Based on {trackType === 'agency' ? 'earnings history' : 'technical skills'} and goals
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assign Goal</CardTitle>
              <CardDescription>
                Select starting goal for {studentName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Starting Goal</label>
                <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTrackGoals(trackType).map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  placeholder="Add notes about this assignment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={() => assignGoalMutation.mutate()}
                disabled={!selectedGoal || assignGoalMutation.isPending}
                className="w-full"
              >
                {assignGoalMutation.isPending ? 'Assigning...' : 'Assign Goal & Start'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}