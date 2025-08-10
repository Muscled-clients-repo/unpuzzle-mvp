import { ServiceResult } from './types'

// Video service types
export interface VideoMetadata {
  id: string
  title: string
  description: string
  duration: number
  videoUrl: string
  thumbnailUrl?: string
  transcript?: TranscriptSegment[]
  timestamps?: VideoTimestamp[]
  quality?: VideoQuality[]
}

export interface TranscriptSegment {
  start: number
  end: number
  timestamp: string
  text: string
  confidence?: number
}

export interface VideoTimestamp {
  time: number
  label: string
  type: 'chapter' | 'concept' | 'exercise' | 'quiz'
  description?: string
}

export interface VideoQuality {
  quality: '480p' | '720p' | '1080p' | '4K'
  url: string
  bitrate: number
}

export interface VideoProgress {
  videoId: string
  userId: string
  currentTime: number
  duration: number
  completed: boolean
  watchedSegments: Array<{
    start: number
    end: number
  }>
  lastWatchedAt: Date
}

export interface VideoAnalytics {
  videoId: string
  totalViews: number
  averageWatchTime: number
  completionRate: number
  engagementMetrics: {
    pauses: number
    seeks: number
    replays: number
  }
}

// Video service interface
export interface VideoService {
  getVideoMetadata(videoId: string): Promise<ServiceResult<VideoMetadata>>
  getVideoProgress(userId: string, videoId: string): Promise<ServiceResult<VideoProgress>>
  updateVideoProgress(userId: string, videoId: string, currentTime: number, duration: number): Promise<ServiceResult<void>>
  generateTranscript(videoUrl: string): Promise<ServiceResult<TranscriptSegment[]>>
  getVideoAnalytics(videoId: string): Promise<ServiceResult<VideoAnalytics>>
  searchTranscript(videoId: string, query: string): Promise<ServiceResult<TranscriptSegment[]>>
}

// Mock implementation
class MockVideoService implements VideoService {
  private delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getVideoMetadata(videoId: string): Promise<ServiceResult<VideoMetadata>> {
    try {
      await this.delay(200)
      
      // Mock video metadata - would come from backend/CDN
      const mockMetadata: VideoMetadata = {
        id: videoId,
        title: 'Introduction to Web Development',
        description: 'Learn the fundamentals of web development',
        duration: 596, // seconds
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        transcript: [
          { start: 0, end: 5, timestamp: "0:00", text: "Welcome to this comprehensive introduction to web development." },
          { start: 5, end: 10, timestamp: "0:05", text: "In this course, we're going to explore the fundamental technologies that power the modern web." },
          { start: 10, end: 15, timestamp: "0:10", text: "We'll start with HTML, which stands for HyperText Markup Language." },
        ],
        timestamps: [
          { time: 0, label: 'Introduction', type: 'chapter' },
          { time: 60, label: 'HTML Basics', type: 'chapter' },
          { time: 180, label: 'CSS Fundamentals', type: 'chapter' },
        ],
        quality: [
          { quality: '720p', url: 'https://example.com/video-720p.mp4', bitrate: 2500 },
          { quality: '1080p', url: 'https://example.com/video-1080p.mp4', bitrate: 5000 },
        ]
      }
      
      return { data: mockMetadata }
    } catch (error) {
      return { error: 'Failed to fetch video metadata' }
    }
  }

  async getVideoProgress(userId: string, videoId: string): Promise<ServiceResult<VideoProgress>> {
    try {
      await this.delay(150)
      
      const mockProgress: VideoProgress = {
        videoId,
        userId,
        currentTime: 0,
        duration: 596,
        completed: false,
        watchedSegments: [],
        lastWatchedAt: new Date()
      }
      
      return { data: mockProgress }
    } catch (error) {
      return { error: 'Failed to fetch video progress' }
    }
  }

  async updateVideoProgress(userId: string, videoId: string, currentTime: number, duration: number): Promise<ServiceResult<void>> {
    try {
      await this.delay(100)
      
      // Mock progress update
      console.log('Video progress updated:', { userId, videoId, currentTime, duration })
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to update video progress' }
    }
  }

  async generateTranscript(videoUrl: string): Promise<ServiceResult<TranscriptSegment[]>> {
    try {
      await this.delay(2000) // Longer delay for transcript generation
      
      // Mock transcript generation - would use speech-to-text API
      const mockTranscript: TranscriptSegment[] = [
        { start: 0, end: 5, timestamp: "0:00", text: "Generated transcript segment 1", confidence: 0.95 },
        { start: 5, end: 10, timestamp: "0:05", text: "Generated transcript segment 2", confidence: 0.92 },
      ]
      
      return { data: mockTranscript }
    } catch (error) {
      return { error: 'Failed to generate transcript' }
    }
  }

  async getVideoAnalytics(videoId: string): Promise<ServiceResult<VideoAnalytics>> {
    try {
      await this.delay(250)
      
      const mockAnalytics: VideoAnalytics = {
        videoId,
        totalViews: 1250,
        averageWatchTime: 420, // seconds
        completionRate: 0.78,
        engagementMetrics: {
          pauses: 3,
          seeks: 7,
          replays: 2
        }
      }
      
      return { data: mockAnalytics }
    } catch (error) {
      return { error: 'Failed to fetch video analytics' }
    }
  }

  async searchTranscript(videoId: string, query: string): Promise<ServiceResult<TranscriptSegment[]>> {
    try {
      await this.delay(300)
      
      // Mock transcript search
      const allSegments: TranscriptSegment[] = [
        { start: 0, end: 5, timestamp: "0:00", text: "Welcome to web development" },
        { start: 5, end: 10, timestamp: "0:05", text: "HTML is the foundation" },
        { start: 10, end: 15, timestamp: "0:10", text: "CSS styles the web" },
      ]
      
      const results = allSegments.filter(segment =>
        segment.text.toLowerCase().includes(query.toLowerCase())
      )
      
      return { data: results }
    } catch (error) {
      return { error: 'Transcript search failed' }
    }
  }
}

// Export singleton instance
export const videoService: VideoService = new MockVideoService()