'use client'

import React, { useState } from 'react'
import { FileText, Download, Mail, Lock, Crown, CheckCircle, X, ExternalLink, Star, Users, TrendingUp } from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  type: 'template' | 'guide' | 'checklist' | 'video' | 'course' | 'tool'
  category: 'client-acquisition' | 'development' | 'business' | 'templates' | 'marketing'
  access: 'free' | 'member-only'
  downloadCount: number
  rating: number
  fileSize?: string
  format: string // PDF, Video, ZIP, etc.
  preview?: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  isPopular?: boolean
  isNew?: boolean
}

interface CommunityResourcesProps {
  userRole: 'guest' | 'member' | 'instructor'
}

export function CommunityResourcesSection({ userRole }: CommunityResourcesProps) {
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  const isRestricted = userRole === 'guest'

  // Mock data - replace with real data
  const mockResources: Resource[] = [
    {
      id: '1',
      title: 'Claude Code Project Starter Template',
      description: 'Complete project template with folder structure, configs, and best practices for starting any Claude Code project',
      type: 'template',
      category: 'development',
      access: 'free',
      downloadCount: 2847,
      rating: 4.9,
      fileSize: '2.5 MB',
      format: 'ZIP',
      tags: ['beginner-friendly', 'project-setup', 'templates'],
      difficulty: 'beginner',
      isPopular: true
    },
    {
      id: '2',
      title: 'Client Proposal Templates (5 Winning Formats)',
      description: 'Proven proposal templates that have closed over $500K in client deals. Includes pricing strategies and follow-up sequences.',
      type: 'template',
      category: 'client-acquisition',
      access: 'free',
      downloadCount: 1923,
      rating: 4.8,
      fileSize: '1.8 MB',
      format: 'PDF + Notion',
      tags: ['proposals', 'client-work', 'templates'],
      difficulty: 'intermediate',
      isPopular: true
    },
    {
      id: '3',
      title: 'Shopify Agency Pricing Calculator',
      description: 'Interactive spreadsheet to calculate project pricing, hourly rates, and profit margins for Shopify development work.',
      type: 'tool',
      category: 'business',
      access: 'free',
      downloadCount: 1456,
      rating: 4.7,
      fileSize: '890 KB',
      format: 'Excel + Google Sheets',
      tags: ['pricing', 'business', 'calculator'],
      difficulty: 'beginner'
    },
    {
      id: '4',
      title: 'Complete Onboarding System for Agencies',
      description: 'Full client onboarding workflow with contracts, questionnaires, project briefs, and milestone tracking. Used by 100+ agencies.',
      type: 'template',
      category: 'business',
      access: 'member-only',
      downloadCount: 847,
      rating: 4.9,
      fileSize: '5.2 MB',
      format: 'PDF + Notion + Figma',
      tags: ['onboarding', 'systems', 'workflows'],
      difficulty: 'intermediate',
      isNew: true
    },
    {
      id: '5',
      title: 'Cold Outreach Scripts That Convert',
      description: 'Email and LinkedIn templates with 40%+ response rates. Includes follow-up sequences and objection handling.',
      type: 'template',
      category: 'client-acquisition',
      access: 'free',
      downloadCount: 3241,
      rating: 4.6,
      fileSize: '1.2 MB',
      format: 'PDF + Notion',
      tags: ['outreach', 'sales', 'templates'],
      difficulty: 'beginner',
      isPopular: true
    },
    {
      id: '6',
      title: 'Advanced Shopify Liquid Code Snippets',
      description: 'Premium collection of 50+ tested Liquid snippets for complex Shopify customizations. Saves 20+ hours per project.',
      type: 'template',
      category: 'development',
      access: 'member-only',
      downloadCount: 623,
      rating: 4.8,
      fileSize: '3.1 MB',
      format: 'ZIP + Documentation',
      tags: ['shopify', 'liquid', 'code-snippets'],
      difficulty: 'advanced'
    },
    {
      id: '7',
      title: 'Client Communication Templates',
      description: 'Professional email templates for every stage of client relationship - from first contact to project completion.',
      type: 'template',
      category: 'client-acquisition',
      access: 'free',
      downloadCount: 1876,
      rating: 4.5,
      fileSize: '1.1 MB',
      format: 'PDF',
      tags: ['communication', 'templates', 'client-relations'],
      difficulty: 'beginner'
    },
    {
      id: '8',
      title: 'Agency Financial Dashboard',
      description: 'Complete financial tracking system with revenue projections, expense tracking, and profitability analysis for agencies.',
      type: 'tool',
      category: 'business',
      access: 'member-only',
      downloadCount: 445,
      rating: 4.9,
      fileSize: '2.8 MB',
      format: 'Excel + Google Sheets',
      tags: ['finance', 'tracking', 'business'],
      difficulty: 'intermediate',
      isNew: true
    }
  ]

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'client-acquisition', label: 'Client Acquisition' },
    { value: 'development', label: 'Development' },
    { value: 'business', label: 'Business & Finance' },
    { value: 'templates', label: 'Templates' },
    { value: 'marketing', label: 'Marketing' }
  ]

  const filteredResources = mockResources.filter(resource => {
    const matchesFilter = filter === 'all' || 
      (filter === 'free' && resource.access === 'free') ||
      (filter === 'member-only' && resource.access === 'member-only') ||
      (filter === 'popular' && resource.isPopular) ||
      (filter === 'new' && resource.isNew)
    
    const matchesCategory = category === 'all' || resource.category === category
    
    return matchesFilter && matchesCategory
  })

  const handleResourceClick = (resource: Resource) => {
    if (resource.access === 'member-only' && isRestricted) {
      // Show upgrade prompt for restricted users
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

  const handleDirectDownload = (resource: Resource) => {
    // Handle direct download for members
    console.log('Downloading resource:', resource.title)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setEmailSubmitted(true)
    
    // Reset after showing success
    setTimeout(() => {
      setShowEmailModal(false)
      setEmailSubmitted(false)
      setEmail('')
      setSelectedResource(null)
    }, 2000)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'template':
        return <FileText className="h-5 w-5" />
      case 'tool':
        return <Download className="h-5 w-5" />
      case 'guide':
        return <FileText className="h-5 w-5" />
      case 'video':
        return <ExternalLink className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getAccessBadge = (access: string) => {
    if (access === 'free') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
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
                {resource.isPopular && (
                  <Star className="h-4 w-4 text-yellow-500" />
                )}
                {resource.isNew && (
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

            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {resource.description}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{resource.downloadCount.toLocaleString()} downloads</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{resource.rating}</span>
              </div>
              <div>
                {resource.fileSize} • {resource.format}
              </div>
            </div>

            {/* Tags */}
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

            {/* Action Button */}
            <button
              onClick={() => handleResourceClick(resource)}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                resource.access === 'member-only' && isRestricted
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : resource.access === 'free' 
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              disabled={resource.access === 'member-only' && isRestricted}
            >
              {resource.access === 'member-only' && isRestricted ? (
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
                    <TrendingUp className="h-3 w-3" />
                    <span>{selectedResource.downloadCount.toLocaleString()} people have downloaded this</span>
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
                  Check Your Email!
                </h3>
                <p className="text-sm text-gray-600">
                  We've sent {selectedResource.title} to your email address.
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