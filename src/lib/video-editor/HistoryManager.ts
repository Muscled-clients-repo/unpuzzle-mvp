import { Clip } from './types'

// Lightweight history manager for undo/redo
// Aligned with Simple Architecture principles (~150 lines)

interface HistoryEntry {
  clips: Clip[]
  totalFrames: number
  description: string
  timestamp: number
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private maxHistorySize = 50 // Reasonable limit to prevent memory issues
  
  // Save current state to history
  saveState(clips: Clip[], totalFrames: number, description: string): void {
    
    // Check if this state is different from the last one
    const lastEntry = this.undoStack[this.undoStack.length - 1]
    if (lastEntry) {
      const lastClipState = JSON.stringify(lastEntry.clips.map(c => ({
        id: c.id,
        startFrame: c.startFrame,
        duration: c.durationFrames,
        sourceIn: c.sourceInFrame,
        sourceOut: c.sourceOutFrame
      })))
      const currentClipState = JSON.stringify(clips.map(c => ({
        id: c.id,
        startFrame: c.startFrame,
        duration: c.durationFrames,
        sourceIn: c.sourceInFrame,
        sourceOut: c.sourceOutFrame
      })))
      
      if (lastClipState === currentClipState && lastEntry.description === description) {
        return // Skip exact duplicates (caused by React StrictMode in dev)
      }
    }
    
    // Create deep copy of clips to prevent reference issues
    const entry: HistoryEntry = {
      clips: clips.map(clip => ({ ...clip })),
      totalFrames,
      description,
      timestamp: Date.now()
    }
    
    this.undoStack.push(entry)
    
    // Limit stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    
    // Clear redo stack when new action is performed
    this.redoStack = []
  }
  
  // Get previous state
  undo(): HistoryEntry | null {
    if (this.undoStack.length <= 1) return null // Need at least 2 entries
    
    // Pop current state and move to redo stack
    const currentState = this.undoStack.pop()
    if (currentState) {
      this.redoStack.push(currentState)
    }
    
    // Return previous state
    return this.undoStack[this.undoStack.length - 1] || null
  }
  
  // Get next state
  redo(): HistoryEntry | null {
    const nextState = this.redoStack.pop()
    if (nextState) {
      this.undoStack.push(nextState)
      return nextState
    }
    return null
  }
  
  // Check if operations are available
  canUndo(): boolean {
    return this.undoStack.length > 1
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0
  }
  
  // Get descriptions for UI
  getUndoDescription(): string | null {
    if (this.undoStack.length <= 1) return null
    return this.undoStack[this.undoStack.length - 1].description
  }
  
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null
    return this.redoStack[this.redoStack.length - 1].description
  }
  
  // Clear all history
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
  
  // Initialize with starting state
  initialize(clips: Clip[], totalFrames: number): void {
    this.clear()
    this.saveState(clips, totalFrames, 'Initial state')
  }
}