"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores/app-store"
import { useTranscriptQuery, findActiveSegment } from "@/hooks/use-transcript-queries"

interface TranscriptSegment {
  start: number
  end: number
  timestamp: string
  text: string
}

interface TranscriptPanelProps {
  currentTime: number
  videoId: string
  onClose: () => void
  onSeek: (time: number) => void
  onUpdateSegment?: (inPoint: number, outPoint: number) => void
}

export function TranscriptPanel({ currentTime, videoId, onClose, onSeek, onUpdateSegment }: TranscriptPanelProps) {
  const transcriptRef = useRef<HTMLDivElement>(null)

  // TanStack Query for server data (Layer 1: Server State)
  const { data: transcriptData, isLoading, error } = useTranscriptQuery(videoId)


  // Zustand UI state (Layer 3: UI State)
  const highlightedSegmentIndex = useAppStore((state) => state.highlightedSegmentIndex)
  const autoScrollTranscript = useAppStore((state) => state.autoScrollTranscript)
  const setHighlightedSegmentIndex = useAppStore((state) => state.setHighlightedSegmentIndex)

  // Legacy state for backwards compatibility
  const selectedTranscriptText = useAppStore((state) => state.selectedTranscriptText)
  const selectedStartTime = useAppStore((state) => state.selectedStartTime)
  const selectedEndTime = useAppStore((state) => state.selectedEndTime)

  // Process transcript data from TanStack Query
  const transcriptSegments: TranscriptSegment[] = transcriptData?.hasTranscript && transcriptData.transcript?.segments && Array.isArray(transcriptData.transcript.segments)
    ? transcriptData.transcript.segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        timestamp: `${Math.floor(segment.start / 60)}:${(segment.start % 60).toFixed(0).padStart(2, '0')}`,
        text: segment.text
      }))
    : transcriptData?.hasTranscript && transcriptData.transcript?.segments?.segments && Array.isArray(transcriptData.transcript.segments.segments)
    ? transcriptData.transcript.segments.segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        timestamp: `${Math.floor(segment.start / 60)}:${(segment.start % 60).toFixed(0).padStart(2, '0')}`,
        text: segment.text
      }))
    : transcriptData?.hasTranscript && transcriptData.transcript?.text
    ? [{
        start: 0,
        end: 9999,
        timestamp: "0:00",
        text: transcriptData.transcript.text
      }]
    : []

  // Find active segment for highlighting
  const activeSegmentIndex = findActiveSegment(transcriptSegments, currentTime)


  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScrollTranscript && activeSegmentIndex !== null && transcriptRef.current) {
      const activeElement = transcriptRef.current.children[activeSegmentIndex] as HTMLElement
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentIndex, autoScrollTranscript])

  // Update highlighted segment in UI state
  useEffect(() => {
    if (activeSegmentIndex !== highlightedSegmentIndex) {
      setHighlightedSegmentIndex(activeSegmentIndex)
    }
  }, [activeSegmentIndex, highlightedSegmentIndex, setHighlightedSegmentIndex])

  const handleTranscriptSelection = () => {
    console.log('🎯 [SM] handleTranscriptSelection called!')

    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0) {
      console.log('❌ [SM] No selection or no ranges')
      return
    }

    const selectedText = selection.toString().trim()
    console.log('📋 [SM] Selected text:', `"${selectedText}"`)

    if (!selectedText) {
      console.log('❌ [SM] No selected text')
      return
    }

    // Clean the selected text to remove timestamps and get actual words
    const cleanedText = selectedText
      .replace(/\d+:\d+/g, '') // Remove timestamps like "0:03"
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()

    const selectedWords = cleanedText.split(/\s+/).filter(word => word.length > 0)
    console.log('🧹 [SM] Cleaned selected words:', selectedWords)

    if (selectedWords.length === 0) {
      console.log('❌ [SM] No valid words found after cleaning')
      return
    }

    const firstWord = selectedWords[0]
    const lastWord = selectedWords[selectedWords.length - 1]
    console.log('🔍 [SM] Looking for first word:', firstWord, 'and last word:', lastWord)

    // Find start and end times for the selected text
    let startTime = null
    let endTime = null
    let foundStart = false
    let foundEnd = false

    // Try to find exact match in a single segment first
    for (const segment of transcriptSegments) {
      if (segment.text.includes(selectedText)) {
        const startIndex = segment.text.indexOf(selectedText)
        const endIndex = startIndex + selectedText.length

        const startProgress = startIndex / segment.text.length
        const endProgress = endIndex / segment.text.length

        startTime = segment.start + (startProgress * (segment.end - segment.start))
        endTime = segment.start + (endProgress * (segment.end - segment.start))

        foundStart = true
        foundEnd = true
        console.log('✅ [SM] Found text in single segment:', segment.timestamp, 'start:', startTime, 'end:', endTime)
        break
      }
    }

    // If not found in single segment, find start and end across segments
    if (!foundStart) {
      // Find start time from first word
      for (const segment of transcriptSegments) {
        if (segment.text.toLowerCase().includes(firstWord.toLowerCase())) {
          const index = segment.text.toLowerCase().indexOf(firstWord.toLowerCase())
          const progress = index / segment.text.length
          startTime = segment.start + (progress * (segment.end - segment.start))
          foundStart = true
          console.log('✅ [SM] Found first word in segment:', segment.timestamp, 'startTime:', startTime)
          break
        }
      }

      // Find end time from last word (search backwards for better accuracy)
      for (let i = transcriptSegments.length - 1; i >= 0; i--) {
        const segment = transcriptSegments[i]
        if (segment.text.toLowerCase().includes(lastWord.toLowerCase())) {
          const index = segment.text.toLowerCase().lastIndexOf(lastWord.toLowerCase())
          const endIndex = index + lastWord.length
          const progress = endIndex / segment.text.length
          endTime = segment.start + (progress * (segment.end - segment.start))
          foundEnd = true
          console.log('✅ [SM] Found last word in segment:', segment.timestamp, 'endTime:', endTime)
          break
        }
      }
    }

    if (startTime !== null && endTime !== null && onUpdateSegment) {
      console.log('🎯 [SM] Dispatching UPDATE_SEGMENT action:', { startTime, endTime })

      // Use state machine approach - single atomic action
      onUpdateSegment(startTime, endTime)

      console.log('✅ [SM] Segment update dispatched successfully!')
    } else {
      console.log('❌ [SM] Could not determine start/end times or handler not available')
    }
  }

  const sendSelectedToChat = () => {
    const store = useAppStore.getState()
    if (selectedTranscriptText && selectedStartTime !== null && selectedEndTime !== null) {
      store.addTranscriptReference({
        text: selectedTranscriptText,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        videoId: videoId,
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading transcript...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Unable to load transcript</p>
                <p className="text-xs text-muted-foreground/70">{error.message}</p>
              </div>
            </div>
          ) : transcriptSegments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No transcript available</p>
            </div>
          ) : (
            transcriptSegments.map((segment, index) => {
            const isCurrentSegment = activeSegmentIndex === index
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