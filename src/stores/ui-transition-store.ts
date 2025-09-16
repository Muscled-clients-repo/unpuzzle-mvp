'use client'

import { create } from 'zustand'

interface ImageTransition {
  blobUrl: string
  fileKey: string // Using file characteristics instead of attachment ID
  filename: string
  fileSize: number
  isTransitioning: boolean
  createdAt: number
}

interface UITransitionStore {
  imageTransitions: Record<string, ImageTransition>

  // Actions
  setImageTransition: (filename: string, fileSize: number, blobUrl: string) => void
  clearImageTransition: (fileKey: string) => void
  getTransitionByFile: (filename: string, fileSize: number) => ImageTransition | undefined
  cleanupExpiredTransitions: () => void
}

/**
 * Zustand store for UI transition state (Architecture Layer: UI State)
 *
 * Responsibilities:
 * - Manages temporary blob URLs during image upload transitions
 * - Provides UI orchestration data for smooth image transitions
 * - Handles cleanup of expired transition states
 *
 * Architecture Compliance:
 * - Pure UI state (not server data, not form data)
 * - Enables UI orchestration without data mixing
 * - Components read from this + TanStack without merging data
 */
/**
 * Generate file key based on filename and size for consistent mapping
 */
const generateFileKey = (filename: string, fileSize: number): string => {
  return `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${fileSize}`
}

export const useUITransitionStore = create<UITransitionStore>((set, get) => ({
  imageTransitions: {},

  setImageTransition: (filename: string, fileSize: number, blobUrl: string) => {
    const fileKey = generateFileKey(filename, fileSize)
    set(state => ({
      imageTransitions: {
        ...state.imageTransitions,
        [fileKey]: {
          blobUrl,
          fileKey,
          filename,
          fileSize,
          isTransitioning: true,
          createdAt: Date.now()
        }
      }
    }))
  },

  clearImageTransition: (fileKey: string) => {
    set(state => {
      const { [fileKey]: removed, ...rest } = state.imageTransitions
      return { imageTransitions: rest }
    })
  },

  getTransitionByFile: (filename: string, fileSize: number) => {
    const fileKey = generateFileKey(filename, fileSize)
    return get().imageTransitions[fileKey]
  },

  cleanupExpiredTransitions: () => {
    const now = Date.now()
    const maxAge = 30 * 1000 // 30 seconds

    set(state => {
      const activeTransitions = Object.fromEntries(
        Object.entries(state.imageTransitions).filter(
          ([_, transition]) => now - transition.createdAt < maxAge
        )
      )

      return { imageTransitions: activeTransitions }
    })
  }
}))