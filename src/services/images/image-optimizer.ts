/**
 * Image Optimizer Service
 * Handles image resizing, compression, and format conversion using Sharp
 * Target: <200KB files in WebP format
 */

import sharp from 'sharp'

export interface ImageDimensions {
  width: number
  height: number
}

export interface OptimizedImage {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number // bytes
}

export type ImageType = 'featured' | 'og' | 'content'

// Target specifications from File #1
const IMAGE_SPECS: Record<ImageType, ImageDimensions & { maxSize: number }> = {
  featured: {
    width: 1600,
    height: 900,
    maxSize: 200 * 1024 // 200KB
  },
  og: {
    width: 1200,
    height: 630,
    maxSize: 150 * 1024 // 150KB
  },
  content: {
    width: 1200,
    height: 0, // Maintain aspect ratio
    maxSize: 150 * 1024 // 150KB
  }
}

export class ImageOptimizer {
  /**
   * Optimize image for specific use case
   * Handles resize, compression, and format conversion
   */
  async optimizeImage(
    inputBuffer: Buffer,
    type: ImageType = 'featured'
  ): Promise<OptimizedImage> {
    const spec = IMAGE_SPECS[type]

    try {
      // Start with sharp instance
      let image = sharp(inputBuffer)

      // Get original metadata
      const metadata = await image.metadata()
      console.log('[ImageOptimizer] Original:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: `${(inputBuffer.length / 1024).toFixed(2)}KB`
      })

      // Resize based on type
      if (type === 'content') {
        // Content images: maintain aspect ratio, max width
        image = image.resize({
          width: spec.width,
          height: spec.height,
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true // Don't upscale
        })
      } else {
        // Featured/OG: exact dimensions with cover fit
        image = image.resize({
          width: spec.width,
          height: spec.height,
          fit: 'cover', // Crop to exact dimensions
          position: 'center'
        })
      }

      // Convert to WebP with progressive compression
      // Start with quality 80 and reduce if needed
      let quality = 80
      let buffer: Buffer
      let finalSize: number

      do {
        buffer = await image
          .webp({
            quality,
            effort: 6 // 0-6, higher = better compression but slower
          })
          .toBuffer()

        finalSize = buffer.length

        // If still too large, reduce quality
        if (finalSize > spec.maxSize && quality > 50) {
          quality -= 5
          console.log(`[ImageOptimizer] Reducing quality to ${quality}%...`)
          image = sharp(inputBuffer).resize({
            width: spec.width,
            height: type === 'content' ? undefined : spec.height,
            fit: type === 'content' ? 'inside' : 'cover',
            position: 'center'
          })
        } else {
          break
        }
      } while (quality >= 50)

      // Get final metadata
      const optimizedMetadata = await sharp(buffer).metadata()

      const result: OptimizedImage = {
        buffer,
        width: optimizedMetadata.width || spec.width,
        height: optimizedMetadata.height || spec.height,
        format: 'webp',
        size: finalSize
      }

      console.log('[ImageOptimizer] Optimized:', {
        width: result.width,
        height: result.height,
        format: result.format,
        size: `${(result.size / 1024).toFixed(2)}KB`,
        quality: `${quality}%`,
        compression: `${((1 - result.size / inputBuffer.length) * 100).toFixed(1)}%`
      })

      return result
    } catch (error) {
      console.error('[ImageOptimizer] Error:', error)
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Optimize featured image (1600x900px, <200KB)
   */
  async optimizeFeaturedImage(buffer: Buffer): Promise<OptimizedImage> {
    return this.optimizeImage(buffer, 'featured')
  }

  /**
   * Optimize OG image (1200x630px, <150KB)
   */
  async optimizeOGImage(buffer: Buffer): Promise<OptimizedImage> {
    return this.optimizeImage(buffer, 'og')
  }

  /**
   * Optimize content image (max 1200px width, <150KB, maintain aspect ratio)
   */
  async optimizeContentImage(buffer: Buffer): Promise<OptimizedImage> {
    return this.optimizeImage(buffer, 'content')
  }

  /**
   * Generate multiple responsive sizes (optional feature)
   * Returns buffers for different screen sizes
   */
  async generateResponsiveSizes(
    inputBuffer: Buffer
  ): Promise<{
    large: OptimizedImage
    medium: OptimizedImage
    small: OptimizedImage
  }> {
    const [large, medium, small] = await Promise.all([
      this.resizeToWidth(inputBuffer, 1600),
      this.resizeToWidth(inputBuffer, 1024),
      this.resizeToWidth(inputBuffer, 640)
    ])

    return { large, medium, small }
  }

  /**
   * Resize image to specific width, maintaining aspect ratio
   */
  private async resizeToWidth(buffer: Buffer, width: number): Promise<OptimizedImage> {
    try {
      const resized = await sharp(buffer)
        .resize({
          width,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80, effort: 6 })
        .toBuffer()

      const metadata = await sharp(resized).metadata()

      return {
        buffer: resized,
        width: metadata.width || width,
        height: metadata.height || 0,
        format: 'webp',
        size: resized.length
      }
    } catch (error) {
      throw new Error(`Failed to resize to width ${width}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate image buffer
   * Checks if buffer is valid image data
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata()
      return !!(metadata.width && metadata.height)
    } catch {
      return false
    }
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number
    height: number
    format: string
    size: number
  }> {
    try {
      const metadata = await sharp(buffer).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length
      }
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
