'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { toast } from 'sonner'

interface QuestionnaireData {
  hasEarned1k: string
  earningsAmount?: number
  servicesProvided?: string[]
  trackChoiceReason?: string
  designSkillLevel?: number
  codingSkillLevel?: number
  portfolioUrl?: string
  noPortfolio?: boolean
  monthlyIncomeGoal: number
  timeCommitment: number
  approachPreference: 'direct' | 'patient'
}

const questions = [
  {
    id: 'hasEarned1k',
    title: 'Have you earned $1k+ from providing design/dev services?',
    type: 'radio',
    options: [
      { value: 'true', label: 'Yes', description: 'I have earned at least $1k from these services' },
      { value: 'false', label: 'No', description: 'I have not reached $1k in earnings yet' }
    ]
  },
  {
    id: 'earningsAmount',
    title: 'What\'s the most you\'ve made in total revenue from providing design/dev services?',
    type: 'input',
    inputType: 'number',
    placeholder: 'Enter amount in USD',
    condition: (responses: any) => responses.hasEarned1k === 'true'
  },
  {
    id: 'servicesProvided',
    title: 'What services did you provide to make this amount?',
    subtitle: 'Select all that apply',
    type: 'checkbox',
    condition: (responses: any) => responses.hasEarned1k === 'true',
    options: [
      { value: 'ui_design', label: 'UI Design', description: 'User interface design' },
      { value: 'graphic_design', label: 'Graphic Design', description: 'Visual design and branding' },
      { value: 'website_development', label: 'Website Development', description: 'Building websites' },
      { value: 'app_development', label: 'App Development', description: 'Mobile or desktop applications' },
      { value: 'web_app', label: 'Web App', description: 'Web-based applications' },
      { value: 'paid_ads', label: 'Paid Ads', description: 'Advertising campaigns' },
      { value: 'email_marketing', label: 'Email Marketing', description: 'Email campaigns and automation' },
      { value: 'seo_services', label: 'SEO Services', description: 'Search engine optimization' }
    ]
  },
  {
    id: 'trackChoiceReason',
    title: 'Why did you choose this track?',
    subtitle: 'Select up to 3 reasons',
    type: 'checkbox',
    maxSelections: 3,
    options: [
      { value: 'career_change', label: 'Career Change', description: 'Want to transition to tech industry' },
      { value: 'skill_upgrade', label: 'Skill Upgrade', description: 'Enhance my current abilities' },
      { value: 'freelance_income', label: 'Freelance Income', description: 'Start earning from freelance work' },
      { value: 'passion_interest', label: 'Passion/Interest', description: 'Genuinely interested in this field' },
      { value: 'market_demand', label: 'Market Demand', description: 'High demand and good pay in this area' },
      { value: 'other', label: 'Other', description: 'Something else' }
    ]
  },
  {
    id: 'designSkillLevel',
    title: 'What do you rate your design skills on a scale of 1-10?',
    subtitle: 'Be honest about your current abilities',
    type: 'slider',
    min: 1,
    max: 10,
    default: 5
  },
  {
    id: 'codingSkillLevel',
    title: 'And your coding skills on a scale of 1-10?',
    subtitle: 'Be honest about your current abilities',
    type: 'slider',
    min: 1,
    max: 10,
    default: 5
  },
  {
    id: 'portfolioUrl',
    title: 'Submit one URL with your portfolio pieces',
    subtitle: 'Google Doc with multiple pieces or Figma link - make sure it\'s publicly accessible',
    type: 'input',
    inputType: 'url',
    placeholder: 'https://your-portfolio-link.com',
    hasNoPortfolioOption: true
  },
  {
    id: 'monthlyIncomeGoal',
    title: 'How much do you want to make per month?',
    subtitle: 'I\'ve achieved $40k-$50k months multiple times and averaged $19k/mo between 2023-2025, with 80% profit margins',
    type: 'slider',
    min: 1000,
    max: 50000,
    default: 10000,
    step: 500,
    formatValue: (value: number) => `$${value.toLocaleString()}`
  },
  {
    id: 'timeCommitment',
    title: 'How many hours per week can you dedicate to learning?',
    subtitle: 'This helps us pace your learning journey',
    type: 'slider',
    min: 1,
    max: 72,
    default: 10
  },
  {
    id: 'approachPreference',
    title: 'Do you want to be directed in a very direct and no BS manner or soft and slow/patient approach?',
    subtitle: 'Choose your preferred learning style',
    type: 'radio',
    options: [
      { value: 'direct', label: 'Direct & No BS', description: 'Straight to the point, efficient, results-focused' },
      { value: 'patient', label: 'Soft & Patient', description: 'Gentle guidance, supportive, step-by-step' }
    ]
  }
]

export default function QuestionnairePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Partial<QuestionnaireData>>({})

  // Get track type from URL params (default to 'agency' for backward compatibility)
  const trackType = (searchParams.get('track') as 'agency' | 'saas') || 'agency'

  const submitQuestionnaireMutation = useMutation({
    mutationFn: ({ responses, trackType }: { responses: any, trackType: 'agency' | 'saas' }) =>
      submitQuestionnaire(responses, trackType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['goal-conversations'] })
    }
  })

  const assignTrackMutation = useMutation({
    mutationFn: assignTrackToStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-track-assignments'] })
    }
  })

  const currentQuestion = questions[currentStep]
  const progress = ((currentStep + 1) / questions.length) * 100

  // Check if current question should be shown based on condition
  const shouldShowQuestion = (question: any) => {
    if (!question.condition) return true
    return question.condition(responses)
  }

  // Find next question that should be shown
  const findNextQuestion = (startIndex: number) => {
    for (let i = startIndex; i < questions.length; i++) {
      if (shouldShowQuestion(questions[i])) {
        return i
      }
    }
    return questions.length
  }

  // Find previous question that should be shown
  const findPrevQuestion = (startIndex: number) => {
    for (let i = startIndex; i >= 0; i--) {
      if (shouldShowQuestion(questions[i])) {
        return i
      }
    }
    return 0
  }

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    const currentQuestion = questions[currentStep]

    // For slider questions, ensure default value is set if user hasn't interacted
    if (currentQuestion.type === 'slider') {
      const currentResponse = responses[currentQuestion.id as keyof QuestionnaireData]
      if (currentResponse === undefined && currentQuestion.default !== undefined) {
        setResponses(prev => ({
          ...prev,
          [currentQuestion.id]: currentQuestion.default
        }))
      }
    }

    const nextIndex = findNextQuestion(currentStep + 1)

    // Check if we're skipping questions and show notification
    if (nextIndex > currentStep + 1) {
      const skippedCount = nextIndex - currentStep - 1
      if (skippedCount === 2 && responses.hasEarned1k === 'false') {
        toast.info('Skipping earnings questions since you selected "No"', {
          position: 'bottom-center'
        })
      }
    }

    if (nextIndex < questions.length) {
      setCurrentStep(nextIndex)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    const prevIndex = findPrevQuestion(currentStep - 1)
    setCurrentStep(prevIndex)
  }

  const canProceed = () => {
    const question = questions[currentStep]
    const response = responses[question.id as keyof QuestionnaireData]

    if (question.type === 'checkbox') {
      return Array.isArray(response) && response.length > 0
    }

    if (question.type === 'slider') {
      // For sliders, if no response is set but there's a default, use the default
      return response !== undefined && response !== null || (question.default !== undefined)
    }

    // Special handling for portfolio URL - allow progression if either URL provided or "no portfolio" checked
    if (question.id === 'portfolioUrl') {
      return (response !== undefined && response !== null && response !== '') || responses.noPortfolio
    }

    return response !== undefined && response !== null && response !== ''
  }

  const handleSubmit = async () => {
    try {
      // Submit questionnaire and create conversation for instructor review
      await submitQuestionnaireMutation.mutateAsync({
        responses,
        trackType
      })

      toast.success('Questionnaire submitted! Awaiting instructor review for goal assignment.')

      // Redirect to goals page where they'll see pending status
      setTimeout(() => {
        router.push('/student/goals')
      }, 2000)

    } catch (error) {
      toast.error('Failed to submit questionnaire')
      console.error(error)
    }
  }

  // Skip questions that shouldn't be shown
  if (!shouldShowQuestion(currentQuestion)) {
    const nextIndex = findNextQuestion(currentStep + 1)
    if (nextIndex < questions.length) {
      setCurrentStep(nextIndex)
    }
    return null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {trackType === 'agency' ? 'Agency Path' : 'SaaS Path'} Questionnaire
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us assign you the right goal based on your experience
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Step {currentStep + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.title}
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            {currentQuestion.subtitle}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <QuestionInput
            question={currentQuestion}
            value={responses[currentQuestion.id as keyof QuestionnaireData]}
            onChange={(value) => handleResponse(currentQuestion.id, value)}
            responses={responses}
            onResponseChange={handleResponse}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed() || submitQuestionnaireMutation.isPending}
        >
          {currentStep === questions.length - 1 ? (
            submitQuestionnaireMutation.isPending ? 'Submitting...' : 'Submit for Review'
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface QuestionInputProps {
  question: any
  value: any
  onChange: (value: any) => void
  responses: any
  onResponseChange: (questionId: string, value: any) => void
}

function QuestionInput({ question, value, onChange, responses, onResponseChange }: QuestionInputProps) {
  switch (question.type) {
    case 'radio':
      return (
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="space-y-3">
            {question.options.map((option: any) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>
      )

    case 'checkbox':
      return (
        <div className="space-y-3">
          {question.options.map((option: any) => (
            <div key={option.value} className="space-y-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={option.value}
                  checked={(value || []).includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || []
                    if (checked) {
                      // Check max selections limit
                      if (question.maxSelections && currentValues.length >= question.maxSelections) {
                        return
                      }
                      onChange([...currentValues, option.value])
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option.value))
                      // Clear the other text if unchecking "other"
                      if (option.value === 'other') {
                        const otherFieldName = `${question.id}Other`
                        onResponseChange(otherFieldName, '')
                      }
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
              
              {/* Show input field for "Other" option when selected */}
              {option.value === 'other' && (value || []).includes('other') && (
                <div className="ml-7">
                  <Input
                    placeholder="Please specify..."
                    value={responses[`${question.id}Other`] || ''}
                    onChange={(e) => onResponseChange(`${question.id}Other`, e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ))}
          {question.maxSelections && (
            <p className="text-xs text-gray-500 mt-2">
              Select up to {question.maxSelections} options
              {value && ` (${value.length}/${question.maxSelections} selected)`}
            </p>
          )}
        </div>
      )

    case 'slider':
      return (
        <div className="space-y-4">
          <div className="px-4">
            <Slider
              value={[value || question.default]}
              onValueChange={(values) => onChange(values[0])}
              max={question.max}
              min={question.min}
              step={question.step || 1}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{question.formatValue ? question.formatValue(question.min) : `${question.min}`}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {question.formatValue 
                ? question.formatValue(value || question.default) 
                : `${value || question.default}${question.id === 'timeCommitment' ? ' hours per week' : ''}`
              }
            </span>
            <span>{question.formatValue ? question.formatValue(question.max) : `${question.max}`}</span>
          </div>
        </div>
      )

    case 'input':
      return (
        <div className="space-y-4">
          <Input
            type={question.inputType || 'text'}
            placeholder={question.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            disabled={responses?.noPortfolio}
          />
          {question.hasNoPortfolioOption && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="noPortfolio"
                checked={responses?.noPortfolio || false}
                onCheckedChange={(checked) => {
                  onResponseChange('noPortfolio', checked)
                  if (checked) {
                    onChange('') // Clear the URL if "no portfolio" is selected
                  }
                }}
              />
              <Label htmlFor="noPortfolio" className="text-sm text-gray-600 dark:text-gray-400">
                I don't have a portfolio yet
              </Label>
            </div>
          )}
        </div>
      )

    case 'textarea':
      return (
        <Textarea
          placeholder={question.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[100px]"
        />
      )

    default:
      return null
  }
}