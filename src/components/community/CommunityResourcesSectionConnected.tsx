'use client'

import React, { useState } from 'react'
import { FileText, Download, Mail, Lock, Crown, CheckCircle, X, Star, Users, Loader2, Globe } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import {
  getResources,
  recordResourceDownload,
  getResourceDownloadUrl,
  type Resource
} from '@/app/actions/resource-actions'
import { toast } from 'sonner'

export function CommunityResourcesSectionConnected() {
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  const userRole = user ? (user.role === 'instructor' ? 'instructor' : 'student') : 'guest'
  const isRestricted = userRole === 'guest'

  // Fetch resources
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['community-resources', filter, category],
    queryFn: async () => {
      const filters: any = {}
      if (filter === 'free') filters.access = 'free'
      if (filter === 'member-only') filters.access = 'member-only'
      if (category !== 'all') filters.category = category

      const result = await getResources(filters)
      if (result.error) throw new Error(result.error)
      return result.resources || []
    }
  })

  // Download tracking mutation
  const downloadMutation = useMutation({
    mutationFn: recordResourceDownload,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Download started!')
      queryClient.invalidateQueries({ queryKey: ['community-resources'] })
    }
  })

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'client-acquisition', label: 'Client Acquisition' },
    { value: 'development', label: 'Development' },
    { value: 'business', label: 'Business & Finance' },
    { value: 'templates', label: 'Templates' },
    { value: 'marketing', label: 'Marketing' }
  ]

  const resources = resourcesData || []

  // Apply popular/new filters client-side
  const filteredResources = resources.filter(resource => {
    if (filter === 'popular') return resource.is_popular
    if (filter === 'new') return resource.is_new
    return true
  })

  const handleResourceClick = (resource: Resource) => {
    if (resource.access === 'member-only' && isRestricted) {
      toast.error('This resource is only available to members')
      return
    }

    if (resource.access === 'free' && isRestricted) {
      setSelectedResource(resource)
      setShowEmailModal(true)
    } else {
      // Direct download for members
      handleDirectDownload(resource)
    }
  }

  const handleDirectDownload = async (resource: Resource) => {
    try {
      // Get CDN URL with HMAC token
      const result = await getResourceDownloadUrl(resource.id)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (!result.cdnUrl) {
        toast.error('Download URL not available')
        return
      }

      // Track download
      downloadMutation.mutate(resource.id)

      // Open file in new tab with CDN URL
      window.open(result.cdnUrl, '_blank')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download resource')
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedResource) return

    setIsSubmitting(true)

    try {
      // Call email API to send download link
      const response = await fetch('/api/resources/send-download-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          resourceId: selectedResource.id
        })
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || 'Failed to send email')
        setIsSubmitting(false)
        return
      }

      // Download tracking is handled in the API
      toast.success('Check your email for the download link!')

      // Invalidate queries to refresh download counts
      queryClient.invalidateQueries({ queryKey: ['community-resources'] })
      setIsSubmitting(false)
      setEmailSubmitted(true)

      // Reset after showing success
      setTimeout(() => {
        setShowEmailModal(false)
        setEmailSubmitted(false)
        setEmail('')
        setSelectedResource(null)
      }, 2000)
    } catch (error) {
      console.error('Email send error:', error)
      toast.error('Failed to send email')
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    return <FileText className="h-5 w-5" />
  }

  const getAccessBadge = (access: string) => {
    if (access === 'free') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Free
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Members Only
        </span>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Resource Library
        </h2>
        <p className="text-gray-600">
          Templates, tools, and guides to accelerate your development journey
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Resources</option>
            <option value="free">Free Resources</option>
            <option value="member-only">Members Only</option>
            <option value="popular">Most Popular</option>
            <option value="new">New Releases</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filteredResources.length} resources
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No resources found</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-gray-600">
                    {getTypeIcon(resource.type)}
                  </div>
                  {resource.is_popular && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                  {resource.is_new && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      New
                    </span>
                  )}
                </div>
                {getAccessBadge(resource.access)}
              </div>

              {/* Content */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {resource.title}
              </h3>

              {resource.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {resource.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{resource.download_count.toLocaleString()} downloads</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span>{resource.rating_average.toFixed(1)}</span>
                </div>
                {resource.format && (
                  <div>
                    {resource.format}
                  </div>
                )}
              </div>

              {/* Tags */}
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="flex-shrink-0 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handleResourceClick(resource)}
                disabled={downloadMutation.isPending || (resource.access === 'member-only' && isRestricted)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  resource.access === 'member-only' && isRestricted
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : resource.access === 'free'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {downloadMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 inline mr-2 animate-spin" />Downloading...</>
                ) : resource.access === 'member-only' && isRestricted ? (
                  <>
                    <Lock className="h-4 w-4 inline mr-2" />
                    Join to Access
                  </>
                ) : resource.access === 'free' ? (
                  <>
                    <Mail className="h-4 w-4 inline mr-2" />
                    Get Free Resource
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 inline mr-2" />
                    Download Now
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Email Capture Modal */}
      {showEmailModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            {!emailSubmitted ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Get Free Resource
                  </h3>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {selectedResource.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Enter your email to receive this free resource instantly.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    <span>{selectedResource.download_count.toLocaleString()} people have downloaded this</span>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Me This Resource'}
                  </button>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    No spam. Unsubscribe anytime. We respect your privacy.
                  </p>
                </form>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Email Sent!
                </h3>
                <p className="text-sm text-gray-600">
                  Check your inbox for the download link. It expires in 6 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 text-center">
          <Crown className="h-8 w-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Unlock Premium Resources</h3>
          <p className="text-gray-600 mb-4">
            Get instant access to exclusive templates, tools, and advanced guides.
          </p>
          <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Join Community - $97/month
          </button>
        </div>
      )}
    </div>
  )
}
