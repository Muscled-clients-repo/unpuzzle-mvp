"use client"

import { Eye, ThumbsUp, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SocialProofProps {
  views?: number
  likes?: number
  shares?: number
  className?: string
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

export function SocialProof({ views, likes, shares, className }: SocialProofProps) {
  if (!views && !likes && !shares) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-6 text-sm text-muted-foreground", className)}>
      {views && (
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          <span>{formatNumber(views)} views</span>
        </div>
      )}

      {likes && (
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" />
          <span>{formatNumber(likes)} likes</span>
        </div>
      )}

      {shares && (
        <div className="flex items-center gap-1.5">
          <Share2 className="h-4 w-4" />
          <span>{formatNumber(shares)} shares</span>
        </div>
      )}
    </div>
  )
}
