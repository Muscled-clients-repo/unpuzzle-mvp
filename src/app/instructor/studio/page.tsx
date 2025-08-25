"use client"

import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

// Dynamically import the VideoStudio component
const VideoStudio = dynamic(
  () => import("@/components/video-studio/VideoStudio").then(mod => ({ 
    default: mod.VideoStudio 
  })),
  { 
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner />
      </div>
    ),
    ssr: false // Disable SSR for studio as it uses browser APIs
  }
)

export default function StudioPage() {
  return (
    <div className="fixed inset-0">
      <VideoStudio />
    </div>
  )
}