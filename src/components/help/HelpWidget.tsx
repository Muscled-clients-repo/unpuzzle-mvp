'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  HelpCircle,
  MessageSquare,
  Bug,
  Lightbulb,
  BookOpen,
  MessageCircle,
  X
} from 'lucide-react'
import { BugReportModal } from './BugReportModal'
import { FeatureRequestModal } from './FeatureRequestModal'
import { useDraftQueries } from '@/hooks/use-draft-websocket'

export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false)
  const [bugReportMinimized, setBugReportMinimized] = useState(false)
  const [featureRequestMinimized, setFeatureRequestMinimized] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>()

  // Get draft data for submenu
  const { bugDrafts, featureDrafts } = useDraftQueries()

  const handleChatSupport = () => {
    // TODO: Implement chat support
    console.log('Opening chat support...')
    setIsOpen(false)
  }

  const handleFAQs = () => {
    // TODO: Implement FAQs
    console.log('Opening FAQs...')
    setIsOpen(false)
  }

  const helpOptions = [
    {
      icon: MessageSquare,
      label: 'Chat with Support',
      description: 'Get instant help from our team',
      action: handleChatSupport,
      available: false // Will be true when chat is implemented
    },
    {
      icon: Bug,
      label: 'Report Bug',
      description: 'Found something broken?',
      action: () => {
        setBugReportOpen(true)
        setIsOpen(false)
      },
      available: true
    },
    {
      icon: Lightbulb,
      label: 'Request Feature',
      description: 'Suggest an improvement',
      action: () => {
        setFeatureRequestOpen(true)
        setIsOpen(false)
      },
      available: true
    },
    {
      icon: BookOpen,
      label: 'Documentation',
      description: 'Coming soon',
      action: () => {},
      available: false
    },
    {
      icon: MessageCircle,
      label: 'FAQs',
      description: 'Common questions & answers',
      action: handleFAQs,
      available: false // Will be true when FAQs are ready
    }
  ]

  return (
    <>

      {/* Help Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {isOpen ? (
          <Card className="mb-4 w-80 shadow-lg border">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-sm">How can we help?</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Help Options */}
              <div className="p-2">
                {helpOptions.map((option, index) => {
                  const Icon = option.icon
                  const showBugDrafts = option.label === 'Report Bug' && bugDrafts.length > 0
                  const showFeatureDrafts = option.label === 'Request Feature' && featureDrafts.length > 0


                  return (
                    <div key={index}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start h-auto p-3 ${
                          !option.available ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                        }`}
                        onClick={option.available ? option.action : undefined}
                        disabled={!option.available}
                      >
                        <div className="flex items-start gap-3 text-left">
                          <Icon className={`h-4 w-4 mt-0.5 ${
                            option.label === 'Report Bug' ? 'text-red-600' :
                            option.label === 'Request Feature' ? 'text-green-600' :
                            option.label === 'Chat with Support' ? 'text-blue-600' :
                            'text-muted-foreground'
                          }`} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {option.label}
                              {!option.available && option.label !== 'Documentation' && (
                                <span className="text-xs text-muted-foreground ml-1">(Coming Soon)</span>
                              )}
                              {showBugDrafts && (
                                <span className="text-xs text-red-600 ml-1">({bugDrafts.length} draft{bugDrafts.length === 1 ? '' : 's'})</span>
                              )}
                              {showFeatureDrafts && (
                                <span className="text-xs text-green-600 ml-1">({featureDrafts.length} draft{featureDrafts.length === 1 ? '' : 's'})</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </Button>

                      {/* Bug Report Drafts Submenu */}
                      {showBugDrafts && (
                        <div className="ml-8 mt-1 space-y-1">
                          {bugDrafts.slice(0, 3).map((draft, draftIndex) => (
                            <Button
                              key={draft.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1 px-2 text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedDraftId(draft.id)
                                setBugReportOpen(true)
                                setIsOpen(false)
                              }}
                            >
                              <div className="truncate">
                                📄 {draft.title || `Draft ${draftIndex + 1}`}
                              </div>
                            </Button>
                          ))}
                          {bugDrafts.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1 px-2 text-muted-foreground hover:bg-muted"
                              onClick={() => {
                                // TODO: Show all drafts
                                setBugReportOpen(true)
                                setIsOpen(false)
                              }}
                            >
                              View all {bugDrafts.length} drafts...
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Feature Request Drafts Submenu */}
                      {showFeatureDrafts && (
                        <div className="ml-8 mt-1 space-y-1">
                          {featureDrafts.slice(0, 3).map((draft, draftIndex) => (
                            <Button
                              key={draft.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1 px-2 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                // TODO: Load specific draft
                                setFeatureRequestOpen(true)
                                setIsOpen(false)
                              }}
                            >
                              <div className="truncate">
                                💡 {draft.title || `Draft ${draftIndex + 1}`}
                              </div>
                            </Button>
                          ))}
                          {featureDrafts.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1 px-2 text-muted-foreground hover:bg-muted"
                              onClick={() => {
                                // TODO: Show all drafts
                                setFeatureRequestOpen(true)
                                setIsOpen(false)
                              }}
                            >
                              View all {featureDrafts.length} drafts...
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Help Button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full h-12 w-12 shadow-lg"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Modals */}
      <BugReportModal
        isOpen={bugReportOpen}
        onClose={() => {
          setBugReportOpen(false)
          setSelectedDraftId(undefined)
        }}
        onMinimize={() => {
          setBugReportOpen(false)
          setBugReportMinimized(true)
        }}
        selectedDraftId={selectedDraftId}
      />

      <FeatureRequestModal
        isOpen={featureRequestOpen}
        onClose={() => setFeatureRequestOpen(false)}
        onMinimize={() => {
          setFeatureRequestOpen(false)
          setFeatureRequestMinimized(true)
        }}
      />
    </>
  )
}