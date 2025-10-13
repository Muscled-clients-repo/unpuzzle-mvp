"use client"

import { useState } from "react"
import { Target, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { CheckpointEditorSidebar } from "./CheckpointEditorSidebar"
import { StudentJourneySidebar } from "./StudentJourneySidebar"
import type { VideoPlayerCoreRef } from "../core/VideoPlayerCore"

interface InstructorVideoSidebarProps {
  videoId: string
  currentVideoTime: number
  videoPlayerRef: React.RefObject<VideoPlayerCoreRef>
}

export function InstructorVideoSidebar({
  videoId,
  currentVideoTime,
  videoPlayerRef
}: InstructorVideoSidebarProps) {
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'students'>('checkpoints')

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header with Tab Navigation */}
      <div className="border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex">
          {[
            { key: 'checkpoints', label: 'Checkpoints', icon: Target },
            { key: 'students', label: 'Student Journey', icon: Users }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'checkpoints' | 'students')}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative flex-1",
                activeTab === key
                  ? "text-primary bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'checkpoints' ? (
          <CheckpointEditorSidebar
            videoId={videoId}
            currentVideoTime={currentVideoTime}
            videoPlayerRef={videoPlayerRef}
          />
        ) : (
          <StudentJourneySidebar
            videoId={videoId}
            currentVideoTime={currentVideoTime}
          />
        )}
      </div>
    </div>
  )
}
