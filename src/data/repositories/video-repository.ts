import { BaseRepository } from './base-repository'
import type { VideoMetadata, TranscriptSegment, VideoProgress } from '@/types/domain'

export interface VideoRepositoryInterface {
  findById(videoId: string): Promise<VideoMetadata | null>
  findByCourse(courseId: string): Promise<VideoMetadata[]>
  findTranscript(videoId: string): Promise<TranscriptSegment[]>
  findProgress(userId: string, videoId: string): Promise<VideoProgress | null>
  updateProgress(userId: string, videoId: string, progress: Partial<VideoProgress>): Promise<void>
  searchTranscript(videoId: string, query: string): Promise<TranscriptSegment[]>
}

export class VideoRepository extends BaseRepository implements VideoRepositoryInterface {
  constructor() {
    super({
      cacheEnabled: true,
      defaultTTL: 15 * 60 * 1000, // 15 minutes for video metadata
      maxCacheSize: 100
    })
  }

  async findById(videoId: string): Promise<VideoMetadata | null> {
    const cacheKey = this.getCacheKey('video', 'metadata', videoId)
    
    const cached = this.getFromCache<VideoMetadata>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(200)

    // Mock video metadata - in real app would query video database/CDN
    const mockMetadata: VideoMetadata = {
      id: videoId,
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development with hands-on examples',
      duration: 596, // seconds
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://via.placeholder.com/640x360',
      transcript: await this.generateMockTranscript(),
      timestamps: [
        { time: 0, label: 'Introduction', type: 'chapter', description: 'Course overview and objectives' },
        { time: 60, label: 'HTML Basics', type: 'chapter', description: 'Understanding HTML structure' },
        { time: 180, label: 'CSS Fundamentals', type: 'chapter', description: 'Styling with CSS' },
        { time: 300, label: 'JavaScript Intro', type: 'chapter', description: 'Adding interactivity' },
        { time: 450, label: 'Practice Exercise', type: 'exercise', description: 'Build your first webpage' },
      ],
      quality: [
        { quality: '480p', url: 'https://example.com/video-480p.mp4', bitrate: 1000 },
        { quality: '720p', url: 'https://example.com/video-720p.mp4', bitrate: 2500 },
        { quality: '1080p', url: 'https://example.com/video-1080p.mp4', bitrate: 5000 },
      ]
    }

    const transformedMetadata = this.transformVideoMetadata(mockMetadata)
    
    if (this.validateVideoMetadata(transformedMetadata)) {
      this.setCache(cacheKey, transformedMetadata)
      return transformedMetadata
    }

    return null
  }

  async findByCourse(courseId: string): Promise<VideoMetadata[]> {
    const cacheKey = this.getCacheKey('videos', 'course', courseId)
    
    const cached = this.getFromCache<VideoMetadata[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(250)

    // Mock course videos - in real app would query by course ID
    const mockVideos: VideoMetadata[] = [
      {
        id: '1',
        title: 'Course Introduction',
        description: 'Welcome to the course',
        duration: 300,
        videoUrl: 'https://example.com/video1.mp4'
      },
      {
        id: '2', 
        title: 'HTML Fundamentals',
        description: 'Learning HTML basics',
        duration: 450,
        videoUrl: 'https://example.com/video2.mp4'
      },
      {
        id: '3',
        title: 'CSS Styling', 
        description: 'Making pages beautiful',
        duration: 520,
        videoUrl: 'https://example.com/video3.mp4'
      }
    ]

    const transformedVideos = this.transform(mockVideos, this.transformVideoMetadata)
    
    this.setCache(cacheKey, transformedVideos)
    return transformedVideos
  }

  async findTranscript(videoId: string): Promise<TranscriptSegment[]> {
    const cacheKey = this.getCacheKey('transcript', videoId)
    
    const cached = this.getFromCache<TranscriptSegment[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(180)

    const transcript = await this.generateMockTranscript()
    
    // Cache transcripts for longer since they rarely change
    this.setCache(cacheKey, transcript, 60 * 60 * 1000) // 1 hour
    return transcript
  }

  async findProgress(userId: string, videoId: string): Promise<VideoProgress | null> {
    const cacheKey = this.getCacheKey('progress', userId, videoId)
    
    const cached = this.getFromCache<VideoProgress>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(150)

    // Mock progress data - in real app would query user progress database
    const mockProgress: VideoProgress = {
      videoId,
      userId,
      currentTime: Math.floor(Math.random() * 300), // Random progress
      duration: 596,
      completed: false,
      watchedSegments: [
        { start: 0, end: 45 },
        { start: 60, end: 120 }
      ],
      lastWatchedAt: new Date()
    }

    const transformedProgress = this.transformVideoProgress(mockProgress)
    
    // Cache progress for shorter time since it updates frequently
    this.setCache(cacheKey, transformedProgress, 2 * 60 * 1000) // 2 minutes
    return transformedProgress
  }

  async updateProgress(userId: string, videoId: string, progress: Partial<VideoProgress>): Promise<void> {
    await this.delay(100)
    
    // In real app would update database
    console.log('Video progress updated:', { userId, videoId, progress })
    
    // Invalidate cache for this user's progress
    const cacheKey = this.getCacheKey('progress', userId, videoId)
    this.invalidateCache(cacheKey)
  }

  async searchTranscript(videoId: string, query: string): Promise<TranscriptSegment[]> {
    const cacheKey = this.getCacheKey('transcript', 'search', videoId, query.toLowerCase())
    
    const cached = this.getFromCache<TranscriptSegment[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.delay(200)

    const fullTranscript = await this.findTranscript(videoId)
    const searchTerm = query.toLowerCase()
    
    const matchingSegments = fullTranscript.filter(segment =>
      segment.text.toLowerCase().includes(searchTerm)
    )

    // Cache search results for shorter time
    this.setCache(cacheKey, matchingSegments, 5 * 60 * 1000) // 5 minutes
    return matchingSegments
  }

  // Mock transcript generation
  private async generateMockTranscript(): Promise<TranscriptSegment[]> {
    return [
      { start: 0, end: 5, timestamp: "0:00", text: "Welcome to this comprehensive introduction to web development.", confidence: 0.95 },
      { start: 5, end: 10, timestamp: "0:05", text: "In this course, we're going to explore the fundamental technologies that power the modern web.", confidence: 0.93 },
      { start: 10, end: 15, timestamp: "0:10", text: "We'll start with HTML, which stands for HyperText Markup Language.", confidence: 0.96 },
      { start: 15, end: 20, timestamp: "0:15", text: "HTML is the backbone of every webpage and provides the structure and content.", confidence: 0.94 },
      { start: 20, end: 25, timestamp: "0:20", text: "That browsers can understand and display to users.", confidence: 0.92 },
      { start: 25, end: 30, timestamp: "0:25", text: "Next, we'll dive into CSS, or Cascading Style Sheets.", confidence: 0.95 },
      { start: 30, end: 35, timestamp: "0:30", text: "CSS is what makes websites look beautiful and engaging.", confidence: 0.94 },
      { start: 35, end: 40, timestamp: "0:35", text: "It controls colors, fonts, layouts, animations, and responsive design.", confidence: 0.93 },
      { start: 40, end: 45, timestamp: "0:40", text: "Across different devices and screen sizes.", confidence: 0.91 },
      { start: 45, end: 50, timestamp: "0:45", text: "Finally, we'll explore JavaScript, the programming language.", confidence: 0.96 },
      { start: 50, end: 55, timestamp: "0:50", text: "That brings interactivity to web pages.", confidence: 0.94 },
      { start: 55, end: 60, timestamp: "0:55", text: "JavaScript allows us to create dynamic user experiences.", confidence: 0.95 },
      { start: 60, end: 65, timestamp: "1:00", text: "Handle user input, and communicate with servers.", confidence: 0.93 },
    ]
  }

  // Data transformation methods
  private transformVideoMetadata = (metadata: Partial<VideoMetadata>): VideoMetadata => {
    return {
      id: metadata.id || '',
      title: metadata.title || 'Untitled Video',
      description: metadata.description || '',
      duration: Math.max(0, metadata.duration || 0),
      videoUrl: metadata.videoUrl || '',
      thumbnailUrl: metadata.thumbnailUrl,
      transcript: metadata.transcript || [],
      timestamps: metadata.timestamps || [],
      quality: metadata.quality || []
    }
  }

  private transformVideoProgress = (progress: VideoProgress): VideoProgress => {
    return {
      ...progress,
      currentTime: Math.max(0, progress.currentTime),
      duration: Math.max(0, progress.duration),
      completed: progress.currentTime >= progress.duration * 0.9, // 90% watched = completed
      watchedSegments: progress.watchedSegments || []
    }
  }

  // Data validation methods
  private validateVideoMetadata = (metadata: VideoMetadata): boolean => {
    return !!(
      metadata.id &&
      metadata.title &&
      metadata.videoUrl &&
      metadata.duration > 0
    )
  }

  // Cache invalidation methods
  public invalidateVideoCache(videoId: string): void {
    this.invalidateCache(videoId)
  }

  public invalidateProgressCache(userId: string): void {
    this.invalidateCache(`progress:${userId}`)
  }
}

// Export singleton instance
export const videoRepository = new VideoRepository()