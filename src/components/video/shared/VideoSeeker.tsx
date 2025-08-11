"use client"

import { Slider } from "@/components/ui/slider"
import { useAppStore } from "@/stores/app-store"

interface VideoSeekerProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  videoRef?: HTMLVideoElement | null
}

export function VideoSeeker({ currentTime, duration, onSeek, videoRef }: VideoSeekerProps) {
  const inPoint = useAppStore((state) => state.inPoint)
  const outPoint = useAppStore((state) => state.outPoint)
  const storeDuration = useAppStore((state) => state.duration)
  
  // Use store duration first, then prop, then video element, then fallback
  const actualDuration = storeDuration || duration || videoRef?.duration || 100

  const handleSeek = (value: number[]) => {
    onSeek(value[0])
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative">
      {/* Show selection range on slider */}
      {inPoint !== null && outPoint !== null && actualDuration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 bg-yellow-500/50 pointer-events-none z-[15] rounded"
          style={{
            left: `${(inPoint / actualDuration) * 100}%`,
            width: `${((outPoint - inPoint) / actualDuration) * 100}%`
          }}
        />
      )}
      
      {/* In point marker */}
      {inPoint !== null && actualDuration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-500 rounded-full pointer-events-none z-[20] ring-1 ring-white shadow-lg"
          style={{ 
            left: `calc(${(inPoint / actualDuration) * 100}% - 5px)`
          }}
          title={`In: ${formatTime(inPoint)}`}
        />
      )}
      
      {/* Out point marker */}
      {outPoint !== null && actualDuration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full pointer-events-none z-[20] ring-1 ring-white shadow-lg"
          style={{ 
            left: `calc(${(outPoint / actualDuration) * 100}% - 5px)`
          }}
          title={`Out: ${formatTime(outPoint)}`}
        />
      )}
      
      <Slider
        value={[currentTime]}
        min={0}
        max={actualDuration}
        step={0.1}
        onValueChange={handleSeek}
        className="w-full relative z-0"
      />
    </div>
  )
}