"use client"

import { useState } from "react"
import { StudentVideoPlayerV2 } from "@/components/video/student/StudentVideoPlayerV2"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft, Share2, CheckCircle, ArrowRight } from "lucide-react"

export default function VideoV2DemoPage() {
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Demo video data - React Hooks Tutorial
  const demoVideo = {
    videoUrl: "https://www.youtube.com/watch?v=TNhaISOUy6Q",
    title: "Introduction to React Hooks - useState, useEffect, and More",
    videoId: "demo-video-1"
  }
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header - Matching the original /learn/[id] page */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Free
                  </Badge>
                  Standalone Lesson
                </h2>
                <p className="text-sm text-muted-foreground">
                  React • JavaScript • Web Development
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </>
                )}
              </Button>
              <Button asChild>
                <Link href="/course/react-fundamentals">
                  Unlock Full Course
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player V2 - Takes remaining height */}
      <div className="flex-1 min-h-0">
        <StudentVideoPlayerV2 
          videoUrl={demoVideo.videoUrl}
          title={demoVideo.title}
          videoId={demoVideo.videoId}
          onTimeUpdate={(time) => console.log("Demo: Time update", time)}
          onPause={(time) => console.log("Demo: Paused at", time)}
          onPlay={() => console.log("Demo: Playing")}
          onEnded={() => console.log("Demo: Video ended")}
        />
      </div>
    </div>
  )
}