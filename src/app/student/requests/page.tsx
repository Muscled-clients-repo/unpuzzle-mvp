'use client'

import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRequest } from '@/lib/actions/request-actions'
import { toast } from 'sonner'
import { Bug, Lightbulb, ArrowUpDown } from 'lucide-react'

export default function StudentRequestsPage() {
  const [requestType, setRequestType] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [useCase, setUseCase] = useState('')

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const metadata: Record<string, unknown> = {}

      if (requestType === 'bug_report' && stepsToReproduce) {
        metadata.stepsToReproduce = stepsToReproduce
      }

      if (requestType === 'feature_request' && useCase) {
        metadata.useCase = useCase
      }

      await createRequest({
        request_type: requestType as 'bug_report' | 'feature_request' | 'track_change',
        title,
        description,
        metadata,
        priority: 'medium'
      })
    },
    onSuccess: () => {
      toast.success('Request submitted successfully!')
      // Reset form
      setRequestType('')
      setTitle('')
      setDescription('')
      setStepsToReproduce('')
      setUseCase('')
    },
    onError: (error) => {
      toast.error('Failed to submit request')
      console.error(error)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestType || !title || !description) {
      toast.error('Please fill in all required fields')
      return
    }
    submitRequestMutation.mutate()
  }

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_report':
        return <Bug className="h-5 w-5 text-red-600" />
      case 'feature_request':
        return <Lightbulb className="h-5 w-5 text-green-600" />
      case 'track_change':
        return <ArrowUpDown className="h-5 w-5 text-blue-600" />
      default:
        return null
    }
  }

  return (
    <PageContainer>
      <PageContentHeader
        title="Submit a Request"
        description="Report bugs, request features, or request track changes"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getRequestTypeIcon(requestType)}
            Request Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Type */}
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug_report">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-600" />
                      Bug Report
                    </div>
                  </SelectItem>
                  <SelectItem value="feature_request">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-green-600" />
                      Feature Request
                    </div>
                  </SelectItem>
                  <SelectItem value="track_change">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-blue-600" />
                      Track Change Request
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your request"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of your request"
                rows={4}
                required
              />
            </div>

            {/* Conditional Fields */}
            {requestType === 'bug_report' && (
              <div className="space-y-2">
                <Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
                <Textarea
                  id="stepsToReproduce"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                  rows={3}
                />
              </div>
            )}

            {requestType === 'feature_request' && (
              <div className="space-y-2">
                <Label htmlFor="useCase">Use Case</Label>
                <Textarea
                  id="useCase"
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  placeholder="Describe how this feature would help you and when you would use it"
                  rows={3}
                />
              </div>
            )}

            {requestType === 'track_change' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📝 Track change requests require completing a questionnaire. After submitting this request, you'll be redirected to the questionnaire.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitRequestMutation.isPending || !requestType || !title || !description}
              className="w-full"
            >
              {submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}