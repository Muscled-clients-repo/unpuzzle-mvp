import { StateCreator } from 'zustand'
import { VideoState, VideoActions } from '@/types/app-types'

// Transcript item interface
export interface TranscriptItem {
  text: string
  start: number
  duration: number
  end?: number
}

// Extended video state for all player needs
export interface ExtendedVideoState extends VideoState {
  isMuted: boolean
  showControls: boolean
  isSelectingRange: boolean
  showLiveTranscript: boolean
  currentTranscriptText: string
  selectedTranscriptText: string
  selectedStartTime: number | null
  selectedEndTime: number | null
  // YouTube transcript state
  transcript: TranscriptItem[]
  isLoadingTranscript: boolean
  transcriptError: string | null
}

// Extended video actions
export interface ExtendedVideoActions extends VideoActions {
  setIsMuted: (isMuted: boolean) => void
  setShowControls: (showControls: boolean) => void
  setIsSelectingRange: (isSelectingRange: boolean) => void
  setShowLiveTranscript: (showLiveTranscript: boolean) => void
  setCurrentTranscriptText: (text: string) => void
  setSelectedTranscriptText: (text: string) => void
  setSelectedTimeRange: (startTime: number | null, endTime: number | null) => void
  togglePlay: () => void
  toggleMute: () => void
  seekTo: (time: number) => void
  // YouTube transcript actions
  fetchYouTubeTranscript: (videoUrl: string) => Promise<void>
  setTranscript: (transcript: TranscriptItem[]) => void
  clearTranscript: () => void
}

export interface VideoSlice extends ExtendedVideoState, ExtendedVideoActions {}

const initialVideoState: ExtendedVideoState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  inPoint: null,
  outPoint: null,
  selectedTranscript: null,
  volume: 1,
  playbackRate: 1,
  isFullscreen: false,
  isMuted: false,
  showControls: true,
  isSelectingRange: false,
  showLiveTranscript: false,
  currentTranscriptText: "",
  selectedTranscriptText: "",
  selectedStartTime: null,
  selectedEndTime: null,
  // YouTube transcript state
  transcript: [],
  isLoadingTranscript: false,
  transcriptError: null,
}

export const createVideoSlice: StateCreator<VideoSlice> = (set, get) => ({
  ...initialVideoState,

  setCurrentTime: (currentTime: number) => 
    set({ currentTime }),

  setDuration: (duration: number) =>
    set({ duration }),

  setIsPlaying: (isPlaying: boolean) =>
    set({ isPlaying }),

  setInOutPoints: (inPoint: number, outPoint: number) => {
    // Ensure inPoint is always less than outPoint
    const validIn = Math.min(inPoint, outPoint)
    const validOut = Math.max(inPoint, outPoint)
    
    console.log('🏪 Store setInOutPoints called:', { 
      original: { inPoint, outPoint },
      validated: { validIn, validOut }
    })
    
    // Force the state update to trigger subscriptions
    set((state) => ({
      ...state,
      inPoint: validIn, 
      outPoint: validOut
    }))
    
    // Verify store was actually updated
    const newState = get()
    console.log('🔍 Store state after set:', { 
      inPoint: newState.inPoint, 
      outPoint: newState.outPoint 
    })
  },

  setSelectedTranscript: (selectedTranscript: VideoState['selectedTranscript']) =>
    set({ selectedTranscript }),

  setVolume: (volume: number) =>
    set({ volume }),

  setPlaybackRate: (playbackRate: number) =>
    set({ playbackRate }),

  setIsFullscreen: (isFullscreen: boolean) =>
    set({ isFullscreen }),

  // New extended actions
  setIsMuted: (isMuted: boolean) =>
    set({ isMuted }),

  setShowControls: (showControls: boolean) =>
    set({ showControls }),

  setIsSelectingRange: (isSelectingRange: boolean) =>
    set({ isSelectingRange }),

  setShowLiveTranscript: (showLiveTranscript: boolean) =>
    set({ showLiveTranscript }),

  setCurrentTranscriptText: (currentTranscriptText: string) =>
    set({ currentTranscriptText }),

  setSelectedTranscriptText: (selectedTranscriptText: string) =>
    set({ selectedTranscriptText }),

  setSelectedTimeRange: (selectedStartTime: number | null, selectedEndTime: number | null) =>
    set({ selectedStartTime, selectedEndTime }),

  togglePlay: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),

  toggleMute: () =>
    set((state) => ({ isMuted: !state.isMuted })),

  seekTo: (time: number) => {
    const { duration } = get()
    const clampedTime = Math.max(0, Math.min(time, duration))
    set({ currentTime: clampedTime })
  },

  clearSelection: () =>
    set({
      inPoint: null,
      outPoint: null,
      selectedTranscript: null,
      selectedTranscriptText: "",
      selectedStartTime: null,
      selectedEndTime: null,
    }),

  resetVideo: () =>
    set(initialVideoState),

  // YouTube transcript actions
  fetchYouTubeTranscript: async (videoUrl: string) => {
    console.log('🎬 Fetching transcript for:', videoUrl)
    
    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : null
    
    console.log('📹 Extracted video ID:', videoId)
    
    if (!videoId) {
      set({ transcriptError: 'Invalid YouTube URL', isLoadingTranscript: false })
      return
    }

    set({ isLoadingTranscript: true, transcriptError: null })

    try {
      // Call our API route to fetch transcript
      console.log('📡 Calling API:', `/api/youtube-transcript?videoId=${videoId}`)
      const response = await fetch(`/api/youtube-transcript?videoId=${videoId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcript')
      }

      const data = await response.json()
      console.log('📝 API response:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Use the transcript data directly from API (already formatted)
      const formattedTranscript = data.transcript || []
      
      console.log('✅ Formatted transcript:', formattedTranscript.length, 'items')

      set({ 
        transcript: formattedTranscript, 
        isLoadingTranscript: false,
        transcriptError: null 
      })
    } catch (error) {
      console.error('❌ Error fetching transcript:', error)
      set({ 
        transcriptError: error instanceof Error ? error.message : 'Failed to load transcript',
        isLoadingTranscript: false,
        transcript: []
      })
    }
  },

  setTranscript: (transcript: TranscriptItem[]) =>
    set({ transcript }),

  clearTranscript: () =>
    set({ transcript: [], transcriptError: null }),
})