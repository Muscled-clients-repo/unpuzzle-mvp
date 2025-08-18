'use client'

// ARCHITECTURE: React integration layer
// Implementation from lines 815-847 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { getVideoEditorInstance } from './VideoEditorSingleton'
import type { VideoEditorCommands } from './commands/VideoEditorCommands'
import type { VideoEditorQueries } from './queries/VideoEditorQueries'

interface VideoEditorContextType {
  commands: VideoEditorCommands
  queries: VideoEditorQueries
}

const VideoEditorContext = createContext<VideoEditorContextType | null>(null)

function useVideoEditorSetup() {
  return useMemo(() => {
    // Use singleton to prevent duplicate initialization in React StrictMode
    const instance = getVideoEditorInstance()
    return { 
      commands: instance.commands, 
      queries: instance.queries 
    }
  }, [])
}

export function VideoEditorProvider({ children }: { children: ReactNode }) {
  const { commands, queries } = useVideoEditorSetup()

  return (
    <VideoEditorContext.Provider value={{ commands, queries }}>
      {children}
    </VideoEditorContext.Provider>
  )
}

export function useVideoEditor() {
  const context = useContext(VideoEditorContext)
  if (!context) {
    throw new Error('useVideoEditor must be used within VideoEditorProvider')
  }
  return context
}