import { StateCreator } from 'zustand'
import { VideoState, VideoActions } from '@/types/app-types'

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
  showLiveTranscript: true,
  currentTranscriptText: "",
  selectedTranscriptText: "",
  selectedStartTime: null,
  selectedEndTime: null,
}

export const createVideoSlice: StateCreator<VideoSlice> = (set, get) => ({
  ...initialVideoState,

  setCurrentTime: (currentTime: number) => 
    set({ currentTime }),

  setDuration: (duration: number) =>
    set({ duration }),

  setIsPlaying: (isPlaying: boolean) =>
    set({ isPlaying }),

  setInOutPoints: (inPoint: number, outPoint: number) =>
    set({ inPoint, outPoint }),

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
})