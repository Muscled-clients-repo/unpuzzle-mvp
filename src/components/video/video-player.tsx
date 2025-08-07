"use client"

import { useRef, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import styles from "./video-player.module.css"
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
      console.log('Video metadata loaded, duration:', video.duration)
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if we're typing in an input field
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      
      if (isInInput) return

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
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
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
    
    // Use video.duration if store duration is not set yet
    const videoDuration = duration || video.duration || 0
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, videoDuration))
    
    video.currentTime = newTime
    setCurrentTime(newTime) // Update Zustand store as well
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
    console.log('Setting in point at:', currentTime, 'store duration:', duration, 'video duration:', videoRef.current?.duration)
    if (outPoint && currentTime > outPoint) {
      setInOutPoints(currentTime, currentTime)
    } else {
      setInOutPoints(currentTime, outPoint || currentTime)
    }
  }

  const setOutPointHandler = () => {
    console.log('Setting out point at:', currentTime, 'store duration:', duration, 'video duration:', videoRef.current?.duration)
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
      
      // Don't clear selection - let user decide when to clear
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
      console.log('No selection range')
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) {
      console.log('No selected text')
      return
    }
    
    console.log('Selected text:', selectedText)

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

    // Try to find which segments contain the selection by checking partial matches
    let startTime = null
    let endTime = null
    let foundStart = false
    let foundEnd = false

    // First, try to find exact match in a single segment
    for (const segment of transcriptSegments) {
      if (segment.text.includes(selectedText)) {
        // Selection is within a single segment
        const index = segment.text.indexOf(selectedText)
        const startProgress = index / segment.text.length
        const endProgress = (index + selectedText.length) / segment.text.length
        startTime = segment.start + (startProgress * (segment.end - segment.start))
        endTime = segment.start + (endProgress * (segment.end - segment.start))
        foundStart = true
        foundEnd = true
        break
      }
    }

    // If not found in single segment, check for cross-segment selection
    if (!foundStart || !foundEnd) {
      // Split selected text into words to find partial matches
      const selectedWords = selectedText.split(/\s+/)
      // Take first word (or first few if available) and last word (or last few)
      const firstWord = selectedWords[0]
      const lastWord = selectedWords[selectedWords.length - 1]
      const firstFewWords = selectedWords.slice(0, Math.min(2, selectedWords.length)).join(' ')
      const lastFewWords = selectedWords.slice(-Math.min(2, selectedWords.length)).join(' ')

      // Find start segment - try with first few words, then just first word
      for (const segment of transcriptSegments) {
        if (!foundStart) {
          let index = segment.text.indexOf(firstFewWords)
          if (index === -1) {
            index = segment.text.indexOf(firstWord)
          }
          if (index !== -1) {
            const progress = index / segment.text.length
            startTime = segment.start + (progress * (segment.end - segment.start))
            foundStart = true
          }
        }
        if (!foundEnd) {
          let index = segment.text.indexOf(lastFewWords)
          if (index === -1) {
            index = segment.text.indexOf(lastWord)
          }
          if (index !== -1) {
            const endIndex = index + (segment.text.indexOf(lastFewWords) !== -1 ? lastFewWords.length : lastWord.length)
            const progress = endIndex / segment.text.length
            endTime = segment.start + (progress * (segment.end - segment.start))
            foundEnd = true
          }
        }
        if (foundStart && foundEnd) break
      }
    }

    // If still not found, use a different approach - check by range selection
    if (!foundStart || !foundEnd) {
      const range = selection.getRangeAt(0)
      const container = transcriptRef.current
      if (container && container.contains(range.commonAncestorContainer)) {
        // Find all transcript segments in DOM
        const segments = container.querySelectorAll('p')
        let firstSegmentIndex = -1
        let lastSegmentIndex = -1
        
        segments.forEach((seg, index) => {
          if (range.intersectsNode(seg)) {
            if (firstSegmentIndex === -1) firstSegmentIndex = index
            lastSegmentIndex = index
          }
        })
        
        if (firstSegmentIndex !== -1 && lastSegmentIndex !== -1) {
          startTime = transcriptSegments[firstSegmentIndex]?.start || 0
          endTime = transcriptSegments[lastSegmentIndex]?.end || transcriptSegments[lastSegmentIndex]?.start + 5
          foundStart = true
          foundEnd = true
        }
      }
    }

    if (!foundStart || !foundEnd || startTime === null || endTime === null) {
      console.log('Could not determine time range for selection')
      return
    }

    // Set in/out points on video seeker
    setInOutPoints(startTime, endTime)
    
    // Store selection data for later sending
    setSelectedTranscriptText(selectedText)
    setSelectedTimeRange(startTime, endTime)
    
    console.log(`Selected from ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s: "${selectedText}"`)
    console.log('Setting selectedTranscriptText to:', selectedText)
    console.log('Current selectedTranscriptText state:', selectedTranscriptText)
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
      
      // Don't clear selection - let user decide when to clear
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
        className="w-full h-full pointer-events-none object-cover"
        style={{ margin: 0, padding: 0 }}
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

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 pt-4">
          <div className="mb-2 relative">
            {/* Show selection range on slider */}
            {inPoint !== null && outPoint !== null && (duration > 0 || videoRef.current?.duration) && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 bg-yellow-500/50 pointer-events-none z-[15] rounded"
                style={{
                  left: `${(inPoint / (duration || videoRef.current?.duration || 1)) * 100}%`,
                  width: `${((outPoint - inPoint) / (duration || videoRef.current?.duration || 1)) * 100}%`
                }}
              />
            )}
            
            {/* In point marker - larger and more visible */}
            {inPoint !== null && (() => {
              const videoDuration = duration || videoRef.current?.duration || 1
              const leftPosition = (inPoint / videoDuration) * 100
              console.log('In marker - inPoint:', inPoint, 'duration:', videoDuration, 'left%:', leftPosition)
              return (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-500 rounded-full pointer-events-none z-[20] ring-1 ring-white shadow-lg"
                  style={{ 
                    left: `calc(${leftPosition}% - 5px)`
                  }}
                  title={`In: ${formatTime(inPoint)}`}
                />
              )
            })()}
            
            {/* Out point marker - larger and more visible */}
            {outPoint !== null && (() => {
              const videoDuration = duration || videoRef.current?.duration || 1
              const leftPosition = (outPoint / videoDuration) * 100
              console.log('Out marker - outPoint:', outPoint, 'duration:', videoDuration, 'left%:', leftPosition)
              return (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full pointer-events-none z-[20] ring-1 ring-white shadow-lg"
                  style={{ 
                    left: `calc(${leftPosition}% - 5px)`
                  }}
                  title={`Out: ${formatTime(outPoint)}`}
                />
              )
            })()}
            
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || videoRef.current?.duration || 100}
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
                      "text-white hover:bg-white/20 px-2 h-8 font-bold",
                      inPoint !== null && "bg-green-500/30 hover:bg-green-500/40"
                    )}
                    title="Set In Point (I)"
                  >
                    <span className="text-sm font-mono">I</span>
                    {inPoint !== null && (
                      <span className="ml-1 text-xs font-normal">{formatTime(inPoint)}</span>
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={setOutPointHandler}
                    className={cn(
                      "text-white hover:bg-white/20 px-2 h-8 font-bold",
                      outPoint !== null && "bg-red-500/30 hover:bg-red-500/40"
                    )}
                    title="Set Out Point (O)"
                  >
                    <span className="text-sm font-mono">O</span>
                    {outPoint !== null && (
                      <span className="ml-1 text-xs font-normal">{formatTime(outPoint)}</span>
                    )}
                  </Button>
                </div>
                
                {inPoint !== null && outPoint !== null && (
                  <div className="flex items-center space-x-1 border-l border-white/20 pl-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendToChat}
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/20 px-2 flex items-center gap-1"
                      title="Send clip to AI Chat"
                    >
                      <Send className="h-3 w-3" />
                      <span className="text-xs">Send to Chat</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelection}
                      className="text-white hover:bg-white/20"
                      title="Clear Selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 font-medium">Live Transcript</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTranscriptText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendSelectedTranscriptToChat}
                    className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 flex items-center gap-1"
                    title="Send Selection to Chat"
                  >
                    <Send className="h-3 w-3" />
                    <span className="text-xs">Send to Chat</span>
                  </Button>
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
              className={cn("flex-1 overflow-y-auto p-3 space-y-2 select-text", styles.transcriptContainer)}
              onMouseUp={() => {
                setTimeout(handleTranscriptSelection, 10) // Small delay to ensure selection is complete
              }}
              onTouchEnd={() => {
                setTimeout(handleTranscriptSelection, 10) // For mobile devices
              }}
              onMouseMove={(e) => {
                // Update selection during drag if mouse is down
                if (e.buttons === 1) { // Left mouse button is down
                  throttledTranscriptSelection()
                }
              }}
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
                    <div className="mb-1">
                      <span className="text-xs text-gray-400 font-mono">{segment.timestamp}</span>
                    </div>
                    <p className={cn("text-xs leading-relaxed text-white", styles.transcriptText)}>
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