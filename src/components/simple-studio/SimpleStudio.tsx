'use client'

import { useState, useEffect } from 'react'
import { useVideoEditor } from '@/lib/video-editor/useVideoEditor'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play, Pause, Circle, Square } from 'lucide-react'
import Link from 'next/link'
import { SimpleTimeline } from './SimpleTimeline'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { formatFrame } from './formatters'

export function SimpleStudio() {
  const editor = useVideoEditor()
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  
  // Prevent browser back/forward navigation on horizontal swipe
  useEffect(() => {
    let timelineElement: HTMLElement | null = null
    
    const handleWheel = (e: WheelEvent) => {
      // Get timeline element
      timelineElement = timelineElement || document.querySelector('[data-timeline-scroll]')
      
      if (timelineElement && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // It's a horizontal swipe - always prevent browser navigation
        e.preventDefault()
        
        // Manually scroll the timeline
        timelineElement.scrollLeft += e.deltaX
      }
    }
    
    document.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])
  
  // Handle delete with selection clearing
  const handleDeleteClip = (clipId: string) => {
    editor.deleteClip(clipId)
    setSelectedClipId(null) // Clear selection after deletion
  }
  
  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    isPlaying: editor.isPlaying,
    play: editor.play,
    pause: editor.pause,
    currentFrame: editor.currentFrame,
    clips: editor.clips,
    splitClip: editor.splitClip,
    seekToFrame: editor.seekToFrame,
    selectedClipId,
    deleteClip: handleDeleteClip
  })
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header - Fixed height */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/instructor" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Video Studio</h1>
          <span className="text-xs text-gray-500">Simple Architecture</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Recording Controls in Header */}
          {!editor.isRecording ? (
            <Button 
              size="sm"
              onClick={editor.startRecording}
              className="bg-red-600 hover:bg-red-700"
            >
              <Circle className="h-3 w-3 mr-1" />
              Record
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={editor.stopRecording}
              className="bg-gray-600 hover:bg-gray-700"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
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
            {/* Video Preview Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              <video 
                ref={editor.videoRef}
                className={editor.clips.length > 0 ? 'block' : 'hidden'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                controls={false}
              />
              <div className={`text-gray-500 text-center ${editor.clips.length > 0 ? 'hidden' : ''}`}>
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg mb-1">Video Preview</p>
                <p className="text-sm text-gray-600">Click "Record" to begin</p>
              </div>
            </div>
            
            {/* Playback Controls */}
            <div className="h-12 bg-gray-850 border-t border-gray-700 flex items-center justify-center gap-2">
              {!editor.isPlaying ? (
                <Button 
                  size="sm"
                  onClick={editor.play}
                  variant="ghost"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={editor.pause}
                  variant="ghost"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <span className="text-xs text-gray-400 ml-4 font-mono" style={{ minWidth: '140px', display: 'inline-block' }}>
                {formatFrame(editor.currentFrame)} / {formatFrame(editor.totalFrames)}
              </span>
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
                {editor.clips.map((clip, index) => (
                  <div key={clip.id} className="aspect-video bg-gray-900 rounded flex items-center justify-center text-xs text-gray-400">
                    Clip {index + 1}
                  </div>
                ))}
                <div className="aspect-video bg-gray-900 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline Panel - 80% width */}
          <div className="flex-1 overflow-hidden" style={{ width: '80%' }}>
            <SimpleTimeline 
              clips={editor.clips}
              currentFrame={editor.visualFrame}  // Use throttled frame for smooth visuals
              totalFrames={editor.totalFrames}
              onSeekToFrame={editor.seekToFrame}
              selectedClipId={selectedClipId}
              onSelectClip={setSelectedClipId}
              onMoveClip={editor.moveClip}
            />
          </div>
        </div>
      </div>
    </div>
  )
}