'use client'

import { useState, useEffect, useCallback } from 'react'
import { generateReflectionCDNUrl } from '@/lib/actions/reflection-attachments'

interface ReflectionCDNState {
  url: string | null
  isLoading: boolean
  error: string | null
  expiresAt: number | null
}

interface UseReflectionCDNReturn extends ReflectionCDNState {
  refresh: () => Promise<void>
  isExpired: boolean
}

/**
 * Hook for reflection CDN URLs with HMAC tokens
 * Uses CloudFlare Worker + HMAC token system (not useSignedUrl)
 */
export function useReflectionCDN(reflectionId: string | null): UseReflectionCDNReturn {
  const [state, setState] = useState<ReflectionCDNState>({
    url: null,
    isLoading: false,
    error: null,
    expiresAt: null
  })

  // Check if token is expired
  const isExpired = state.expiresAt ? Date.now() > state.expiresAt : false

  // Generate CDN URL with HMAC token
  const generateUrl = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await generateReflectionCDNUrl(id)

      if (result) {
        setState({
          url: result.url,
          isLoading: false,
          error: null,
          expiresAt: result.expiresAt
        })
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to generate CDN URL'
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
    if (reflectionId) {
      await generateUrl(reflectionId)
    }
  }, [reflectionId, generateUrl])

  // Initial load and refresh when expired
  useEffect(() => {
    if (reflectionId) {
      generateUrl(reflectionId)
    } else {
      setState({
        url: null,
        isLoading: false,
        error: null,
        expiresAt: null
      })
    }
  }, [reflectionId, generateUrl])

  // Auto-refresh when expired
  useEffect(() => {
    if (isExpired && !state.isLoading && reflectionId) {
      generateUrl(reflectionId)
    }
  }, [isExpired, state.isLoading, reflectionId, generateUrl])

  return {
    ...state,
    refresh,
    isExpired
  }
}
