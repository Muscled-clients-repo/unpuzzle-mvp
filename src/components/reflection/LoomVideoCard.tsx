'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoomVideoCardProps {
  url: string
  timestamp: number
  isOwn?: boolean // If this is the user's own reflection
}

export function LoomVideoCard({
  url,
  timestamp,
  isOwn = true
}: LoomVideoCardProps) {
  const [showPreview, setShowPreview] = useState(false)

  // Extract Loom video ID from URL for embedding
  const getLoomVideoId = (loomUrl: string) => {
    const match = loomUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  // Format video timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const videoId = getLoomVideoId(url)

  return (
    <div className={cn(
      "flex flex-col gap-3 p-3 rounded-lg border",
      isOwn
        ? "bg-blue-500/10 border-blue-500/20"
        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    )}>
      {/* Header with video info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className={cn(
            "h-4 w-4",
            isOwn ? "text-blue-600" : "text-gray-600"
          )} />
          <span className={cn(
            "text-sm font-medium",
            isOwn ? "text-blue-900 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"
          )}>
            Loom Video
          </span>
        </div>
        <span className={cn(
          "text-xs",
          isOwn ? "text-blue-600" : "text-gray-600"
        )}>
          at {formatTimestamp(timestamp)}
        </span>
      </div>

      {/* Video preview or thumbnail */}
      {showPreview && videoId ? (
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <iframe
            src={`https://www.loom.com/embed/${videoId}`}
            frameBorder="0"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <div
          className="aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setShowPreview(true)}
        >
          <div className="text-center">
            <Play className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click to preview video
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!showPreview && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="flex-1"
          >
            <Play className="h-3 w-3 mr-1" />
            Preview
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(url, '_blank')}
          className="flex-1"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in Loom
        </Button>
      </div>
    </div>
  )
}