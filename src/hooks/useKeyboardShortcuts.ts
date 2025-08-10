import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string | string[]
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
  enableInInput?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

/**
 * Hook for managing keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param options - Options for the hook
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = { enabled: true }
) {
  useEffect(() => {
    if (!options.enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the event target is an input element
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (event.target as HTMLElement)?.tagName
      )

      for (const shortcut of shortcuts) {
        // Skip if in input and not explicitly enabled
        if (isInInput && !shortcut.enableInInput) continue

        // Check if the key matches
        const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key]
        const keyMatches = keys.some(key => {
          if (key.toLowerCase() === event.key.toLowerCase()) return true
          
          // Handle special keys
          if (key === 'Space' && event.key === ' ') return true
          if (key === 'Escape' && event.key === 'Escape') return true
          if (key === 'Enter' && event.key === 'Enter') return true
          
          return false
        })

        if (keyMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          break // Only handle the first matching shortcut
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, options.enabled])
}

/**
 * Common video player keyboard shortcuts
 */
export const videoPlayerShortcuts = {
  playPause: { key: [' ', 'Space'], description: 'Play/Pause' },
  skipBackward: { key: 'ArrowLeft', description: 'Skip backward 5s' },
  skipForward: { key: 'ArrowRight', description: 'Skip forward 5s' },
  volumeUp: { key: 'ArrowUp', description: 'Volume up' },
  volumeDown: { key: 'ArrowDown', description: 'Volume down' },
  mute: { key: ['m', 'M'], description: 'Toggle mute' },
  fullscreen: { key: ['f', 'F'], description: 'Toggle fullscreen' },
  setInPoint: { key: ['i', 'I'], description: 'Set in point' },
  setOutPoint: { key: ['o', 'O'], description: 'Set out point' },
  clearSelection: { key: ['c', 'C'], description: 'Clear selection' },
}

/**
 * Helper to create video player shortcuts
 */
export function createVideoPlayerShortcuts(handlers: {
  onPlayPause?: () => void
  onSkipBackward?: () => void
  onSkipForward?: () => void
  onVolumeUp?: () => void
  onVolumeDown?: () => void
  onMute?: () => void
  onFullscreen?: () => void
  onSetInPoint?: () => void
  onSetOutPoint?: () => void
  onClearSelection?: () => void
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = []

  if (handlers.onPlayPause) {
    shortcuts.push({
      key: videoPlayerShortcuts.playPause.key,
      handler: handlers.onPlayPause,
    })
  }

  if (handlers.onSkipBackward) {
    shortcuts.push({
      key: videoPlayerShortcuts.skipBackward.key,
      handler: handlers.onSkipBackward,
    })
  }

  if (handlers.onSkipForward) {
    shortcuts.push({
      key: videoPlayerShortcuts.skipForward.key,
      handler: handlers.onSkipForward,
    })
  }

  if (handlers.onVolumeUp) {
    shortcuts.push({
      key: videoPlayerShortcuts.volumeUp.key,
      handler: handlers.onVolumeUp,
    })
  }

  if (handlers.onVolumeDown) {
    shortcuts.push({
      key: videoPlayerShortcuts.volumeDown.key,
      handler: handlers.onVolumeDown,
    })
  }

  if (handlers.onMute) {
    shortcuts.push({
      key: videoPlayerShortcuts.mute.key,
      handler: handlers.onMute,
    })
  }

  if (handlers.onFullscreen) {
    shortcuts.push({
      key: videoPlayerShortcuts.fullscreen.key,
      handler: handlers.onFullscreen,
    })
  }

  if (handlers.onSetInPoint) {
    shortcuts.push({
      key: videoPlayerShortcuts.setInPoint.key,
      handler: handlers.onSetInPoint,
    })
  }

  if (handlers.onSetOutPoint) {
    shortcuts.push({
      key: videoPlayerShortcuts.setOutPoint.key,
      handler: handlers.onSetOutPoint,
    })
  }

  if (handlers.onClearSelection) {
    shortcuts.push({
      key: videoPlayerShortcuts.clearSelection.key,
      handler: handlers.onClearSelection,
    })
  }

  return shortcuts
}