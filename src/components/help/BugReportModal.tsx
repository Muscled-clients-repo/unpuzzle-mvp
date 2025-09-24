'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
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
import { Badge } from '@/components/ui/badge'
import { createRequest } from '@/lib/actions/request-actions'
import { useDraftMutations, useDraftQueries } from '@/hooks/use-draft-websocket'
import { toast } from 'sonner'
import { Bug, MapPin, Minimize2, Check } from 'lucide-react'

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
  onMinimize?: () => void
  selectedDraftId?: string
}

export function BugReportModal({ isOpen, onClose, onMinimize, selectedDraftId }: BugReportModalProps) {
  const pathname = usePathname()
  const { user } = useAppStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loomLink, setLoomLink] = useState('')
  const [showDraftSaved, setShowDraftSaved] = useState(false)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>()
  const [lastSavedValues, setLastSavedValues] = useState({
    title: '',
    description: '',
    loomLink: ''
  })

  // Draft system
  const { performAutoSave, isAutoSaving, deleteDraft } = useDraftMutations()
  const { bugDrafts } = useDraftQueries()

  // Auto-populated context
  const [context, setContext] = useState({
    route: '',
    userAgent: '',
    timestamp: '',
    userRole: '',
    screenSize: ''
  })

  // Auto-save functionality like Google Docs
  const performSimpleAutoSave = useCallback(async () => {
    if (title || description || loomLink) {
      const draftData = {
        id: currentDraftId,
        type: 'bug_report' as const,
        title,
        description,
        metadata: {
          loomLink,
          context
        }
      }

      try {
        const result = await performAutoSave(draftData)
        if (result?.success && result.draft?.id) {
          // Update currentDraftId if this is a new draft
          if (!currentDraftId) {
            setCurrentDraftId(result.draft.id)
          }
          // lastSavedValues will be updated in the useEffect after this completes
        }
        setShowDraftSaved(true)
        setTimeout(() => setShowDraftSaved(false), 2000)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }
  }, [title, description, loomLink, context, currentDraftId, performAutoSave])

  useEffect(() => {
    if (isOpen) {
      console.log('🔍 BugReportModal opened with selectedDraftId:', selectedDraftId)

      const newContext = {
        route: pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userRole: user?.role || 'unknown',
        screenSize: `${window.screen.width}x${window.screen.height}`
      }
      setContext(newContext)

      // If specific draft selected, load it immediately
      if (selectedDraftId) {
        console.log('📝 Loading specific draft:', selectedDraftId)
        const selectedDraft = bugDrafts.find(d => d.id === selectedDraftId)
        if (selectedDraft) {
          console.log('✅ Found selected draft, loading directly')
          const loadedTitle = selectedDraft.title || ''
          const loadedDescription = selectedDraft.description || ''
          const loadedLoom = selectedDraft.metadata?.loomLink || ''

          setCurrentDraftId(selectedDraft.id)
          setTitle(loadedTitle)
          setDescription(loadedDescription)
          setLoomLink(loadedLoom)

          // Update last saved values to current loaded state
          setLastSavedValues({
            title: loadedTitle,
            description: loadedDescription,
            loomLink: loadedLoom
          })
          return // Skip the draft prompt
        } else {
          console.log('❌ Selected draft not found in bugDrafts:', bugDrafts)
        }
      }

      // Check for existing drafts only when no specific draft selected
      if (!selectedDraftId && bugDrafts.length > 0) {
        const latestDraft = bugDrafts[0] // Most recent draft
        if (latestDraft.title || latestDraft.description || latestDraft.metadata?.loomLink) {
          setShowDraftPrompt(true)
        }
      }
    }
  }, [isOpen, pathname, user, bugDrafts, selectedDraftId])

  // Simple debounced auto-save - only when values changed from last saved
  useEffect(() => {
    if (isOpen) {
      const hasChanged =
        title !== lastSavedValues.title ||
        description !== lastSavedValues.description ||
        loomLink !== lastSavedValues.loomLink

      if (hasChanged && (title || description || loomLink)) {
        const timer = setTimeout(async () => {
          await performSimpleAutoSave()
          // Update last saved values after successful save
          setLastSavedValues({
            title,
            description,
            loomLink
          })
        }, 1500) // 1.5 seconds debounce
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, title, description, loomLink, lastSavedValues, performSimpleAutoSave])

  const submitBugReportMutation = useMutation({
    mutationFn: async () => {
      await createRequest({
        request_type: 'bug_report',
        title,
        description,
        metadata: {
          loomLink,
          context: {
            route: context.route,
            userAgent: context.userAgent,
            timestamp: context.timestamp,
            userRole: context.userRole,
            screenSize: context.screenSize
          }
        },
        priority: 'medium'
      })
    },
    onSuccess: () => {
      toast.success('Bug report submitted successfully!')
      // Delete the draft after successful submission
      if (currentDraftId) {
        deleteDraft(currentDraftId)
      }
      handleClose()
    },
    onError: (error) => {
      toast.error('Failed to submit bug report')
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
    submitBugReportMutation.mutate()
  }

  const getPageName = (route: string) => {
    const segments = route.split('/').filter(Boolean)
    if (segments.length === 0) return 'Home'

    // Convert route to readable name
    const pageNames: Record<string, string> = {
      'student': 'Student Dashboard',
      'instructor': 'Instructor Dashboard',
      'goals': 'Goals',
      'courses': 'Courses',
      'lessons': 'Lessons',
      'requests': 'Requests',
      'track-selection': 'Track Selection',
      'student-goals': 'Student Goals Management'
    }

    const lastSegment = segments[segments.length - 1]
    return pageNames[lastSegment] || lastSegment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleContinueDraft = () => {
    if (bugDrafts.length > 0) {
      const latestDraft = bugDrafts[0]
      const loadedTitle = latestDraft.title || ''
      const loadedDescription = latestDraft.description || ''
      const loadedLoom = latestDraft.metadata?.loomLink || ''

      setCurrentDraftId(latestDraft.id)
      setTitle(loadedTitle)
      setDescription(loadedDescription)
      setLoomLink(loadedLoom)

      // Update last saved values to current loaded state
      setLastSavedValues({
        title: loadedTitle,
        description: loadedDescription,
        loomLink: loadedLoom
      })
      setShowDraftPrompt(false)
    }
  }

  const handleStartNew = () => {
    setCurrentDraftId(undefined)
    setTitle('')
    setDescription('')
    setLoomLink('')
    setShowDraftPrompt(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-600" />
              Report a Bug
            </div>
            <div className="flex items-center gap-2">
              {(showDraftSaved || isAutoSaving) && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  {isAutoSaving ? 'Saving...' : 'Draft saved'}
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
            Help us fix issues by providing detailed information about the problem you encountered.
          </DialogDescription>
        </DialogHeader>

        {showDraftPrompt ? (
          <div className="p-6 text-center space-y-4">
            <div className="text-lg font-medium">Continue previous draft?</div>
            <p className="text-sm text-muted-foreground">
              We found {bugDrafts.length} draft{bugDrafts.length === 1 ? '' : 's'} about "{bugDrafts[0]?.title || 'Untitled'}" that you were working on.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleContinueDraft} variant="default">
                Continue Latest Draft
              </Button>
              <Button onClick={handleStartNew} variant="outline">
                Start New Report
              </Button>
              {bugDrafts.length > 1 && (
                <Button onClick={() => {/* TODO: Show all drafts */}} variant="ghost" size="sm">
                  View All ({bugDrafts.length})
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Simplified Context */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Page: {getPageName(context.route)}</span>
              <span>•</span>
              <span>{new Date(context.timestamp).toLocaleString()}</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="bug-title">Issue Title *</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              required
            />
          </div>

          {/* Combined Description */}
          <div className="space-y-2">
            <Label htmlFor="bug-description">What happened, and where? *</Label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: In the video page, I see the AI agent isn't working. When I click on the AI chat button, nothing happens and I expected a chat window to open."
              rows={5}
              required
            />
          </div>

          {/* Loom Video Link */}
          <div className="space-y-2">
            <Label htmlFor="loom-link">Show us a Loom video of the bug</Label>
            <Input
              id="loom-link"
              value={loomLink}
              onChange={(e) => setLoomLink(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Record a Loom video showing the bug in action. This helps us understand and fix the issue faster!
            </p>
          </div>

        </form>
        )}

        {!showDraftPrompt && (
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitBugReportMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitBugReportMutation.isPending || !title || !description}
          >
            {submitBugReportMutation.isPending ? 'Submitting...' : 'Submit Bug Report'}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}