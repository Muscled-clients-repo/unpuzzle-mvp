import { useState, useEffect, useCallback, useMemo } from 'react'
import { generateSignedUrlAction } from '@/app/actions/signed-url-actions'

// Global cache for signed URLs to prevent duplicate API calls
const signedUrlCache = new Map<string, { url: string, expiresAt: number }>()

interface SignedUrlState {
  url: string | null
  isLoading: boolean
  error: string | null
  expiresAt: number | null
}

interface UseSignedUrlReturn extends SignedUrlState {
  refresh: () => Promise<void>
  isExpired: boolean
  isNearExpiry: boolean
  timeUntilExpiry: number | null
}

/**
 * Hook for managing signed URLs with automatic refresh
 * @param privateUrl - The private URL format: "private:fileId:fileName"
 * @param refreshBeforeMinutes - Minutes before expiry to auto-refresh (default: 30)
 */
export function useSignedUrl(
  privateUrl: string | null, 
  refreshBeforeMinutes: number = 30
): UseSignedUrlReturn {
  const [state, setState] = useState<SignedUrlState>({
    url: null,
    isLoading: false,
    error: null,
    expiresAt: null
  })

  // Calculate expiration status
  const { isExpired, isNearExpiry, timeUntilExpiry } = useMemo(() => {
    if (!state.expiresAt) {
      return { isExpired: false, isNearExpiry: false, timeUntilExpiry: null }
    }

    const now = Date.now()
    const timeLeft = state.expiresAt - now
    const refreshThreshold = refreshBeforeMinutes * 60 * 1000 // Convert to milliseconds

    return {
      isExpired: timeLeft <= 0,
      isNearExpiry: timeLeft <= refreshThreshold && timeLeft > 0,
      timeUntilExpiry: timeLeft > 0 ? timeLeft : 0
    }
  }, [state.expiresAt, refreshBeforeMinutes])

  // Generate signed URL
  const generateUrl = useCallback(async (url: string) => {
    // Check cache first
    const cached = signedUrlCache.get(url)
    const now = Date.now()

    if (cached && cached.expiresAt > now + (refreshBeforeMinutes * 60 * 1000)) {
      console.log('[USE_SIGNED_URL] Using cached signed URL for:', url)
      setState({
        url: cached.url,
        isLoading: false,
        error: null,
        expiresAt: cached.expiresAt
      })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('[USE_SIGNED_URL] Generating signed URL for:', url)

      const result = await generateSignedUrlAction(url)
      
      if (result.success && result.data) {
        // Cache the result
        signedUrlCache.set(url, {
          url: result.data.url,
          expiresAt: result.data.expiresAt
        })

        setState({
          url: result.data.url,
          isLoading: false,
          error: null,
          expiresAt: result.data.expiresAt
        })

        console.log('[USE_SIGNED_URL] Signed URL generated and cached, expires:', new Date(result.data.expiresAt).toISOString())
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to generate signed URL'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  // Refresh function
  const refresh = useCallback(async () => {
    if (privateUrl) {
      await generateUrl(privateUrl)
    }
  }, [privateUrl, generateUrl])

  // Initial load
  useEffect(() => {
    if (privateUrl && privateUrl.startsWith('private:') && !privateUrl.includes('temp-upload')) {
      generateUrl(privateUrl)
    } else if (privateUrl && privateUrl.includes('temp-upload')) {
      // Temporary upload URL - don't generate signed URL, wait for UI transition
      setState({
        url: null,
        isLoading: false, // Not loading since we're waiting for UI transition
        error: null,
        expiresAt: null
      })
    } else if (privateUrl && !privateUrl.startsWith('private:')) {
      // Direct URL, use as-is (for backwards compatibility)
      setState({
        url: privateUrl,
        isLoading: false,
        error: null,
        expiresAt: null
      })
    } else {
      setState({
        url: null,
        isLoading: false,
        error: null,
        expiresAt: null
      })
    }
  }, [privateUrl, generateUrl])

  // Auto-refresh when near expiry
  useEffect(() => {
    if (isNearExpiry && !state.isLoading && privateUrl) {
      console.log('[USE_SIGNED_URL] Auto-refreshing URL near expiry')
      generateUrl(privateUrl)
    }
  }, [isNearExpiry, state.isLoading, privateUrl, generateUrl])

  // Cleanup timer for expired URLs
  useEffect(() => {
    if (isExpired && state.url) {
      console.log('[USE_SIGNED_URL] URL expired, clearing')
      setState(prev => ({ ...prev, url: null, error: 'URL expired' }))
    }
  }, [isExpired, state.url])

  return {
    ...state,
    refresh,
    isExpired,
    isNearExpiry,
    timeUntilExpiry
  }
}