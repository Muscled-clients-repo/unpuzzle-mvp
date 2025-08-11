"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores/app-store"

interface TranscriptSegment {
  start: number
  end: number
  timestamp: string
  text: string
}

interface TranscriptPanelProps {
  currentTime: number
  videoUrl: string
  onClose: () => void
  onSeek: (time: number) => void
}

export function TranscriptPanel({ currentTime, videoUrl, onClose, onSeek }: TranscriptPanelProps) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  
  // console.log('📺 TranscriptPanel rendering!', { currentTime, videoUrl })
  
  // Use selectors for reading state
  const selectedTranscriptText = useAppStore((state) => state.selectedTranscriptText)
  const selectedStartTime = useAppStore((state) => state.selectedStartTime)
  const selectedEndTime = useAppStore((state) => state.selectedEndTime)
  const transcript = useAppStore((state) => state.transcript)
  const isLoadingTranscript = useAppStore((state) => state.isLoadingTranscript)
  const transcriptError = useAppStore((state) => state.transcriptError)
  
  // Debug log
  console.log('📜 TranscriptPanel state:', {
    transcriptLength: transcript.length,
    isLoading: isLoadingTranscript,
    error: transcriptError
  })

  // Use YouTube transcript if available, otherwise use mock data
  const transcriptSegments: TranscriptSegment[] = transcript.length > 0 
    ? transcript.map(item => ({
        start: item.start,
        end: item.end || item.start + item.duration,
        timestamp: `${Math.floor(item.start / 60)}:${(item.start % 60).toFixed(0).padStart(2, '0')}`,
        text: item.text
      }))
    : [
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
  ]

  const handleTranscriptSelection = () => {
    console.log('🎯 handleTranscriptSelection called!')
    
    const selection = window.getSelection()
    
    if (!selection || selection.rangeCount === 0) {
      console.log('❌ No selection or no ranges')
      return
    }

    const selectedText = selection.toString().trim()
    console.log('📋 Selected text:', `"${selectedText}"`)
    
    if (!selectedText) {
      console.log('❌ No selected text')
      return
    }

    // Get fresh store state
    const store = useAppStore.getState()
    const currentPlayheadTime = store.currentTime
    console.log('⏰ Current playhead time:', currentPlayheadTime)

    // Find which segments contain the selection
    let startTime = null
    let foundStart = false

    // Try to find exact match in a single segment first
    for (const segment of transcriptSegments) {
      if (segment.text.includes(selectedText)) {
        const index = segment.text.indexOf(selectedText)
        const startProgress = index / segment.text.length
        startTime = segment.start + (startProgress * (segment.end - segment.start))
        foundStart = true
        console.log('✅ Found text in segment:', segment.timestamp, 'startTime:', startTime)
        break
      }
    }

    // If not found in single segment, check for cross-segment selection
    if (!foundStart) {
      const selectedWords = selectedText.split(/\s+/)
      const firstWord = selectedWords[0]

      for (const segment of transcriptSegments) {
        if (segment.text.includes(firstWord)) {
          const index = segment.text.indexOf(firstWord)
          const progress = index / segment.text.length
          startTime = segment.start + (progress * (segment.end - segment.start))
          foundStart = true
          console.log('✅ Found first word in segment:', segment.timestamp, 'startTime:', startTime)
          break
        }
      }
    }

    if (startTime !== null) {
      console.log('🎯 Setting in/out points:', startTime, 'to', currentPlayheadTime)
      
      // Call store method directly
      store.setInOutPoints(startTime, currentPlayheadTime)
      store.setSelectedTranscriptText(selectedText)
      store.setSelectedTimeRange(startTime, currentPlayheadTime)
      
      console.log('✅ Store updated successfully')
    } else {
      console.log('❌ Could not determine start time for selection')
    }
  }

  const sendSelectedToChat = () => {
    const store = useAppStore.getState()
    if (selectedTranscriptText && selectedStartTime !== null && selectedEndTime !== null) {
      store.addTranscriptReference({
        text: selectedTranscriptText,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        videoId: videoUrl,
      })
    }
  }

  const clearTranscriptSelection = () => {
    const store = useAppStore.getState()
    store.setSelectedTranscriptText("")
    store.setSelectedTimeRange(null, null)
    store.clearSelection()
    window.getSelection()?.removeAllRanges()
  }

  return (
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
                onClick={sendSelectedToChat}
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
              onClick={onClose}
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
          onMouseUp={() => {
            console.log('🖱️ Mouse up event fired!')
            setTimeout(handleTranscriptSelection, 10)
          }}
          onTouchEnd={() => {
            console.log('👆 Touch end event fired!')
            setTimeout(handleTranscriptSelection, 10)
          }}
          onMouseDown={() => console.log('🖱️ Mouse down event fired!')}
        >
          {isLoadingTranscript ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading transcript...</p>
              </div>
            </div>
          ) : transcriptError ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Unable to load transcript</p>
                <p className="text-xs text-muted-foreground/70">{transcriptError}</p>
              </div>
            </div>
          ) : transcriptSegments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No transcript available</p>
            </div>
          ) : (
            transcriptSegments.map((segment, index) => {
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
                  onSeek(segment.start)
                }}
              >
                <div className="mb-1">
                  <span className="text-xs text-gray-400 font-mono">{segment.timestamp}</span>
                </div>
                <p className="text-xs leading-relaxed text-white select-text">
                  {segment.text}
                </p>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}