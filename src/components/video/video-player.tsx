"use client"

import { useRef, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  Scissors,
  CornerDownLeft,
  CornerDownRight,
  Send,
  X,
  FileText,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  videoUrl: string
  title?: string
  transcript?: string
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
  timestamps?: Array<{
    time: number
    label: string
    type: "chapter" | "concept" | "quiz"
  }>
}

export function VideoPlayer({
  videoUrl,
  title,
  transcript,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
  timestamps = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const selectionUpdateRef = useRef<NodeJS.Timeout | null>(null)

  // Get state and actions from Zustand store
  const {
    // Video State
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    showControls,
    isFullscreen,
    inPoint,
    outPoint,
    isSelectingRange,
    showLiveTranscript,
    currentTranscriptText,
    selectedTranscriptText,
    selectedStartTime,
    selectedEndTime,
    // Video Actions
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    setPlaybackRate,
    setShowControls,
    setIsFullscreen,
    setInOutPoints,
    setIsSelectingRange,
    setShowLiveTranscript,
    setCurrentTranscriptText,
    setSelectedTranscriptText,
    setSelectedTimeRange,
    togglePlay,
    toggleMute,
    seekTo,
    clearSelection,
    // AI Actions for replacing DOM events
    addTranscriptReference,
    addChatMessage,
  } = useAppStore()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if video player container is focused or if we're not in an input field
      const isPlayerFocused = containerRef.current?.contains(document.activeElement)
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      
      if (!isPlayerFocused && isInInput) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(5)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          break
        case 'i':
        case 'I':
          e.preventDefault()
          setInPointHandler()
          break
        case 'o':
        case 'O':
          e.preventDefault()
          setOutPointHandler()
          break
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onTimeUpdate, onEnded])

  // Update live transcript text based on current time
  useEffect(() => {
    // 5-second interval transcript segments
    const transcriptSegments = [
      { start: 0, end: 5, text: "Welcome to this comprehensive introduction to web development." },
      { start: 5, end: 10, text: "In this course, we're going to explore the fundamental technologies that power the modern web." },
      { start: 10, end: 15, text: "We'll start with HTML, which stands for HyperText Markup Language." },
      { start: 15, end: 20, text: "HTML is the backbone of every webpage and provides the structure and content." },
      { start: 20, end: 25, text: "That browsers can understand and display to users." },
      { start: 25, end: 30, text: "Next, we'll dive into CSS, or Cascading Style Sheets." },
      { start: 30, end: 35, text: "CSS is what makes websites look beautiful and engaging." },
      { start: 35, end: 40, text: "It controls colors, fonts, layouts, animations, and responsive design." },
      { start: 40, end: 45, text: "Across different devices and screen sizes." },
      { start: 45, end: 50, text: "Finally, we'll explore JavaScript, the programming language." },
      { start: 50, end: 55, text: "That brings interactivity to web pages." },
      { start: 55, end: 60, text: "JavaScript allows us to create dynamic user experiences." },
      { start: 60, end: 65, text: "Handle user input, and communicate with servers." },
      { start: 65, end: 70, text: "Throughout this course, you'll build several projects." },
      { start: 70, end: 75, text: "That demonstrate these concepts in action." },
      { start: 75, end: 80, text: "By the end, you'll have the skills needed to create your own websites." },
      { start: 80, end: 85, text: "From scratch using modern web development practices." },
      { start: 85, end: 90, text: "Let's begin our journey into web development." },
      { start: 90, end: 95, text: "Remember, the key to mastering these technologies is practice." },
      { start: 95, end: 100, text: "And patience. Don't be afraid to experiment and make mistakes." },
      { start: 100, end: 105, text: "That's how we learn and grow as developers!" }
    ]
    
    const currentSegment = transcriptSegments.find(segment => 
      currentTime >= segment.start && currentTime < segment.end
    )
    
    if (currentSegment) {
      setCurrentTranscriptText(currentSegment.text)
    } else {
      setCurrentTranscriptText("")
    }
  }, [currentTime])

  // Listen for selection changes globally for real-time updates
  useEffect(() => {
    const handleSelectionChange = () => {
      // Only update if the selection is within the transcript area
      const selection = window.getSelection()
      if (selection && transcriptRef.current?.contains(selection.anchorNode)) {
        throttledTranscriptSelection()
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      onPause?.(video.currentTime)
    } else {
      video.play()
      onPlay?.()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = value[0]
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleToggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    toggleMute()
  }

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration))
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const setInPointHandler = () => {
    console.log('Setting in point at:', currentTime, 'duration:', duration)
    if (outPoint && currentTime > outPoint) {
      setInOutPoints(currentTime, currentTime)
    } else {
      setInOutPoints(currentTime, outPoint || currentTime)
    }
  }

  const setOutPointHandler = () => {
    console.log('Setting out point at:', currentTime, 'duration:', duration)
    if (inPoint !== null && currentTime > inPoint) {
      setInOutPoints(inPoint, currentTime)
    } else if (inPoint === null) {
      // If no in point, set in point to 0 and out point to current
      setInOutPoints(0, currentTime)
    } else {
      setInOutPoints(inPoint, currentTime)
    }
  }

  const clearSelectionHandler = () => {
    console.log('Clearing selection')
    clearSelection()
  }

  const sendToChat = () => {
    console.log('Send to chat clicked, inPoint:', inPoint, 'outPoint:', outPoint)
    if (inPoint !== null && outPoint !== null) {
      // Send clip info to parent component
      const clipData = {
        inPoint,
        outPoint,
        duration: outPoint - inPoint,
        transcript: `[Video clip from ${formatTime(inPoint)} to ${formatTime(outPoint)}]`
      }
      console.log('Sending clip to chat:', clipData)
      
      // Add clip reference to AI chat via store
      addTranscriptReference({
        text: clipData.transcript,
        startTime: inPoint,
        endTime: outPoint,
        videoId: videoUrl,
      })
      
      // Clear selection after sending
      clearSelectionHandler()
    }
  }

  const sendCurrentTranscriptToChat = () => {
    if (currentTranscriptText) {
      // Send current transcript text to chat as reference via store
      addTranscriptReference({
        text: currentTranscriptText,
        startTime: Math.floor(currentTime),
        endTime: Math.floor(currentTime) + 5,
        videoId: videoUrl,
      })
    }
  }

  const handleTranscriptSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) {
      return
    }

    // Get transcript segments
    const transcriptSegments = [
      { start: 0, end: 5, text: "Welcome to this comprehensive introduction to web development." },
      { start: 5, end: 10, text: "In this course, we're going to explore the fundamental technologies that power the modern web." },
      { start: 10, end: 15, text: "We'll start with HTML, which stands for HyperText Markup Language." },
      { start: 15, end: 20, text: "HTML is the backbone of every webpage and provides the structure and content." },
      { start: 20, end: 25, text: "That browsers can understand and display to users." },
      { start: 25, end: 30, text: "Next, we'll dive into CSS, or Cascading Style Sheets." },
      { start: 30, end: 35, text: "CSS is what makes websites look beautiful and engaging." },
      { start: 35, end: 40, text: "It controls colors, fonts, layouts, animations, and responsive design." },
      { start: 40, end: 45, text: "Across different devices and screen sizes." },
      { start: 45, end: 50, text: "Finally, we'll explore JavaScript, the programming language." },
      { start: 50, end: 55, text: "That brings interactivity to web pages." },
      { start: 55, end: 60, text: "JavaScript allows us to create dynamic user experiences." },
      { start: 60, end: 65, text: "Handle user input, and communicate with servers." },
      { start: 65, end: 70, text: "Throughout this course, you'll build several projects." },
      { start: 70, end: 75, text: "That demonstrate these concepts in action." },
      { start: 75, end: 80, text: "By the end, you'll have the skills needed to create your own websites." },
      { start: 80, end: 85, text: "From scratch using modern web development practices." },
      { start: 85, end: 90, text: "Let's begin our journey into web development." },
      { start: 90, end: 95, text: "Remember, the key to mastering these technologies is practice." },
      { start: 95, end: 100, text: "And patience. Don't be afraid to experiment and make mistakes." },
      { start: 100, end: 105, text: "That's how we learn and grow as developers!" }
    ]

    // Create one continuous text to find selection position
    const fullTranscript = transcriptSegments.map(s => s.text).join(' ')
    
    // Find selection start and end positions in the full text
    const selectionStartIndex = fullTranscript.indexOf(selectedText)
    const selectionEndIndex = selectionStartIndex + selectedText.length

    if (selectionStartIndex === -1) return

    // Calculate timestamps based on character positions
    let currentIndex = 0
    let startTime = 0
    let endTime = 0

    for (const segment of transcriptSegments) {
      const segmentEndIndex = currentIndex + segment.text.length + 1 // +1 for space

      // Find start time
      if (selectionStartIndex >= currentIndex && selectionStartIndex < segmentEndIndex) {
        const positionInSegment = selectionStartIndex - currentIndex
        const segmentProgress = positionInSegment / segment.text.length
        startTime = segment.start + (segmentProgress * (segment.end - segment.start))
      }

      // Find end time
      if (selectionEndIndex > currentIndex && selectionEndIndex <= segmentEndIndex) {
        const positionInSegment = selectionEndIndex - currentIndex
        const segmentProgress = Math.min(positionInSegment / segment.text.length, 1)
        endTime = segment.start + (segmentProgress * (segment.end - segment.start))
      }

      currentIndex = segmentEndIndex
    }

    // Set in/out points on video seeker
    setInOutPoints(startTime, endTime)
    
    // Store selection data for later sending
    setSelectedTranscriptText(selectedText)
    setSelectedTimeRange(startTime, endTime)
    
    console.log(`Selected from ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s: "${selectedText}"`)
  }

  const throttledTranscriptSelection = () => {
    // Clear existing timeout
    if (selectionUpdateRef.current) {
      clearTimeout(selectionUpdateRef.current)
    }
    
    // Set new timeout for smooth updates
    selectionUpdateRef.current = setTimeout(() => {
      handleTranscriptSelection()
    }, 50) // 50ms delay for smooth updates
  }

  const sendSelectedTranscriptToChat = () => {
    if (selectedTranscriptText && selectedStartTime !== null && selectedEndTime !== null) {
      // Send to chat with precise timing via store
      addTranscriptReference({
        text: selectedTranscriptText,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        videoId: videoUrl,
      })
      
      // Clear selection after sending
      clearTranscriptSelection()
    }
  }

  const clearTranscriptSelection = () => {
    setSelectedTranscriptText("")
    setSelectedTimeRange(null, null)
    clearSelection()
    window.getSelection()?.removeAllRanges()
  }


  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/20"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handlePlayPause}
      tabIndex={0}
      role="button"
      aria-label="Video player - Click to play/pause, use keyboard shortcuts for controls"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full pointer-events-none"
      />

      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4">
            <h3 className="text-white text-lg font-medium">{title}</h3>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mb-2 relative">
            {/* Show selection range on slider */}
            {inPoint !== null && outPoint !== null && duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 bg-yellow-500/50 pointer-events-none z-[15] rounded"
                style={{
                  left: `${(inPoint / duration) * 100}%`,
                  width: `${((outPoint - inPoint) / duration) * 100}%`
                }}
              />
            )}
            
            {/* In point marker - larger and more visible */}
            {inPoint !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full pointer-events-none z-[20] ring-2 ring-white shadow-lg"
                style={{ 
                  left: duration > 0 ? `calc(${(inPoint / duration) * 100}% - 8px)` : '0%'
                }}
                title={`In: ${formatTime(inPoint)}`}
              />
            )}
            
            {/* Out point marker - larger and more visible */}
            {outPoint !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full pointer-events-none z-[20] ring-2 ring-white shadow-lg"
                style={{ 
                  left: duration > 0 ? `calc(${(outPoint / duration) * 100}% - 8px)` : '10%'
                }}
                title={`Out: ${formatTime(outPoint)}`}
              />
            )}
            
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full relative z-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Clip Selection Controls */}
              <div className="flex items-center space-x-2 border-l border-white/20 pl-2 ml-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={setInPointHandler}
                    className={cn(
                      "text-white hover:bg-white/20 px-2",
                      inPoint !== null && "bg-green-500/30"
                    )}
                  >
                    <CornerDownLeft className="h-4 w-4 mr-1" />
                    {inPoint !== null ? formatTime(inPoint) : "In"}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={setOutPointHandler}
                    className={cn(
                      "text-white hover:bg-white/20 px-2",
                      outPoint !== null && "bg-red-500/30"
                    )}
                  >
                    <CornerDownRight className="h-4 w-4 mr-1" />
                    {outPoint !== null ? formatTime(outPoint) : "Out"}
                  </Button>
                </div>
                
                {inPoint !== null && outPoint !== null && (
                  <div className="flex items-center space-x-1 border-l border-white/20 pl-2">
                    <span className="text-yellow-400 text-xs font-medium px-2">
                      Range: {formatTime(outPoint - inPoint)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={sendToChat}
                      className="text-white hover:bg-white/20"
                      title="Send clip to AI Chat"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {(inPoint !== null || outPoint !== null) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="text-white hover:bg-white/20"
                    title="Clear Selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Subtitles className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLiveTranscript(!showLiveTranscript)}
                className={cn(
                  "text-white hover:bg-white/20",
                  showLiveTranscript && "bg-white/20"
                )}
                title="Toggle Live Transcript"
              >
                <FileText className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={playbackRate === rate ? "bg-accent" : ""}
                    >
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Transcript Display - Bottom Right Corner */}
      {showLiveTranscript && (
        <div 
          className="absolute bottom-16 right-4 z-20 w-80 h-64"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-black/85 text-white rounded-lg shadow-lg backdrop-blur-sm h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/20 flex-shrink-0">
              <span className="text-xs text-gray-300 font-medium">Live Transcript</span>
              <div className="flex items-center gap-2">
                {selectedTranscriptText && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendSelectedTranscriptToChat}
                      className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                      title="Send Selection to Chat"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTranscriptSelection}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-white/20"
                      title="Clear Selection"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiveTranscript(false)}
                  className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-white/20"
                  title="Close Transcript"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div 
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-3 space-y-2 select-text"
              onMouseUp={handleTranscriptSelection}
              onMouseMove={(e) => {
                // Update selection during drag if mouse is down
                if (e.buttons === 1) { // Left mouse button is down
                  throttledTranscriptSelection()
                }
              }}
              onKeyUp={handleTranscriptSelection}
            >
              {[
                { start: 0, end: 5, timestamp: "0:00", text: "Welcome to this comprehensive introduction to web development." },
                { start: 5, end: 10, timestamp: "0:05", text: "In this course, we're going to explore the fundamental technologies that power the modern web." },
                { start: 10, end: 15, timestamp: "0:10", text: "We'll start with HTML, which stands for HyperText Markup Language." },
                { start: 15, end: 20, timestamp: "0:15", text: "HTML is the backbone of every webpage and provides the structure and content." },
                { start: 20, end: 25, timestamp: "0:20", text: "That browsers can understand and display to users." },
                { start: 25, end: 30, timestamp: "0:25", text: "Next, we'll dive into CSS, or Cascading Style Sheets." },
                { start: 30, end: 35, timestamp: "0:30", text: "CSS is what makes websites look beautiful and engaging." },
                { start: 35, end: 40, timestamp: "0:35", text: "It controls colors, fonts, layouts, animations, and responsive design." },
                { start: 40, end: 45, timestamp: "0:40", text: "Across different devices and screen sizes." },
                { start: 45, end: 50, timestamp: "0:45", text: "Finally, we'll explore JavaScript, the programming language." },
                { start: 50, end: 55, timestamp: "0:50", text: "That brings interactivity to web pages." },
                { start: 55, end: 60, timestamp: "0:55", text: "JavaScript allows us to create dynamic user experiences." },
                { start: 60, end: 65, timestamp: "1:00", text: "Handle user input, and communicate with servers." },
                { start: 65, end: 70, timestamp: "1:05", text: "Throughout this course, you'll build several projects." },
                { start: 70, end: 75, timestamp: "1:10", text: "That demonstrate these concepts in action." },
                { start: 75, end: 80, timestamp: "1:15", text: "By the end, you'll have the skills needed to create your own websites." },
                { start: 80, end: 85, timestamp: "1:20", text: "From scratch using modern web development practices." },
                { start: 85, end: 90, timestamp: "1:25", text: "Let's begin our journey into web development." },
                { start: 90, end: 95, timestamp: "1:30", text: "Remember, the key to mastering these technologies is practice." },
                { start: 95, end: 100, timestamp: "1:35", text: "And patience. Don't be afraid to experiment and make mistakes." },
                { start: 100, end: 105, timestamp: "1:40", text: "That's how we learn and grow as developers!" }
              ].map((segment, index) => {
                const isCurrentSegment = currentTime >= segment.start && currentTime < segment.end
                const isPastSegment = currentTime > segment.end
                
                return (
                  <div 
                    key={index}
                    className={cn(
                      "p-2 rounded-md transition-all duration-300 cursor-pointer hover:bg-white/10",
                      isCurrentSegment && "bg-primary/20 border-l-2 border-primary",
                      isPastSegment && "opacity-60",
                      !isCurrentSegment && !isPastSegment && "opacity-40"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      const video = videoRef.current
                      if (video) {
                        video.currentTime = segment.start
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 font-mono">{segment.timestamp}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Send individual segment to chat
                          // Add transcript segment to chat via store
                          addTranscriptReference({
                            text: segment.text,
                            startTime: segment.start,
                            endTime: segment.end,
                            videoId: videoUrl,
                          })
                        }}
                        className={cn(
                          "h-5 w-5 p-0 hover:bg-primary/20 transition-colors",
                          isCurrentSegment 
                            ? "text-white bg-primary/30 hover:bg-primary/40" 
                            : "text-gray-500 hover:text-white"
                        )}
                        title="Add to Chat"
                      >
                        <Send className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-white">
                      {segment.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}