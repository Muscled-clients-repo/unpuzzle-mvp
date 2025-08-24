// Frame-based utility functions
import { FPS } from './types'

export const timeToFrame = (seconds: number): number => {
  return Math.round(seconds * FPS)
}

export const frameToTime = (frame: number): number => {
  return frame / FPS
}