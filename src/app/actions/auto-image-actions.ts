'use server'

import { ImageOptimizer } from '@/services/images/image-optimizer'
import { TemplateGenerator } from '@/services/images/template-generator'
import { BackblazeService } from '@/services/video/backblaze-service'
import { createClient } from '@/lib/supabase/server'
import { generateCDNUrlWithToken, extractFilePathFromPrivateUrl } from '@/services/security/hmac-token-service'
import type { Database } from '@/types/supabase'
import { revalidatePath } from 'next/cache'

export interface AutoImageResult {
  success: boolean
  featuredImageUrl?: string
  ogImageUrl?: string
  error?: string
}

/**
 * Generate CDN URL from Backblaze upload result
 */
function generateCDNUrl(fileId: string, fileName: string): string | null {
  const privateUrl = `private:${fileId}:${fileName}`
  const cdnBaseUrl = 'https://cdn.unpuzzle.co'
  const hmacSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

  if (!hmacSecret) {
    console.warn('⚠️  HMAC secret not configured, cannot generate CDN URL')
    return null
  }

  try {
    const filePath = extractFilePathFromPrivateUrl(privateUrl)
    return generateCDNUrlWithToken(cdnBaseUrl, filePath, hmacSecret)
  } catch (error) {
    console.error('❌ Error generating CDN URL:', error)
    return null
  }
}

/**
 * Save media file to database
 */
async function saveMediaFile(params: {
  fileName: string
  originalName: string
  fileSize: number
  fileId: string
  fileUrl: string
  cdnUrl: string | null
  userId: string
  category: 'blog-featured' | 'blog-og'
}): Promise<string | null> {
  try {
    const supabase = await createClient()

    const mediaFileData: Database['public']['Tables']['media_files']['Insert'] = {
      name: params.fileName,
      original_name: params.originalName,
      file_type: 'image',
      mime_type: 'image/webp',
      file_size: params.fileSize,
      backblaze_file_id: params.fileId,
      backblaze_url: params.fileUrl,
      cdn_url: params.cdnUrl,
      uploaded_by: params.userId,
      category: params.category,
      status: 'active'
    }

    const { data, error } = await supabase
      .from('media_files')
      .insert(mediaFileData)
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to save media file:', error)
      return null
    }

    console.log(`💾 ${params.category} saved to database:`, data.id)
    return data.id
  } catch (error) {
    console.error('❌ Save media file error:', error)
    return null
  }
}

/**
 * Auto-generate template images for a blog post
 * Creates: Featured Image (1600x900) + OG Card (1200x630)
 * Uses shared gradient system for brand consistency
 */
export async function autoGenerateImagesForPost(postId: string): Promise<AutoImageResult> {
  try {
    console.log('🎨 Starting template generation for post:', postId)

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get blog post (direct query to avoid author relationship schema errors)
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories (id, name, slug, description, color, created_at)
      `)
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return {
        success: false,
        error: 'Blog post not found'
      }
    }

    console.log('📝 Post title:', post.title)

    // Initialize services
    const imageOptimizer = new ImageOptimizer()
    const templateGenerator = new TemplateGenerator()
    const backblazeService = new BackblazeService()

    let featuredImageUrl: string | undefined
    let ogImageUrl: string | undefined

    // Step 1: Generate Featured Image Template (1600x900)
    console.log('🎨 Generating featured image template...')
    try {
      const featuredBuffer = await templateGenerator.generateFeaturedTemplate(post.title)

      // Optimize featured image
      console.log('⚙️  Optimizing featured image...')
      const optimized = await imageOptimizer.optimizeFeaturedImage(featuredBuffer)

      // Upload to Backblaze
      console.log('☁️  Uploading featured image to Backblaze...')
      const fileName = `blog/${Date.now()}_featured_${post.slug}.webp`
      const blob = new Blob([optimized.buffer], { type: 'image/webp' })
      const file = new File([blob], fileName, { type: 'image/webp' })

      const uploadResult = await backblazeService.uploadVideo(file, fileName)

      // Generate CDN URL
      const cdnUrl = generateCDNUrl(uploadResult.fileId, uploadResult.fileName)

      if (cdnUrl) {
        featuredImageUrl = cdnUrl

        // Save to media_files table
        await saveMediaFile({
          fileName: uploadResult.fileName,
          originalName: fileName,
          fileSize: optimized.size,
          fileId: uploadResult.fileId,
          fileUrl: uploadResult.fileUrl,
          cdnUrl,
          userId: user.id,
          category: 'blog-featured'
        })

        console.log('✅ Featured image uploaded:', cdnUrl.substring(0, 80) + '...')
      }
    } catch (error) {
      console.error('⚠️  Featured image generation error:', error)
    }

    // Step 2: Generate OG Template Image (1200x630)
    console.log('🎨 Generating OG template image...')
    try {
      const ogBuffer = await templateGenerator.generateOGImage({
        title: post.title,
        category: post.blog_categories?.name,
        readingTime: post.reading_time || undefined
      })

      // Optimize OG image
      console.log('⚙️  Optimizing OG image...')
      const optimizedOG = await imageOptimizer.optimizeOGImage(ogBuffer)

      // Upload to Backblaze
      console.log('☁️  Uploading OG image to Backblaze...')
      const ogFileName = `blog/${Date.now()}_og_${post.slug}.webp`
      const ogBlob = new Blob([optimizedOG.buffer], { type: 'image/webp' })
      const ogFile = new File([ogBlob], ogFileName, { type: 'image/webp' })

      const ogUploadResult = await backblazeService.uploadVideo(ogFile, ogFileName)
      const ogCdnUrl = generateCDNUrl(ogUploadResult.fileId, ogUploadResult.fileName)

      if (ogCdnUrl) {
        ogImageUrl = ogCdnUrl

        // Save to media_files table
        await saveMediaFile({
          fileName: ogUploadResult.fileName,
          originalName: ogFileName,
          fileSize: optimizedOG.size,
          fileId: ogUploadResult.fileId,
          fileUrl: ogUploadResult.fileUrl,
          cdnUrl: ogCdnUrl,
          userId: user.id,
          category: 'blog-og'
        })

        console.log('✅ OG image uploaded:', ogCdnUrl.substring(0, 80) + '...')
      }
    } catch (error) {
      console.error('⚠️  OG image generation error:', error)
    }

    // Step 3: Update blog post with image URLs
    if (featuredImageUrl || ogImageUrl) {
      console.log('💾 Updating blog post with image URLs...')

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          featured_image_url: featuredImageUrl || post.featured_image_url,
          og_image_url: ogImageUrl || post.og_image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)

      if (updateError) {
        console.error('⚠️  Failed to update post:', updateError)
      } else {
        console.log('✅ Blog post updated with generated images')
      }

      // Revalidate paths
      revalidatePath('/admin/blog')
      revalidatePath(`/admin/blog/${postId}`)
      revalidatePath('/blog') // Revalidate blog listing page
      if (post.slug) {
        revalidatePath(`/blog/${post.slug}`)
      }
    }

    return {
      success: true,
      featuredImageUrl,
      ogImageUrl
    }
  } catch (error) {
    console.error('❌ Auto-generate images failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate images'
    }
  }
}

/**
 * Regenerate images (if user doesn't like the result)
 * Same as auto-generate since templates are deterministic based on title
 */
export async function regenerateImagesForPost(postId: string): Promise<AutoImageResult> {
  console.log('🔄 Regenerating images for post:', postId)
  return autoGenerateImagesForPost(postId)
}

/**
 * Bulk generate images for multiple posts
 * Useful for existing posts without images
 */
export async function bulkGenerateImages(postIds: string[]): Promise<{
  success: boolean
  results: Array<{ postId: string; success: boolean; error?: string }>
}> {
  console.log(`🚀 Bulk generating images for ${postIds.length} posts...`)

  const results = []

  // Process in parallel since templates are fast (no external API)
  const promises = postIds.map(async (postId) => {
    const result = await autoGenerateImagesForPost(postId)
    return {
      postId,
      success: result.success,
      error: result.error
    }
  })

  const batchResults = await Promise.all(promises)
  results.push(...batchResults)

  const successCount = results.filter(r => r.success).length
  console.log(`✅ Bulk generation complete: ${successCount}/${postIds.length} successful`)

  return {
    success: true,
    results
  }
}
