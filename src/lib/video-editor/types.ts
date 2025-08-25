// Simple types for video editor
export interface Clip {
  id: string
  url: string              // Blob URL from recording
  trackIndex: number       // Track number (0 = Video 1, 1 = Video 2, etc.)
  startFrame: number       // Position on timeline (frames)
  durationFrames: number   // Clip length (frames)
  originalDurationFrames?: number // Original full duration before any trims
  sourceInFrame?: number   // Start frame within source video (for trims)
  sourceOutFrame?: number  // End frame within source video (for trims)
  thumbnailUrl?: string    // Optional preview
}

export interface Track {
  id: string
  index: number
  name: string
  type: 'video' | 'audio'
  visible: boolean
  locked: boolean
}

export interface EditorState {
  clips: Clip[]
  tracks: Track[]
  currentFrame: number
  isPlaying: boolean
  isRecording: boolean
  totalFrames: number
}

export const FPS = 30 // Standard web video frame rate
export const DEFAULT_TRACK_HEIGHT = 80 // Height of each track in pixels