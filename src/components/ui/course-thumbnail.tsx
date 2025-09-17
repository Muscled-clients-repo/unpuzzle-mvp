import React from 'react'
import { cn } from '@/lib/utils'

interface CourseThumbnailProps {
  title: string
  className?: string
}

// Predefined gradient combinations for consistent, beautiful thumbnails
const gradientVariants = [
  'from-blue-500 via-purple-500 to-pink-500',
  'from-green-400 via-blue-500 to-purple-600',
  'from-yellow-400 via-red-500 to-pink-500',
  'from-purple-400 via-pink-500 to-red-500',
  'from-blue-400 via-cyan-500 to-teal-500',
  'from-indigo-500 via-purple-500 to-blue-600',
  'from-orange-400 via-red-500 to-pink-600',
  'from-emerald-400 via-cyan-500 to-blue-500',
  'from-rose-400 via-pink-500 to-purple-600',
  'from-amber-400 via-orange-500 to-red-500',
  'from-teal-400 via-emerald-500 to-green-600',
  'from-violet-400 via-purple-500 to-indigo-600'
]

// Simple hash function to consistently assign gradients based on title
function getGradientFromTitle(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % gradientVariants.length
  return gradientVariants[index]
}

export function CourseThumbnail({ title, className }: CourseThumbnailProps) {
  const gradientClass = getGradientFromTitle(title)

  return (
    <div className={cn("aspect-video relative overflow-hidden", className)}>
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br",
        gradientClass
      )} />

      {/* Subtle Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.3) 2px, transparent 0),
                           radial-gradient(circle at 75px 75px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '100px 100px'
        }}
      />

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Course Title */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <h3 className="text-white font-bold text-lg md:text-xl text-center leading-tight drop-shadow-lg line-clamp-3">
          {title}
        </h3>
      </div>

      {/* Subtle Bottom Gradient for Polish */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  )
}