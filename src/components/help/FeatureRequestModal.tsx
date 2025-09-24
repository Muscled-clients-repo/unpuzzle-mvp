'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createRequest } from '@/lib/actions/request-actions'
import { useDraftMutations, useDraftQueries } from '@/hooks/use-draft-websocket'
import { toast } from 'sonner'
import { Lightbulb, Minimize2, Check } from 'lucide-react'

interface FeatureRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onMinimize?: () => void
}

export function FeatureRequestModal({ isOpen, onClose, onMinimize }: FeatureRequestModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [useCase, setUseCase] = useState('')
  const [loomLink, setLoomLink] = useState('')
  const [showDraftSaved, setShowDraftSaved] = useState(false)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>()
  const [isDirty, setIsDirty] = useState(false)

  // Track initial values to detect actual changes
  const initialValues = useRef({
    title: '',
    description: '',
    useCase: '',
    loomLink: ''
  })

  // WebSocket-based draft system
  const { performAutoSave, isAutoSaving } = useDraftMutations()
  const { featureDrafts } = useDraftQueries()

  // Auto-save functionality like Google Docs
  const performSimpleAutoSave = useCallback(async () => {
    if (title || description || useCase || loomLink) {
      console.log('🔄 Starting feature request auto-save...')
      const draftData = {
        id: currentDraftId,
        type: 'feature_request' as const,
        title,
        description,
        metadata: {
          useCase,
          loomLink
        }
      }

      try {
        const result = await performAutoSave(draftData)
        if (result?.success && result.draft?.id) {
          // Update currentDraftId if this is a new draft
          if (!currentDraftId) {
            setCurrentDraftId(result.draft.id)
          }
          // Update initial values after successful save
          initialValues.current = {
            title,
            description,
            useCase,
            loomLink
          }
        }
        setShowDraftSaved(true)
        setTimeout(() => setShowDraftSaved(false), 2000)
      } catch (error) {
        console.error('Feature request auto-save failed:', error)
      }
    }
  }, [title, description, useCase, loomLink, currentDraftId, performAutoSave])

  // Load draft on open
  const loadDraft = useCallback(() => {
    const savedDraft = localStorage.getItem('featureRequestDraft')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setHasDraft(true)
        return draft
      } catch (e) {
        localStorage.removeItem('featureRequestDraft')
      }
    }
    return null
  }, [])

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem('featureRequestDraft')
    setHasDraft(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Check for existing drafts from database
      if (featureDrafts.length > 0) {
        const latestDraft = featureDrafts[0] // Most recent draft
        if (latestDraft.title || latestDraft.description || latestDraft.metadata?.useCase || latestDraft.metadata?.loomLink) {
          const loadedTitle = latestDraft.title || ''
          const loadedDescription = latestDraft.description || ''
          const loadedUseCase = latestDraft.metadata?.useCase || ''
          const loadedLoomLink = latestDraft.metadata?.loomLink || ''

          setCurrentDraftId(latestDraft.id)
          setTitle(loadedTitle)
          setDescription(loadedDescription)
          setUseCase(loadedUseCase)
          setLoomLink(loadedLoomLink)
          setHasDraft(true)

          // Update initial values to prevent false dirty state
          initialValues.current = {
            title: loadedTitle,
            description: loadedDescription,
            useCase: loadedUseCase,
            loomLink: loadedLoomLink
          }
          setIsDirty(false)
        }
      }
    }
  }, [isOpen, featureDrafts])

  // Mark as dirty only when content changes from initial values
  useEffect(() => {
    if (isOpen) {
      const hasChanged =
        title !== initialValues.current.title ||
        description !== initialValues.current.description ||
        useCase !== initialValues.current.useCase ||
        loomLink !== initialValues.current.loomLink

      if (hasChanged) {
        setIsDirty(true)
      }
    }
  }, [isOpen, title, description, useCase, loomLink])

  // Debounced auto-save (like Google Docs) - only when dirty
  useEffect(() => {
    if (isOpen && isDirty && (title || description || useCase || loomLink)) {
      const timer = setTimeout(async () => {
        await performSimpleAutoSave()
        setIsDirty(false) // Reset dirty flag after save
      }, 1500) // 1.5 seconds debounce
      return () => clearTimeout(timer)
    }
  }, [isOpen, isDirty, title, description, useCase, loomLink, performSimpleAutoSave])

  const submitFeatureRequestMutation = useMutation({
    mutationFn: async () => {
      await createRequest({
        request_type: 'feature_request',
        title,
        description,
        metadata: {
          useCase,
          loomLink
        },
        priority: 'medium'
      })
    },
    onSuccess: () => {
      toast.success('Feature request submitted successfully!')
      clearDraft()
      handleClose()
    },
    onError: (error) => {
      toast.error('Failed to submit feature request')
      console.error(error)
    }
  })

  const handleClose = () => {
    // Don't clear form data here - let auto-save handle it
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) {
      toast.error('Please fill in all required fields')
      return
    }
    submitFeatureRequestMutation.mutate()
  }

  const handleContinueDraft = () => {
    if (draftData) {
      setTitle(draftData.title || '')
      setDescription(draftData.description || '')
      setUseCase(draftData.useCase || '')
      setLoomLink(draftData.loomLink || '')
      setShowDraftPrompt(false)
    }
  }

  const handleStartNew = () => {
    clearDraft()
    setTitle('')
    setDescription('')
    setUseCase('')
    setLoomLink('')
    setShowDraftPrompt(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-green-600" />
              Request a Feature
            </div>
            <div className="flex items-center gap-2">
              {showDraftSaved && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  Draft saved
                </div>
              )}
              {onMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMinimize}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Share your ideas to help us improve the platform. We value your feedback!
          </DialogDescription>
        </DialogHeader>

        {showDraftPrompt ? (
          <div className="p-6 text-center space-y-4">
            <div className="text-lg font-medium">Continue previous draft?</div>
            <p className="text-sm text-muted-foreground">
              We found a draft about "{draftData?.title || 'Untitled'}" that you were working on.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleContinueDraft} variant="default">
                Continue Draft
              </Button>
              <Button onClick={handleStartNew} variant="outline">
                Start New Request
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="feature-title">Feature Title *</Label>
            <Input
              id="feature-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the feature you'd like"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="feature-description">Feature Description *</Label>
            <Textarea
              id="feature-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature in detail. What should it do? How should it work?"
              rows={4}
              required
            />
          </div>

          {/* Use Case */}
          <div className="space-y-2">
            <Label htmlFor="feature-usecase">Why do you think this feature will be beneficial to you and the community?</Label>
            <Textarea
              id="feature-usecase"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="How would this feature help you and other users? What problem does it solve for the community?"
              rows={3}
            />
          </div>

          {/* Loom Video */}
          <div className="space-y-2">
            <Label htmlFor="feature-loom">Loom Video (Optional)</Label>
            <Input
              id="feature-loom"
              value={loomLink}
              onChange={(e) => setLoomLink(e.target.value)}
              placeholder="Share a Loom video link to better explain your feature idea"
              type="url"
            />
          </div>

          {/* Helper Text */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              💡 <strong>Tip:</strong> The more details you provide about your use case, the better we can understand and prioritize your request.
            </p>
          </div>
        </form>
        )}

        {!showDraftPrompt && (
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitFeatureRequestMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitFeatureRequestMutation.isPending || !title || !description}
          >
            {submitFeatureRequestMutation.isPending ? 'Submitting...' : 'Submit Feature Request'}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}