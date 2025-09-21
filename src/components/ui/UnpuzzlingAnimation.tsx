"use client"

import { useState, useEffect } from "react"

interface UnpuzzlingAnimationProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

// Puzzle piece SVG component
const PuzzlePiece = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM18 6H16.5C16.2 6 16 6.2 16 6.5C16 7.3 15.3 8 14.5 8S13 7.3 13 6.5C13 6.2 12.8 6 12.5 6H11.5C11.2 6 11 6.2 11 6.5C11 7.3 10.3 8 9.5 8S8 7.3 8 6.5C8 6.2 7.8 6 7.5 6H6C4.9 6 4 6.9 4 8V9.5C4 9.8 4.2 10 4.5 10C5.3 10 6 10.7 6 11.5S5.3 13 4.5 13C4.2 13 4 13.2 4 13.5V15.5C4 15.8 4.2 16 4.5 16C5.3 16 6 16.7 6 17.5S5.3 19 4.5 19C4.2 19 4 19.2 4 19.5V20C4 21.1 4.9 22 6 22H7.5C7.8 22 8 21.8 8 21.5C8 20.7 8.7 20 9.5 20S11 20.7 11 21.5C11 21.8 11.2 22 11.5 22H12.5C12.8 22 13 21.8 13 21.5C13 20.7 13.7 20 14.5 20S16 20.7 16 21.5C16 21.8 16.2 22 16.5 22H18C19.1 22 20 21.1 20 20V19.5C20 19.2 19.8 19 19.5 19C18.7 19 18 18.3 18 17.5S18.7 16 19.5 16C19.8 16 20 15.8 20 15.5V13.5C20 13.2 19.8 13 19.5 13C18.7 13 18 12.3 18 11.5S18.7 10 19.5 10C19.8 10 20 9.8 20 9.5V8C20 6.9 19.1 6 18 6Z"
      fill="currentColor"
    />
  </svg>
)

export function UnpuzzlingAnimation({
  className = "",
  size = 'md',
  message = "Unpuzzling..."
}: UnpuzzlingAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState(0)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  // Cycle through animation phases
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4)
    }, 800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Puzzle pieces container */}
      <div className="relative flex items-center justify-center">
        {/* Piece 1 - Top Left */}
        <PuzzlePiece
          className={`absolute text-blue-500 transition-all duration-500 ease-in-out ${
            animationPhase >= 1 ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-60 -translate-x-4 -translate-y-2'
          }`}
          style={{
            width: iconSizes[size],
            height: iconSizes[size],
            transform: `translate(${animationPhase >= 1 ? '-6px' : '-16px'}, ${animationPhase >= 1 ? '-6px' : '-12px'}) rotate(${animationPhase >= 1 ? '0deg' : '-10deg'})`
          }}
        />

        {/* Piece 2 - Top Right */}
        <PuzzlePiece
          className={`absolute text-purple-500 transition-all duration-500 ease-in-out ${
            animationPhase >= 2 ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-60 translate-x-4 -translate-y-2'
          }`}
          style={{
            width: iconSizes[size],
            height: iconSizes[size],
            transform: `translate(${animationPhase >= 2 ? '6px' : '16px'}, ${animationPhase >= 2 ? '-6px' : '-12px'}) rotate(${animationPhase >= 2 ? '0deg' : '10deg'})`
          }}
        />

        {/* Piece 3 - Bottom Left */}
        <PuzzlePiece
          className={`absolute text-green-500 transition-all duration-500 ease-in-out ${
            animationPhase >= 3 ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-60 -translate-x-4 translate-y-2'
          }`}
          style={{
            width: iconSizes[size],
            height: iconSizes[size],
            transform: `translate(${animationPhase >= 3 ? '-6px' : '-16px'}, ${animationPhase >= 3 ? '6px' : '12px'}) rotate(${animationPhase >= 3 ? '0deg' : '-10deg'})`
          }}
        />

        {/* Piece 4 - Bottom Right (final piece) */}
        <PuzzlePiece
          className={`absolute text-orange-500 transition-all duration-700 ease-in-out ${
            animationPhase >= 3 ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : 'opacity-60 translate-x-4 translate-y-2 scale-90'
          }`}
          style={{
            width: iconSizes[size],
            height: iconSizes[size],
            transform: `translate(${animationPhase >= 3 ? '6px' : '16px'}, ${animationPhase >= 3 ? '6px' : '12px'}) rotate(${animationPhase >= 3 ? '0deg' : '10deg'})`
          }}
        />

        {/* Center glow effect when pieces connect */}
        {animationPhase >= 3 && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 rounded-full opacity-20 animate-pulse"
               style={{ width: iconSizes[size] * 1.5, height: iconSizes[size] * 1.5 }} />
        )}
      </div>

      {/* Text with pulse animation */}
      <span className={`${sizeClasses[size]} font-medium text-muted-foreground animate-pulse`}>
        {message}
      </span>

      {/* Animated dots */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-1 h-1 bg-current rounded-full transition-opacity duration-300 ${
              (animationPhase + i) % 4 < 2 ? 'opacity-100' : 'opacity-30'
            }`}
            style={{
              animationDelay: `${i * 200}ms`
            }}
          />
        ))}
      </div>
    </div>
  )
}