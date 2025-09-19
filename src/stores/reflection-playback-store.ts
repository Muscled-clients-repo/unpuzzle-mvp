import { create } from 'zustand'

interface ReflectionPlaybackState {
  // Current playback state
  currentlyPlaying: string | null  // reflection ID
  isPlaying: boolean
  currentTime: number
  duration: number

  // Actions
  startPlayback: (reflectionId: string) => void
  stopPlayback: () => void
  setPlaybackTime: (time: number) => void
  setDuration: (duration: number) => void
}

export const useReflectionPlaybackStore = create<ReflectionPlaybackState>((set) => ({
  // State
  currentlyPlaying: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  // Actions
  startPlayback: (reflectionId: string) =>
    set({
      currentlyPlaying: reflectionId,
      isPlaying: true,
      currentTime: 0
    }),

  stopPlayback: () =>
    set({
      currentlyPlaying: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0
    }),

  setPlaybackTime: (time: number) =>
    set({ currentTime: time }),

  setDuration: (duration: number) =>
    set({ duration }),
}))