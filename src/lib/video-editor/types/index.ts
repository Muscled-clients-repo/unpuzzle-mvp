// ARCHITECTURE: Following Principle 1 - SSOT (lines 10-13)
// All types are defined in ONE place only

export interface VideoSegment {
  id: string
  startTime: number
  duration: number
  videoUrl: string
  name: string
  trackIndex: number
}

export interface RecordingResult {
  blob: Blob
  url: string
  duration: number
  startTime: number
  endTime: number
}