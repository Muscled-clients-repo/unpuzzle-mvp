/**
 * Utility functions for formatting media file information
 */

/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return 'N/A'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  // Short videos (< 1 hour): "5:30" or "25:45"
  if (hours === 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Long videos (≥ 1 hour): "1h 20m" or "2h 45m"
  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return 'N/A'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  // Format to 1 decimal place for sizes >= 1KB, otherwise show whole bytes
  const formatted = unitIndex === 0
    ? size.toString()
    : size.toFixed(1)

  return `${formatted} ${units[unitIndex]}`
}

/**
 * Format duration for video player display (always shows seconds)
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (HH:MM:SS or MM:SS)
 */
export function formatPlayerDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format date to relative time string
 * @param dateString - ISO date string
 * @returns Relative time string (e.g. "today", "yesterday", "3 days ago", or actual date)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  // Reset time to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffTime = today.getTime() - compareDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays === 2) return '2 days ago'
  if (diffDays === 3) return '3 days ago'
  if (diffDays === 4) return '4 days ago'
  if (diffDays === 5) return '5 days ago'
  if (diffDays === 6) return '6 days ago'
  if (diffDays === 7) return 'a week ago'

  // More than a week: show actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
  })
}