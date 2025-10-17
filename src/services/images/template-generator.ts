/**
 * Template Generator Service
 * Generates branded OG images and fallback images using Canvas
 * OG Images: 1200x630px for social media
 */

import { createCanvas, registerFont } from 'canvas'
import { blogConfig } from '@/config/blog.config'
import { getGradientColors } from '@/config/gradients'

export interface OGImageOptions {
  title: string
  excerpt?: string
  category?: string
  readingTime?: number
}

export interface BrandingConfig {
  siteName: string
  siteUrl: string
  logoUrl?: string
}

export class TemplateGenerator {
  private branding: BrandingConfig

  constructor(branding?: Partial<BrandingConfig>) {
    // Default branding from blog config
    this.branding = {
      siteName: blogConfig.seo.siteName,
      siteUrl: blogConfig.seo.siteUrl,
      ...branding
    }
  }

  /**
   * Generate OG image (1200x630px) for social media sharing
   * Creates branded template with gradient background and title overlay
   * Uses same gradient system as courses for brand consistency
   */
  async generateOGImage(options: OGImageOptions): Promise<Buffer> {
    const { title, excerpt, category, readingTime } = options

    // Create canvas
    const width = 1200
    const height = 630
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Get gradient colors based on title (same as courses)
    const colors = getGradientColors(title)

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, colors.start)
    gradient.addColorStop(0.5, colors.middle)
    gradient.addColorStop(1, colors.end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Clean gradient - no pattern (professional aesthetic like Vercel/Stripe)

    // Content area padding
    const padding = 80
    const contentWidth = width - (padding * 2)

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 64px sans-serif'
    ctx.textAlign = 'left'

    // Word wrap title
    const titleLines = this.wrapText(ctx, title, contentWidth, 64)
    const maxTitleLines = 3
    const displayTitleLines = titleLines.slice(0, maxTitleLines)

    let y = padding + 80

    displayTitleLines.forEach((line, index) => {
      ctx.fillText(line, padding, y + (index * 80))
    })

    // If title was truncated, add ellipsis
    if (titleLines.length > maxTitleLines) {
      const lastLine = displayTitleLines[displayTitleLines.length - 1]
      const metrics = ctx.measureText(lastLine)
      ctx.fillText('...', padding + metrics.width + 10, y + ((maxTitleLines - 1) * 80))
    }

    y += (displayTitleLines.length * 80) + 40

    // Excerpt removed - OG images work best with just title + metadata

    // Footer with metadata
    const footerY = height - padding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'left'

    // Category and reading time
    const metadata = []
    if (category) metadata.push(category)
    if (readingTime) metadata.push(`${readingTime} min read`)

    if (metadata.length > 0) {
      ctx.fillText(metadata.join(' • '), padding, footerY - 40)
    }

    // Site name
    ctx.fillText(this.branding.siteName, padding, footerY)

    // Convert to buffer
    return canvas.toBuffer('image/png')
  }

  /**
   * Generate featured image template with title overlay
   * Used for blog post featured images
   * Uses same gradient system as courses for brand consistency
   */
  async generateFeaturedTemplate(title: string): Promise<Buffer> {
    const width = 1600
    const height = 900
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Get gradient colors based on title (same as courses)
    const colors = getGradientColors(title)

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, colors.start)
    gradient.addColorStop(0.5, colors.middle)
    gradient.addColorStop(1, colors.end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Clean gradient - no pattern (professional aesthetic like Vercel/Stripe)

    // Title
    const padding = 120
    const contentWidth = width - (padding * 2)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 96px sans-serif'
    ctx.textAlign = 'center'

    // Word wrap title
    const titleLines = this.wrapText(ctx, title, contentWidth, 96)
    const maxLines = 4
    const displayLines = titleLines.slice(0, maxLines)

    // Center vertically
    const totalHeight = displayLines.length * 120
    let y = (height - totalHeight) / 2 + 96

    displayLines.forEach((line, index) => {
      ctx.fillText(line, width / 2, y + (index * 120))
    })

    // Site branding at bottom
    ctx.font = '36px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(this.branding.siteName, width / 2, height - 80)

    return canvas.toBuffer('image/png')
  }

  /**
   * Generate simple placeholder image
   * Uses gradient based on text for consistency
   */
  async generatePlaceholder(text: string = 'Blog Post'): Promise<Buffer> {
    const width = 1600
    const height = 900
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Get gradient colors
    const colors = getGradientColors(text)

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, colors.start)
    gradient.addColorStop(1, colors.end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 72px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, height / 2)

    return canvas.toBuffer('image/png')
  }

  /**
   * Word wrap text to fit within max width
   * Returns array of text lines
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number
  ): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }


  /**
   * Update branding configuration
   */
  setBranding(branding: Partial<BrandingConfig>): void {
    this.branding = { ...this.branding, ...branding }
  }
}
