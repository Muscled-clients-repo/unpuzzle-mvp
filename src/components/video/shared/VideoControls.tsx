"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  FileText,
  Send,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores/app-store"

interface VideoControlsProps {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  playbackRate: number
  currentTime: number
  duration: number
  showLiveTranscript: boolean
  onPlayPause: () => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onPlaybackRateChange: (rate: number) => void
  onSkip: (seconds: number) => void
  onFullscreen: () => void
  onTranscriptToggle: () => void
  onSetInPoint?: () => void
  onSetOutPoint?: () => void
  onSendToChat?: () => void
  onClearSelection?: () => void
  inPoint?: number | null
  outPoint?: number | null
}

export function VideoControls({
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  currentTime,
  duration,
  showLiveTranscript,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onSkip,
  onFullscreen,
  onTranscriptToggle,
  onSetInPoint,
  onSetOutPoint,
  onSendToChat,
  onClearSelection,
  inPoint: inPointProp,
  outPoint: outPointProp,
}: VideoControlsProps) {
  // Use props if provided, otherwise fall back to store (for backwards compatibility)
  const storeInPoint = useAppStore((state) => state.inPoint)
  const storeOutPoint = useAppStore((state) => state.outPoint)
  const inPoint = inPointProp !== undefined ? inPointProp : storeInPoint
  const outPoint = outPointProp !== undefined ? outPointProp : storeOutPoint
  
  // console.log('🎮 VideoControls render - inPoint:', inPoint, 'outPoint:', outPoint, 'currentTime:', currentTime, 'duration:', duration, 'render timestamp:', Date.now())

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="text-white hover:bg-white/20"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSkip(-5)}
          className="text-white hover:bg-white/20"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSkip(5)}
          className="text-white hover:bg-white/20"
        >
          <SkipForward className="h-5 w-5" />
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMuteToggle}
            className="text-white hover:bg-white/20"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <div className="w-20">
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => onVolumeChange(value[0])}
              className="w-full"
            />
          </div>
        </div>

        <span className="text-white text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {/* Clip Selection Controls */}
        <div className="flex items-center space-x-2 border-l border-white/20 pl-2 ml-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetInPoint}
              className={cn(
                "text-white hover:bg-white/20 px-2 h-8 font-bold",
                inPoint !== null && "bg-green-500/30 hover:bg-green-500/40"
              )}
              title="Set In Point (I)"
            >
              <span className="text-sm font-mono">I</span>
              {inPoint !== null ? (
                <span className="ml-1 text-xs font-normal">{formatTime(inPoint)}</span>
              ) : outPoint !== null ? (
                <span className="ml-1 text-xs font-normal">--</span>
              ) : null}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetOutPoint}
              className={cn(
                "text-white hover:bg-white/20 px-2 h-8 font-bold",
                outPoint !== null && "bg-red-500/30 hover:bg-red-500/40"
              )}
              title="Set Out Point (O)"
            >
              <span className="text-sm font-mono">O</span>
              {outPoint !== null ? (
                <span className="ml-1 text-xs font-normal">{formatTime(outPoint)}</span>
              ) : inPoint !== null ? (
                <span className="ml-1 text-xs font-normal">--</span>
              ) : null}
            </Button>
          </div>
          
          {inPoint !== null && outPoint !== null && (
            <div className="flex items-center space-x-1 border-l border-white/20 pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSendToChat}
                className="text-green-400 hover:text-green-300 hover:bg-green-500/20 px-2 flex items-center gap-1"
                title="Send clip to AI Chat"
              >
                <Send className="h-4 w-4" />
                <span className="text-xs">Send to Chat</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearSelection}
                className="text-white hover:bg-white/20"
                title="Clear Selection"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onTranscriptToggle}
          className={cn(
            "text-white hover:bg-white/20",
            showLiveTranscript && "bg-white/20"
          )}
          title="Toggle Live Transcript"
        >
          <FileText className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <DropdownMenuItem
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={playbackRate === rate ? "bg-accent" : ""}
              >
                {rate}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={onFullscreen}
          className="text-white hover:bg-white/20"
        >
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}