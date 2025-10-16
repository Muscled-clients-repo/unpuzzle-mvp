/**
 * Format a date as relative time (e.g., "5m ago", "2 hr ago", "3 days ago")
 * - Less than 1 hour: "Xm ago"
 * - 1-24 hours: "X hr ago"
 * - 1-7 days: "X day(s) ago at HH:MM AM/PM"
 * - More than 7 days: "MMM DD, YYYY at HH:MM AM/PM"
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Format time as "HH:MM AM/PM"
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Less than 1 hour
  if (diffMinutes < 60) {
    if (diffMinutes < 1) return 'just now'
    return `${diffMinutes}m ago`
  }

  // 1-24 hours
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`
  }

  // 1-7 days
  if (diffDays <= 7) {
    const time = formatTime(then)
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago at ${time}`
  }

  // More than 7 days - show full date and time
  const formattedDate = then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const time = formatTime(then)

  return `${formattedDate} at ${time}`
}

/**
 * Format timestamp in seconds to MM:SS or HH:MM:SS
 * Examples: 65 -> "1:05", 3661 -> "1:01:01"
 */
export function formatTimestamp(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  // Format seconds with leading zero
  const formattedSecs = secs.toString().padStart(2, '0')

  if (hours > 0) {
    // HH:MM:SS format
    const formattedMins = minutes.toString().padStart(2, '0')
    return `${hours}:${formattedMins}:${formattedSecs}`
  } else {
    // MM:SS format (no leading zero on minutes)
    return `${minutes}:${formattedSecs}`
  }
}
