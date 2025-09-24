'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Target, Clock, Zap, BookOpen, Lightbulb, Palette, Code } from 'lucide-react'
import { updateStudentPreferences, assignTrackToStudent, submitQuestionnaire } from '@/lib/actions/track-actions'
import { createTrackChangeRequestWithQuestionnaire, getUserCurrentTrack } from '@/lib/actions/request-actions'
import { toast } from 'sonner'

interface QuestionnaireData {
  // Agency track fields
  hasEarned1k?: string
  earningsAmount?: number
  servicesProvided?: string[]
  designSkillLevel?: number
  codingSkillLevel?: number
  portfolioUrl?: string
  noPortfolio?: boolean

  // SaaS track fields
  hasBuiltProduct?: string
  productRevenue?: number
  productType?: string[]
  technicalSkillLevel?: number
  businessSkillLevel?: number
  productIdea?: string
  productIdeaDescription?: string

  // Common fields
  trackChoiceReason?: string[]
  monthlyIncomeGoal: number
  timeCommitment: number
  approachPreference: 'direct' | 'patient'
}

const agencyQuestions = [
  {
    id: 'hasEarned1k',
    title: 'Have you earned $1k+ from providing design/dev services?',
    type: 'radio',
    options: ['Yes', 'No'],
    icon: Target,
    description: 'Have you reached your first $1k milestone from client work?'
  },
  {
    id: 'earningsAmount',
    title: 'How much have you earned from services?',
    type: 'number',
    icon: Target,
    description: 'Approximate total earnings from design/development services',
    showIf: (data: QuestionnaireData) => data.hasEarned1k === 'Yes'
  },
  {
    id: 'servicesProvided',
    title: 'What services have you provided? (Select all that apply)',
    type: 'checkbox',
    options: ['Web Design', 'Web Development', 'App Development', 'UI/UX Design', 'Consulting', 'Other'],
    icon: BookOpen,
    description: 'Services you\'ve offered to clients'
  },
  {
    id: 'designSkillLevel',
    title: 'Rate your design skills',
    type: 'slider',
    min: 0,
    max: 10,
    icon: Palette,
    description: 'From beginner (0) to expert (10)'
  },
  {
    id: 'codingSkillLevel',
    title: 'Rate your coding skills',
    type: 'slider',
    min: 0,
    max: 10,
    icon: Code,
    description: 'From beginner (0) to expert (10)'
  },
  {
    id: 'portfolioUrl',
    title: 'Portfolio URL (optional)',
    type: 'text',
    icon: BookOpen,
    description: 'Link to your portfolio or personal website',
    optional: true
  }
]

const saasQuestions = [
  {
    id: 'hasBuiltProduct',
    title: 'Have you built and launched a product?',
    type: 'radio',
    options: ['Yes', 'No'],
    icon: Target,
    description: 'Have you created any software product, app, or tool?'
  },
  {
    id: 'productRevenue',
    title: 'Monthly recurring revenue from your product',
    type: 'number',
    icon: Target,
    description: 'Current MRR from your SaaS product',
    showIf: (data: QuestionnaireData) => data.hasBuiltProduct === 'Yes'
  },
  {
    id: 'productType',
    title: 'What type of products have you built? (Select all that apply)',
    type: 'checkbox',
    options: ['Web App', 'Mobile App', 'Chrome Extension', 'API/Service', 'WordPress Plugin', 'Other'],
    icon: BookOpen,
    description: 'Types of products you\'ve created',
    showIf: (data: QuestionnaireData) => data.hasBuiltProduct === 'Yes'
  },
  {
    id: 'technicalSkillLevel',
    title: 'Rate your technical/coding skills',
    type: 'slider',
    min: 0,
    max: 10,
    icon: Code,
    description: 'From beginner (0) to expert (10)'
  },
  {
    id: 'businessSkillLevel',
    title: 'Rate your business/marketing skills',
    type: 'slider',
    min: 0,
    max: 10,
    icon: Lightbulb,
    description: 'From beginner (0) to expert (10)'
  },
  {
    id: 'productIdea',
    title: 'Do you have a specific product idea?',
    type: 'radio',
    options: ['Yes', 'No', 'Multiple ideas'],
    icon: Lightbulb,
    description: 'Do you know what you want to build?'
  },
  {
    id: 'productIdeaDescription',
    title: 'Describe your product idea(s)',
    type: 'textarea',
    icon: Lightbulb,
    description: 'Brief description of what you want to build',
    showIf: (data: QuestionnaireData) => data.productIdea === 'Yes' || data.productIdea === 'Multiple ideas',
    optional: true
  }
]

const commonQuestions = [
  {
    id: 'trackChoiceReason',
    title: 'Why did you choose this track? (Select all that apply)',
    type: 'checkbox',
    options: [
      'Aligns with my skills',
      'Better income potential',
      'More interested in this model',
      'Already have experience',
      'Want to learn something new',
      'Recommended by others'
    ],
    icon: Target,
    description: 'What motivated your track selection'
  },
  {
    id: 'monthlyIncomeGoal',
    title: 'Monthly income goal ($)',
    type: 'number',
    icon: Target,
    description: 'Your target monthly income in the next 6-12 months'
  },
  {
    id: 'timeCommitment',
    title: 'Hours per week you can dedicate',
    type: 'slider',
    min: 5,
    max: 60,
    icon: Clock,
    description: 'Weekly time commitment for learning and building'
  },
  {
    id: 'approachPreference',
    title: 'Learning approach preference',
    type: 'radio',
    options: [
      { value: 'direct', label: 'Direct - Show me exactly what to do' },
      { value: 'patient', label: 'Patient - Let me learn at my own pace' }
    ],
    icon: Zap,
    description: 'How do you prefer to learn?'
  }
]

function QuestionnaireContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTrack = searchParams.get('track')
  const isChangeRequest = searchParams.get('changeRequest') === 'true'
  const queryClient = useQueryClient()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [formData, setFormData] = useState<QuestionnaireData>({
    monthlyIncomeGoal: 5000,
    timeCommitment: 20,
    approachPreference: 'direct'
  })

  // Get current track if this is a change request
  const { data: currentTrackData } = useQuery({
    queryKey: ['currentTrack'],
    queryFn: getUserCurrentTrack,
    enabled: isChangeRequest
  })

  const questions = selectedTrack === 'agency'
    ? [...agencyQuestions, ...commonQuestions]
    : [...saasQuestions, ...commonQuestions]

  const visibleQuestions = questions.filter(q => {
    if (q.showIf) {
      return q.showIf(formData)
    }
    return true
  })

  const currentQuestion = visibleQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / visibleQuestions.length) * 100

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrack) throw new Error('No track selected')

      if (isChangeRequest) {
        // Create a change request with questionnaire
        await createTrackChangeRequestWithQuestionnaire(
          selectedTrack as 'agency' | 'saas',
          formData
        )
        toast.success('Track change request submitted for approval')
      } else {
        // Direct assignment for new users
        await submitQuestionnaire(selectedTrack as 'agency' | 'saas', formData)
        await assignTrackToStudent(selectedTrack as 'agency' | 'saas')
        await updateStudentPreferences({
          approach_preference: formData.approachPreference,
          time_commitment_hours: formData.timeCommitment,
          monthly_income_goal: formData.monthlyIncomeGoal
        })
        toast.success('Track assigned successfully!')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] })
      router.push('/student/dashboard')
    },
    onError: (error) => {
      console.error('Error submitting questionnaire:', error)
      toast.error('Failed to submit questionnaire')
    }
  })

  const handleNext = () => {
    if (currentQuestionIndex < visibleQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Submit the questionnaire
      submitMutation.mutate()
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleInputChange = (value: any, questionId: string) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const isCurrentQuestionAnswered = () => {
    const value = formData[currentQuestion.id as keyof QuestionnaireData]
    if (currentQuestion.optional) return true
    if (currentQuestion.type === 'checkbox') {
      return Array.isArray(value) && value.length > 0
    }
    return value !== undefined && value !== '' && value !== null
  }

  if (!selectedTrack) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg">No track selected. Please go back and select a track.</p>
            <Button onClick={() => router.push('/student/track-selection')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const QuestionIcon = currentQuestion?.icon || Target

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="min-h-[600px]">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="text-sm">
              {selectedTrack === 'agency' ? 'Agency Track' : 'SaaS Track'}
            </Badge>
            {isChangeRequest && (
              <Badge variant="outline" className="text-sm">
                Change Request
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl">Track Questionnaire</CardTitle>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentQuestionIndex + 1} of {visibleQuestions.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <QuestionIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{currentQuestion.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{currentQuestion.description}</p>
                </div>
              </div>

              <div className="mt-6">
                {currentQuestion.type === 'radio' && (
                  <RadioGroup
                    value={formData[currentQuestion.id as keyof QuestionnaireData] as string}
                    onValueChange={(value) => handleInputChange(value, currentQuestion.id)}
                  >
                    {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option) => (
                      <div key={typeof option === 'string' ? option : option.value} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent">
                        <RadioGroupItem value={typeof option === 'string' ? option : option.value} />
                        <Label className="cursor-pointer flex-1">
                          {typeof option === 'string' ? option : option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === 'checkbox' && (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option) => (
                      <div key={option} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent">
                        <Checkbox
                          checked={(formData[currentQuestion.id as keyof QuestionnaireData] as string[] || []).includes(option)}
                          onCheckedChange={(checked) => {
                            const currentValues = (formData[currentQuestion.id as keyof QuestionnaireData] as string[]) || []
                            const newValues = checked
                              ? [...currentValues, option]
                              : currentValues.filter(v => v !== option)
                            handleInputChange(newValues, currentQuestion.id)
                          }}
                        />
                        <Label className="cursor-pointer flex-1">{option}</Label>
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'slider' && (
                  <div className="space-y-4">
                    <Slider
                      value={[formData[currentQuestion.id as keyof QuestionnaireData] as number || currentQuestion.min || 0]}
                      onValueChange={(value) => handleInputChange(value[0], currentQuestion.id)}
                      min={currentQuestion.min}
                      max={currentQuestion.max}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{currentQuestion.min}</span>
                      <span className="font-medium text-foreground">
                        {formData[currentQuestion.id as keyof QuestionnaireData] || currentQuestion.min || 0}
                      </span>
                      <span>{currentQuestion.max}</span>
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'number' && (
                  <Input
                    type="number"
                    value={formData[currentQuestion.id as keyof QuestionnaireData] as number || ''}
                    onChange={(e) => handleInputChange(parseInt(e.target.value) || 0, currentQuestion.id)}
                    placeholder="Enter amount"
                    className="w-full"
                  />
                )}

                {currentQuestion.type === 'text' && (
                  <Input
                    type="text"
                    value={formData[currentQuestion.id as keyof QuestionnaireData] as string || ''}
                    onChange={(e) => handleInputChange(e.target.value, currentQuestion.id)}
                    placeholder="Enter URL"
                    className="w-full"
                  />
                )}

                {currentQuestion.type === 'textarea' && (
                  <Textarea
                    value={formData[currentQuestion.id as keyof QuestionnaireData] as string || ''}
                    onChange={(e) => handleInputChange(e.target.value, currentQuestion.id)}
                    placeholder="Enter your description..."
                    className="w-full min-h-[120px]"
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered() || submitMutation.isPending}
            >
              {currentQuestionIndex === visibleQuestions.length - 1 ? (
                <>Submit{submitMutation.isPending && '...'}</>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main component with Suspense boundary
export default function QuestionnairePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="min-h-[600px] flex items-center justify-center">
          <CardContent>
            <p className="text-muted-foreground">Loading questionnaire...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <QuestionnaireContent />
    </Suspense>
  )
}