'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface ReflectionCDNUrl {
  url: string // Full CDN URL with HMAC token
  expiresAt: number // Timestamp when token expires
}

/**
 * Generate CDN URL for reflection (voice memo/loom)
 * Uses HMAC token authentication (not useSignedUrl)
 */
export async function generateReflectionCDNUrl(
  reflectionId: string,
  expirationHours: number = 6
): Promise<ReflectionCDNUrl | null> {
  console.log('🔍 generateReflectionCDNUrl called:', { reflectionId, expirationHours })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('❌ generateReflectionCDNUrl: No user authenticated')
    return null
  }

  try {
    const serviceClient = createServiceClient()

    // Get the reflection file_url
    const { data: reflection, error } = await (serviceClient as any)
      .from('reflections')
      .select('file_url, user_id')
      .eq('id', reflectionId)
      .single()

    console.log('🔍 Reflection query result:', { reflection, error: error?.message })

    if (error || !reflection) {
      console.log('❌ generateReflectionCDNUrl: Reflection not found')
      return null
    }

    // Verify user has access to this reflection
    if (reflection.user_id !== user.id) {
      console.log('❌ generateReflectionCDNUrl: Access denied')
      return null
    }

    // Use backblaze service to generate CDN URL with HMAC token
    const { backblazeService } = await import('@/services/video/backblaze-service')
    const result = await backblazeService.getSignedUrlFromPrivate(reflection.file_url, expirationHours)

    console.log('🔍 Backblaze service result:', {
      result: !!result,
      hasUrl: !!result?.url,
      hasExpiresAt: !!result?.expiresAt,
      urlPreview: result?.url ? result.url.substring(0, 100) + '...' : 'NO URL',
      isCDNUrl: result?.url?.includes('cdn.unpuzzle.co') || false
    })

    if (!result || !result.url) {
      console.log('❌ generateReflectionCDNUrl: Failed to get CDN URL from backblaze service')
      return null
    }

    return result

  } catch (error) {
    console.error('Generate reflection CDN URL error:', error)
    return null
  }
}
