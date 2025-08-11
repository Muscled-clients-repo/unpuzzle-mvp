"use client"

import { useAppStore } from "@/stores/app-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Clock } from "lucide-react"

interface VideoSelectorProps {
  courseId: string
  selectedVideoId?: string
  onVideoSelect: (videoId: string) => void
  placeholder?: string
}

export function VideoSelector({ 
  courseId, 
  selectedVideoId, 
  onVideoSelect, 
  placeholder = "Select a video" 
}: VideoSelectorProps) {
  const { courses } = useAppStore()
  
  // Find the current course
  const course = courses.find(c => c.id === courseId)
  
  // Mock videos for development/fallback
  const mockVideos = [
    { id: 'v1', title: 'React Hooks Introduction', duration: '12:34' },
    { id: 'v2', title: 'useState Deep Dive', duration: '15:22' },
    { id: 'v3', title: 'useEffect Patterns', duration: '18:45' },
    { id: 'v4', title: 'useCallback vs useMemo', duration: '14:12' },
    { id: 'v5', title: 'Custom Hooks Patterns', duration: '20:30' }
  ]
  
  // Use course videos if available, otherwise use mock videos
  const videosToUse = course?.videos?.length > 0 ? course.videos : mockVideos
  
  if (!videosToUse || videosToUse.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No videos available" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={selectedVideoId} onValueChange={onVideoSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-w-[400px]">
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            <span className="font-medium">All Videos</span>
            <Badge variant="outline" className="text-xs">
              {videosToUse.length} videos
            </Badge>
          </div>
        </SelectItem>
        
        <div className="my-1 h-px bg-border" />
        
        {videosToUse.map((video, index) => (
          <SelectItem key={video.id} value={video.id}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span className="truncate flex-1">{video.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {video.duration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {video.duration}
                  </div>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}