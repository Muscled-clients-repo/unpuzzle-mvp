'use server'

import { backblazeService } from '@/services/video/backblaze-service'

/**
 * Generate a signed URL for private video access
 */
export async function generateSignedUrlAction(privateUrl: string) {
  try {
    console.log('[SIGNED_URL_ACTION] Generating signed URL for:', privateUrl)
    
    if (!privateUrl || !privateUrl.startsWith('private:')) {
      throw new Error('Invalid private URL format')
    }
    
    const result = await backblazeService.getSignedUrlFromPrivate(privateUrl, 2) // 2 hours expiration
    
    console.log('[SIGNED_URL_ACTION] Signed URL generated successfully')
    
    return {
      success: true,
      data: result
    }
    
  } catch (error) {
    console.error('[SIGNED_URL_ACTION] Failed to generate signed URL:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signed URL'
    }
  }
}

/**
 * Generate signed URLs for multiple private URLs
 */
export async function generateBatchSignedUrlsAction(privateUrls: string[]) {
  try {
    console.log('[SIGNED_URL_ACTION] Generating batch signed URLs for:', privateUrls.length, 'files')
    
    const results = await Promise.all(
      privateUrls.map(async (privateUrl) => {
        try {
          const result = await backblazeService.getSignedUrlFromPrivate(privateUrl, 2)
          return {
            privateUrl,
            success: true,
            data: result
          }
        } catch (error) {
          return {
            privateUrl,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate signed URL'
          }
        }
      })
    )
    
    console.log('[SIGNED_URL_ACTION] Batch signed URLs generated')
    
    return {
      success: true,
      data: results
    }
    
  } catch (error) {
    console.error('[SIGNED_URL_ACTION] Failed to generate batch signed URLs:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate batch signed URLs'
    }
  }
}