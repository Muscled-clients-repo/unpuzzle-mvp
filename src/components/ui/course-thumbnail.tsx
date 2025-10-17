import React from 'react'
import { cn } from '@/lib/utils'
import { getGradientTailwind } from '@/config/gradients'

interface CourseThumbnailProps {
  title: string
  className?: string
}

export function CourseThumbnail({ title, className }: CourseThumbnailProps) {
  const gradientClass = getGradientTailwind(title)

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