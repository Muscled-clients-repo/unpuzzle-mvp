/**
 * Extract duration from a video file
 */
export async function getVideoDuration(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        const duration = video.duration
        
        if (!isNaN(duration)) {
          // Convert seconds to MM:SS or HH:MM:SS format
          const hours = Math.floor(duration / 3600)
          const minutes = Math.floor((duration % 3600) / 60)
          const seconds = Math.floor(duration % 60)
          
          if (hours > 0) {
            resolve(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
          } else {
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`)
          }
        } else {
          resolve('0:00')
        }
      }
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src)
        console.error('Error loading video metadata')
        resolve('0:00')
      }
      
      video.src = URL.createObjectURL(file)
    } catch (error) {
      console.error('Error extracting video duration:', error)
      resolve('0:00')
    }
  })
}

/**
 * Convert duration string (MM:SS or HH:MM:SS) to seconds
 */
export function parseDuration(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}