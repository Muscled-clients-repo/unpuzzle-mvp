'use client'

// NEW VIDEO STUDIO - Using bulletproof architecture
// Keeps the same UI, replaces the data layer

import { VideoEditorProvider, useVideoEditor } from '@/lib/video-editor'
import { RecordingControlsContainer } from './recorder/RecordingControls'
import { PlaybackControls } from './playback/PlaybackControls'
import { TimelineContainer } from './timeline/TimelineContainer'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export function VideoStudioNew() {
  return (
    <VideoEditorProvider>
      <VideoStudioContent />
    </VideoEditorProvider>
  )
}

function VideoStudioContent() {
  const { commands, queries } = useVideoEditor()
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - delete selected clips
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only call getTimelineClips when delete key is actually pressed
        const hasSelectedClips = queries.getTimelineClips().some(clip => clip.isSelected)
        if (hasSelectedClips) {
          e.preventDefault()
          commands.deleteSelectedClips()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands, queries]) // Keep dependencies for proper closure capture
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header - Fixed height */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/instructor" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Video Studio</h1>
          <span className="text-xs text-gray-500">Professional 4-Panel Layout</span>
        </div>
        <div className="flex items-center gap-2">
          <RecordingControlsContainer />
          <Button size="sm" variant="ghost">Save Project</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Export</Button>
        </div>
      </div>
      
      {/* Main 4-Panel Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - 65% height (Script + Preview) */}
        <div className="flex" style={{ height: '65%' }}>
          {/* AI Script Panel - 20% width */}
          <div className="bg-gray-800 border-r border-gray-700 overflow-auto" style={{ width: '20%' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">AI Script</h3>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                  Generate
                </Button>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-gray-900 rounded text-sm">
                  <p className="text-gray-400 mb-2">Scene 1</p>
                  <p className="text-gray-300 text-xs">Your script content will appear here...</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Panel - 80% width */}
          <div className="flex-1 bg-black flex flex-col overflow-hidden" style={{ width: '80%' }}>
            {/* Video Preview Area - FIXED: Added overflow-hidden and proper containment */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              <video 
                id="preview-video"
                className="hidden"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                controls={false}
              />
              <div className="text-gray-500 text-center" id="preview-placeholder">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg mb-1">Video Preview</p>
                <p className="text-sm text-gray-600">Click "Start Recording" to begin</p>
              </div>
            </div>
            
            {/* Playback Controls */}
            <div className="h-12 bg-gray-850 border-t border-gray-700 flex items-center justify-center gap-2">
              <PlaybackControls />
            </div>
          </div>
        </div>
        
        {/* Bottom Section - 35% height (Assets + Timeline) */}
        <div className="flex border-t border-gray-700" style={{ height: '35%' }}>
          {/* Assets Panel - 20% width */}
          <div className="bg-gray-800 border-r border-gray-700 overflow-auto" style={{ width: '20%' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Assets</h3>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                  Import
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline Panel - 80% width with horizontal scroll */}
          <div className="flex-1 bg-gray-850 overflow-hidden" style={{ width: '80%' }}>
            <TimelineContainer />
          </div>
        </div>
      </div>
    </div>
  )
}