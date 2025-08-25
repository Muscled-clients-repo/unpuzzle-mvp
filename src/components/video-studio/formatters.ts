import { frameToTime } from '@/lib/video-editor/utils'
import { FPS } from '@/lib/video-editor/types'

export const formatFrame = (frame: number) => {
  const seconds = frameToTime(frame)
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor(frame % FPS)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}