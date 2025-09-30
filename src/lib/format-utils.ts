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