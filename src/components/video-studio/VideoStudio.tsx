'use client'

import { useState, useEffect, useRef } from 'react'
import { useVideoEditor } from '@/lib/video-editor/useVideoEditor'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play, Pause, Circle, Square, Undo2, Redo2, X, Maximize } from 'lucide-react'
import Link from 'next/link'
import { Timeline } from './Timeline'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { formatFrame } from './formatters'

export function VideoStudio() {
  const editor = useVideoEditor()
  const [topSectionHeight, setTopSectionHeight] = useState(65) // Default to 65%
  const [leftPanelWidth, setLeftPanelWidth] = useState(20) // Default to 20%
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [viewMode, setViewMode] = useState<'normal' | 'fullTab' | 'fullScreen'>('normal')
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef(false)
  const isDraggingHorizontalRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  
  // Handle vertical resizing (between preview and bottom panels)
  const handleVerticalResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    
    const startY = e.clientY
    const startHeight = topSectionHeight
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      
      const containerHeight = containerRef.current.offsetHeight
      const deltaY = e.clientY - startY
      const deltaPercent = (deltaY / containerHeight) * 100
      const newHeight = Math.min(Math.max(20, startHeight + deltaPercent), 80) // Clamp between 20% and 80%
      
      setTopSectionHeight(newHeight)
    }
    
    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  // Handle horizontal resizing (between left panels and right panels)
  const handleHorizontalResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingHorizontalRef.current = true
    
    const startX = e.clientX
    const startWidth = leftPanelWidth
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingHorizontalRef.current || !containerRef.current) return
      
      const containerWidth = containerRef.current.offsetWidth
      const deltaX = e.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.min(Math.max(10, startWidth + deltaPercent), 40) // Clamp between 10% and 40%
      
      setLeftPanelWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      isDraggingHorizontalRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  // Handle recording timer
  useEffect(() => {
    if (editor.isRecording) {
      setRecordingDuration(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      setRecordingDuration(0)
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [editor.isRecording])
  
  // Format recording duration
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Handle view mode changes
  const handleFullTab = () => {
    setViewMode(viewMode === 'fullTab' ? 'normal' : 'fullTab')
  }
  
  const handleFullScreen = async () => {
    if (viewMode === 'fullScreen') {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      }
      setViewMode('normal')
    } else {
      if (videoContainerRef.current?.requestFullscreen) {
        await videoContainerRef.current.requestFullscreen()
      }
      setViewMode('fullScreen')
    }
  }
  
  // Handle keyboard shortcuts for view modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === 'f' || e.key === 'F') {
        if (e.shiftKey) {
          // Shift+F for full screen
          e.preventDefault()
          handleFullScreen()
        } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          // Just F for full tab
          e.preventDefault()
          handleFullTab()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViewMode('normal')
      }
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  // Handle video element positioning based on view mode
  useEffect(() => {
    const videoElement = editor.videoRef.current
    if (!videoElement) return
    
    const updateVideoPosition = () => {
      if (viewMode === 'normal') {
        // Move video to preview container
        const previewContainer = document.getElementById('video-preview-container')
        if (previewContainer) {
          videoElement.className = `${editor.clips.length > 0 ? 'block' : 'hidden'} max-w-full max-h-full object-contain`
          videoElement.style.cssText = `
            position: relative;
            inset: auto;
            width: auto;
            height: auto;
            transform: none;
            z-index: auto;
          `
          videoElement.controls = false
          
          // Always move to preview container for normal mode
          if (videoElement.parentNode !== previewContainer) {
            previewContainer.appendChild(videoElement)
          }
        }
      } else {
        // Move video to document body for fixed positioning
        videoElement.className = `${editor.clips.length > 0 ? 'block' : 'hidden'} fixed object-contain`
        if (viewMode === 'fullScreen') {
          videoElement.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            transform: none;
            z-index: 50;
            object-fit: contain;
          `
        } else {
          // fullTab mode - leave space for controls at bottom
          videoElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 64px;
            width: 100vw;
            height: calc(100vh - 64px);
            transform: none;
            z-index: 30;
            object-fit: contain;
          `
        }
        videoElement.controls = viewMode === 'fullScreen'
        
        if (videoElement.parentNode !== document.body) {
          document.body.appendChild(videoElement)
        }
      }
    }
    
    // Run immediately and with small delay for DOM updates
    updateVideoPosition()
    const timer = setTimeout(updateVideoPosition, 50)
    
    return () => clearTimeout(timer)
  }, [viewMode, editor.clips.length, editor.videoRef])
  
  // Additional effect to ensure video is properly positioned when first clip is added
  useEffect(() => {
    if (editor.clips.length > 0 && viewMode === 'normal') {
      const videoElement = editor.videoRef.current
      if (videoElement) {
        const previewContainer = document.getElementById('video-preview-container')
        if (previewContainer && videoElement.parentNode !== previewContainer) {
          setTimeout(() => {
            videoElement.className = 'block max-w-full max-h-full object-contain'
            videoElement.style.cssText = `
              position: relative;
              inset: auto;
              width: auto;
              height: auto;
              transform: none;
              z-index: auto;
            `
            videoElement.controls = false
            previewContainer.appendChild(videoElement)
          }, 100)
        }
      }
    }
  }, [editor.clips.length, editor.videoRef])
  
  // Cleanup: ensure video element returns to normal container on unmount
  useEffect(() => {
    return () => {
      const videoElement = editor.videoRef.current
      if (videoElement && videoElement.parentNode === document.body) {
        const previewContainer = document.getElementById('video-preview-container')
        if (previewContainer) {
          previewContainer.appendChild(videoElement)
        }
      }
    }
  }, [])
  
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
    editor.setSelectedClipId(null) // Clear selection after deletion
  }
  
  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    isPlaying: editor.isPlaying,
    play: editor.play,
    pause: editor.pause,
    undo: editor.undo,
    redo: editor.redo,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    currentFrame: editor.currentFrame,
    clips: editor.clips,
    splitClip: editor.splitClip,
    trimClipLeft: editor.trimClipLeft,
    trimClipRight: editor.trimClipRight,
    seekToFrame: editor.seekToFrame,
    selectedClipId: editor.selectedClipId,
    deleteClip: handleDeleteClip
  })
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Video element will be positioned by useEffect - start hidden */}
      <video 
        ref={editor.videoRef}
        className="hidden"
      />

      {/* Full Tab View Controls */}
      {viewMode === 'fullTab' && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-4 right-4 flex gap-2 z-10 pointer-events-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFullScreen}
              className="text-white hover:bg-gray-800"
              title="Full Screen (Shift+F)"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFullTab}
              className="text-white hover:bg-gray-800"
              title="Exit Full Tab View (F)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {editor.clips.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-center pointer-events-none">
              <div>
                <p className="text-lg">No clips to preview</p>
                <p className="text-sm">Press F to exit full tab view</p>
              </div>
            </div>
          )}
          
          {/* Playback controls at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-900 bg-opacity-75 flex items-center justify-center gap-4 pointer-events-auto">
            {!editor.isPlaying ? (
              <Button 
                size="sm"
                onClick={editor.play}
                variant="ghost"
                className="text-white hover:bg-gray-800"
              >
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={editor.pause}
                variant="ghost"
                className="text-white hover:bg-gray-800"
              >
                <Pause className="h-5 w-5" />
              </Button>
            )}
            <span className="text-sm text-gray-300 font-mono">
              {formatFrame(editor.currentFrame)} / {formatFrame(editor.totalFrames)}
            </span>
          </div>
        </div>
      )}
      
      {/* Full Screen View Container */}
      {viewMode === 'fullScreen' && (
        <div 
          ref={videoContainerRef}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          {/* Single video element is positioned with CSS */}
        </div>
      )}
      {/* Header - Fixed height */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/instructor" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Unpuzzle AI Course Maker</h1>
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
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-semibold text-sm flex items-center gap-1">
                <Circle className="h-3 w-3 fill-red-500 animate-pulse" />
                {formatRecordingTime(recordingDuration)}
              </span>
              <Button 
                size="sm"
                onClick={editor.stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <Square className="h-3 w-3 mr-1 fill-white" />
                Stop
              </Button>
            </div>
          )}
          <Button size="sm" variant="ghost">Save Project</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Export</Button>
        </div>
      </div>
      
      {/* Main 4-Panel Layout */}
      <div className="flex-1 flex flex-col overflow-hidden" ref={containerRef}>
        {/* Top Section - Dynamic height (Script + Preview) */}
        <div className="flex" style={{ height: `${topSectionHeight}%` }}>
          {/* AI Script Panel - Dynamic width */}
          <div className="bg-gray-800 overflow-auto" style={{ width: `${leftPanelWidth}%` }}>
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
          
          {/* Horizontal Resize Handle */}
          <div 
            className="w-1 bg-gray-700 cursor-ew-resize hover:bg-gray-600 transition-colors relative group"
            onMouseDown={handleHorizontalResizeMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-12 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          {/* Preview Panel - Dynamic width */}
          <div className="flex-1 bg-black flex flex-col overflow-hidden" style={{ width: `${100 - leftPanelWidth}%` }}>
            {/* Video Preview Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden" id="video-preview-container">
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
        
        {/* Vertical Resize Handle */}
        <div 
          className="relative h-1 bg-gray-700 cursor-ns-resize hover:bg-gray-600 transition-colors group z-[25]"
          onMouseDown={handleVerticalResizeMouseDown}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-1 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        
        {/* Bottom Section - Dynamic height (Assets + Timeline) */}
        <div className="flex flex-1" style={{ height: `${100 - topSectionHeight}%` }}>
          {/* Assets Panel - Dynamic width */}
          <div className="bg-gray-800 overflow-auto" style={{ width: `${leftPanelWidth}%` }}>
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
          
          {/* Horizontal Resize Handle (for bottom section) */}
          <div 
            className="w-1 bg-gray-700 cursor-ew-resize hover:bg-gray-600 transition-colors relative group"
            onMouseDown={handleHorizontalResizeMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-12 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          {/* Timeline Panel - Dynamic width */}
          <div className="flex-1 overflow-hidden" style={{ width: `${100 - leftPanelWidth}%` }}>
            <Timeline 
              clips={editor.clips}
              tracks={editor.tracks}
              currentFrame={editor.visualFrame}  // Use throttled frame for smooth visuals
              totalFrames={editor.totalFrames}
              isPlaying={editor.isPlaying}
              onPause={editor.pause}
              onSeekToFrame={editor.seekToFrame}
              selectedClipId={editor.selectedClipId}
              selectedTrackIndex={editor.selectedTrackIndex}
              onSelectClip={editor.setSelectedClipId}
              onSelectTrack={editor.setSelectedTrackIndex}
              onMoveClip={editor.moveClip}
              onMoveClipComplete={editor.moveClipComplete}
              onMoveClipToTrack={editor.moveClipToTrack}
              onTrimClipStart={editor.trimClipStart}
              onTrimClipStartComplete={editor.trimClipStartComplete}
              onTrimClipEnd={editor.trimClipEnd}
              onTrimClipEndComplete={editor.trimClipEndComplete}
              onAddTrack={editor.addTrack}
              onToggleTrackMute={editor.toggleTrackMute}
            />
          </div>
        </div>
      </div>
    </div>
  )
}