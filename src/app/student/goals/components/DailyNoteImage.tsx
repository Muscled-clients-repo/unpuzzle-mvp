'use client'

import { useAttachmentCDN } from '@/hooks/use-attachment-cdn'
import { useUITransitionStore } from '@/stores/ui-transition-store'

interface DailyNoteImageProps {
  privateUrl?: string | null // Keep for backwards compatibility but not used
  originalFilename: string
  className?: string
  onClick?: () => void
  attachmentId: string // Now required for CDN URL generation
  fileSize?: number // For file-based UI transition lookup
}

export function DailyNoteImage({ originalFilename, className = '', onClick, attachmentId, fileSize }: DailyNoteImageProps) {
  // TanStack layer: CDN URL with HMAC tokens (CloudFlare Worker)
  const { url: cdnUrl, isLoading, error } = useAttachmentCDN(attachmentId)

  // Zustand layer: UI transition state using file-based lookup
  const transition = useUITransitionStore(state =>
    fileSize ? state.getTransitionByFile(originalFilename, fileSize) : undefined
  )

  // UI Orchestration: Coordinate display logic from multiple layers (no data mixing)
  const displayUrl = transition?.isTransitioning ? transition.blobUrl : cdnUrl
  const shouldShowSkeleton = isLoading && !displayUrl

  console.log('🖼️ DailyNoteImage CDN UI Orchestration:', {
    originalFilename,
    fileSize,
    attachmentId,
    cdnUrl: cdnUrl ? 'PRESENT' : 'MISSING',
    transitionBlobUrl: transition?.blobUrl ? 'PRESENT' : 'MISSING',
    transitionFileKey: transition?.fileKey,
    displayUrl: displayUrl ? 'PRESENT' : 'MISSING',
    shouldShowSkeleton,
    isLoading,
    error
  })

  // Show image from either layer (UI orchestration)
  if (displayUrl) {
    return (
      <img
        src={displayUrl}
        alt={originalFilename}
        className={`object-cover rounded-lg border border-gray-200 dark:border-gray-600 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
        loading="lazy"
        onClick={onClick}
        onError={(e) => {
          console.error('🖼️ DEBUG: Image failed to load:', originalFilename, displayUrl);
        }}
      />
    )
  }

  // Show skeleton only when no URL available and loading
  if (shouldShowSkeleton) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-400 dark:text-gray-500">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || (!displayUrl && !isLoading)) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs text-gray-500">Image not available</div>
          <div className="text-xs text-gray-400">{originalFilename}</div>
          {error && (
            <div className="text-xs text-red-500 mt-1">{error}</div>
          )}
        </div>
      </div>
    )
  }

  return null
}