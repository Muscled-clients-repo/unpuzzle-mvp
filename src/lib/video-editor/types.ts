// Simple types for video editor
export interface Clip {
  id: string
  url: string              // Blob URL from recording
  startFrame: number       // Position on timeline (frames)
  durationFrames: number   // Clip length (frames)
  sourceInFrame?: number   // Start frame within source video (for trims)
  sourceOutFrame?: number  // End frame within source video (for trims)
  thumbnailUrl?: string    // Optional preview
}

export interface EditorState {
  clips: Clip[]
  currentFrame: number
  isPlaying: boolean
  isRecording: boolean
  totalFrames: number
}

export const FPS = 30 // Standard web video frame rate