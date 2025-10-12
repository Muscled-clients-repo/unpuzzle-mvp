'use client'

import { useState } from 'react'
import { ExternalLink, Play, Video } from 'lucide-react'
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
  const [showEmbed, setShowEmbed] = useState(true)

  // Extract Loom video ID from URL for embedding
  const getLoomVideoId = (loomUrl: string) => {
    const match = loomUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  const videoId = getLoomVideoId(url)

  return (
    <div className="flex flex-col gap-2">
      {/* Minimalist preview card - like Slack */}
      {showEmbed && videoId ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/30">
          <iframe
            src={`https://www.loom.com/embed/${videoId}`}
            frameBorder="0"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowEmbed(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left group"
        >
          {/* Loom icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-purple-600" />
          </div>

          {/* Video info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Loom Video</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Click to watch recording
            </p>
          </div>

          {/* Play indicator */}
          <div className="flex-shrink-0">
            <Play className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      )}

      {/* Open in Loom link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Open in Loom</span>
      </a>
    </div>
  )
}