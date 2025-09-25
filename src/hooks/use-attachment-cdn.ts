'use client'

import { useState, useEffect, useCallback } from 'react'
import { generateAttachmentCDNUrl } from '@/lib/actions/conversation-attachments'

interface AttachmentCDNState {
  url: string | null
  isLoading: boolean
  error: string | null
  expiresAt: number | null
}

interface UseAttachmentCDNReturn extends AttachmentCDNState {
  refresh: () => Promise<void>
  isExpired: boolean
}

/**
 * Hook for conversation attachment CDN URLs with HMAC tokens
 * Uses CloudFlare Worker + HMAC token system (not useSignedUrl)
 */
export function useAttachmentCDN(attachmentId: string | null): UseAttachmentCDNReturn {
  const [state, setState] = useState<AttachmentCDNState>({
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
      const result = await generateAttachmentCDNUrl(id)

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
    if (attachmentId) {
      await generateUrl(attachmentId)
    }
  }, [attachmentId, generateUrl])

  // Initial load and refresh when expired
  useEffect(() => {
    if (attachmentId) {
      generateUrl(attachmentId)
    } else {
      setState({
        url: null,
        isLoading: false,
        error: null,
        expiresAt: null
      })
    }
  }, [attachmentId, generateUrl])

  // Auto-refresh when expired
  useEffect(() => {
    if (isExpired && !state.isLoading && attachmentId) {
      generateUrl(attachmentId)
    }
  }, [isExpired, state.isLoading, attachmentId, generateUrl])

  return {
    ...state,
    refresh,
    isExpired
  }
}