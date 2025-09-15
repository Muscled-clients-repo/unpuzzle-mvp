'use client'

import { useSignedUrl } from '@/hooks/use-signed-url'

interface DailyNoteImageProps {
  privateUrl: string | null
  originalFilename: string
  className?: string
  onClick?: () => void
}

export function DailyNoteImage({ privateUrl, originalFilename, className = '', onClick }: DailyNoteImageProps) {
  const { url: signedUrl, isLoading, error } = useSignedUrl(privateUrl)
  
  // Debug logging
  console.log('🖼️ DailyNoteImage Debug:', { privateUrl, originalFilename, signedUrl, isLoading, error })

  if (isLoading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-2xl mb-1">⏳</div>
          <div className="text-xs text-gray-500">Loading image...</div>
        </div>
      </div>
    )
  }

  if (error || !signedUrl) {
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

  return (
    <img
      src={signedUrl}
      alt={originalFilename}
      className={`object-cover rounded-lg border border-gray-200 dark:border-gray-600 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      loading="lazy"
      onClick={onClick}
      onError={(e) => {
        console.error('🖼️ DEBUG: Signed URL Image failed to load:', originalFilename, signedUrl);
      }}
    />
  )
}