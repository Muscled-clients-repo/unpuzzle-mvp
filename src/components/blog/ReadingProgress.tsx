"use client"

import { useEffect, useState } from "react"

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scrollTop = window.scrollY
      const progress = (scrollTop / scrollHeight) * 100
      setProgress(progress)
    }

    window.addEventListener("scroll", updateProgress)
    updateProgress() // Initial calculation

    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
      <div
        className="h-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
