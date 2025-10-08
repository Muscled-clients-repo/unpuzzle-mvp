/**
 * SimpleCanvasRenderer: Draw video frames to canvas for preview
 *
 * This is the Canva approach - much simpler than WebCodecs:
 * - Use hidden video elements as sources
 * - Draw current frame to visible canvas
 * - Single output = no dual video bugs
 */

export class SimpleCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', {
      alpha: false, // No transparency needed
      desynchronized: true, // Better performance, allow async rendering
      willReadFrequently: false, // We're only drawing, not reading
    })

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas')
    }

    this.ctx = ctx

    // Disable image smoothing for better performance (especially in Firefox)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'low' // Use low quality for better performance

    // Set default canvas size
    this.canvas.width = 1920
    this.canvas.height = 1080

    // Fill with black
    this.clear()
  }

  /**
   * Render current video frame to canvas
   * Called every animation frame during playback
   */
  renderVideoFrame(video: HTMLVideoElement | null): void {
    if (!video) {
      return
    }

    // Check if video is ready (readyState >= 2 means we have current frame)
    if (video.readyState < 2) {
      return
    }

    // Check if video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    // Update canvas size to match video if needed
    if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
      this.canvas.width = video.videoWidth
      this.canvas.height = video.videoHeight
    }

    // Draw current video frame to canvas (no need to clear, video will overwrite)
    try {
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)
    } catch (err) {
      console.error('🎨 Failed to draw video frame:', err)
    }
  }

  /**
   * Clear canvas to black
   */
  clear(): void {
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Show loading message
   */
  showLoading(): void {
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = '#666666'
    this.ctx.font = '16px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2)
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }
}
