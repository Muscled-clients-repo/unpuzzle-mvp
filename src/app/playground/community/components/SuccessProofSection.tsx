'use client'

import React, { useState } from 'react'
import { DollarSign, Users, Target, Calendar, TrendingUp, Eye, Heart, MessageCircle, Crown, Award, CheckCircle, ExternalLink, Filter } from 'lucide-react'

interface SuccessPost {
  id: string
  author: {
    name: string
    role: 'instructor' | 'member'
    avatar?: string
    goal: string // current goal they're working on
  }
  type: 'revenue' | 'client-win' | 'milestone' | 'goal-completed' | 'testimonial'
  title: string
  description: string
  amount?: number // revenue amount
  screenshot?: string // screenshot of earnings/payments
  metrics?: {
    clientsGained?: number
    revenueIncrease?: string
    goalProgress?: number
  }
  timestamp: string
  likes: number
  comments: number
  views: number
  isVerified: boolean
  tags: string[]
}

interface SuccessProofSectionProps {
  userRole: 'guest' | 'member' | 'instructor'
}

export function SuccessProofSection({ userRole }: SuccessProofSectionProps) {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  const isRestricted = userRole === 'guest'

  // Mock success stories - replace with real data
  const mockSuccessPosts: SuccessPost[] = [
    {
      id: '1',
      author: { name: 'Sarah M.', role: 'member', goal: '$5K Shopify Agency' },
      type: 'revenue',
      title: 'First $5K month achieved! 🎉',
      description: 'Just hit my $5K monthly revenue goal! Started with Claude Code fundamentals 6 months ago, now managing 8 Shopify clients. This screenshot from Stripe shows this month\'s earnings - couldn\'t have done it without this community!',
      amount: 5247,
      screenshot: '/api/placeholder/600/400', // Revenue screenshot
      timestamp: '2 hours ago',
      likes: 47,
      comments: 12,
      views: 234,
      isVerified: true,
      tags: ['revenue', 'shopify', 'milestone']
    },
    {
      id: '2',
      author: { name: 'John D.', role: 'member', goal: '$3K Shopify Agency' },
      type: 'client-win',
      title: 'Landed my biggest client yet - $15K project!',
      description: 'Used the proposal templates from the resources section and cold outreach scripts. This luxury brand wants a complete Shopify Plus migration. Contract signed yesterday! 💪',
      amount: 15000,
      screenshot: '/api/placeholder/600/400', // Contract/invoice screenshot
      metrics: {
        clientsGained: 1,
        revenueIncrease: '+300%'
      },
      timestamp: '1 day ago',
      likes: 89,
      comments: 23,
      views: 456,
      isVerified: true,
      tags: ['client-win', 'proposal', 'shopify-plus']
    },
    {
      id: '3',
      author: { name: 'Lisa K.', role: 'member', goal: '$10K SaaS MVP' },
      type: 'milestone',
      title: '500 users signed up in 2 weeks! 📈',
      description: 'My SaaS tool for Shopify analytics just crossed 500 users! Built the entire thing using Claude Code techniques learned here. Revenue is at $2.1K MRR already. Here\'s the analytics dashboard:',
      amount: 2100,
      screenshot: '/api/placeholder/600/400', // Analytics dashboard
      metrics: {
        revenueIncrease: '$2.1K MRR',
        goalProgress: 21
      },
      timestamp: '3 days ago',
      likes: 156,
      comments: 34,
      views: 789,
      isVerified: true,
      tags: ['saas', 'mrr', 'analytics']
    },
    {
      id: '4',
      author: { name: 'Mike R.', role: 'member', goal: '$2K Shopify Agency' },
      type: 'goal-completed',
      title: '🏆 $2K Goal SMASHED! Moving to $3K track',
      description: 'Started 4 months ago with zero coding experience. Today I hit my $2K monthly goal consistently for 3 months! Time to level up. Thank you to everyone who helped along the way!',
      amount: 2400,
      screenshot: '/api/placeholder/600/400', // Bank/revenue screenshot
      metrics: {
        clientsGained: 4,
        goalProgress: 120
      },
      timestamp: '5 days ago',
      likes: 203,
      comments: 45,
      views: 892,
      isVerified: true,
      tags: ['goal-completed', 'milestone', 'growth']
    },
    {
      id: '5',
      author: { name: 'Emma S.', role: 'member', goal: '$8K SaaS MVP' },
      type: 'testimonial',
      title: 'Client testimonial that made my week 💖',
      description: 'My client just sent this after delivering their Shopify store optimization. 40% conversion rate increase and they\'re over the moon! These results speak for themselves.',
      screenshot: '/api/placeholder/600/400', // Client testimonial screenshot
      metrics: {
        revenueIncrease: '40% conversion increase'
      },
      timestamp: '1 week ago',
      likes: 67,
      comments: 18,
      views: 345,
      isVerified: true,
      tags: ['testimonial', 'optimization', 'results']
    },
    {
      id: '6',
      author: { name: 'Alex T.', role: 'member', goal: '$1K Shopify Agency' },
      type: 'client-win',
      title: 'First paying client! $800 Shopify build 🎯',
      description: 'After 2 months of learning, I just signed my first client! A local restaurant needs a Shopify store. Using everything I learned in the fundamentals course. So excited!',
      amount: 800,
      screenshot: '/api/placeholder/600/400', // Contract screenshot
      timestamp: '1 week ago',
      likes: 124,
      comments: 28,
      views: 567,
      isVerified: true,
      tags: ['first-client', 'milestone', 'restaurant']
    },
    {
      id: '7',
      author: { name: 'Jenny L.', role: 'member', goal: '$15K SaaS MVP' },
      type: 'revenue',
      title: 'SaaS hit $8K MRR! Halfway to my goal 🚀',
      description: 'My Shopify app for inventory management is growing fast! Just crossed $8K in monthly recurring revenue. Using Claude Code for all development. Here\'s this month\'s Stripe dashboard:',
      amount: 8200,
      screenshot: '/api/placeholder/600/400', // Stripe MRR screenshot
      metrics: {
        revenueIncrease: '$8.2K MRR',
        goalProgress: 55
      },
      timestamp: '2 weeks ago',
      likes: 178,
      comments: 41,
      views: 934,
      isVerified: true,
      tags: ['saas', 'mrr', 'inventory', 'shopify-app']
    }
  ]

  const filteredPosts = mockSuccessPosts.filter(post => {
    switch (filter) {
      case 'revenue':
        return post.type === 'revenue'
      case 'client-wins':
        return post.type === 'client-win'
      case 'milestones':
        return post.type === 'milestone' || post.type === 'goal-completed'
      case 'testimonials':
        return post.type === 'testimonial'
      case 'verified':
        return post.isVerified
      default:
        return true
    }
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likes - a.likes
      case 'amount':
        return (b.amount || 0) - (a.amount || 0)
      case 'engagement':
        return (b.likes + b.comments) - (a.likes + a.comments)
      default: // recent
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'client-win':
        return <Users className="h-5 w-5 text-blue-600" />
      case 'milestone':
        return <Target className="h-5 w-5 text-purple-600" />
      case 'goal-completed':
        return <Award className="h-5 w-5 text-yellow-600" />
      case 'testimonial':
        return <Heart className="h-5 w-5 text-red-600" />
      default:
        return <TrendingUp className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const badges = {
      'revenue': { label: 'Revenue Win', color: 'bg-green-100 text-green-800' },
      'client-win': { label: 'Client Win', color: 'bg-blue-100 text-blue-800' },
      'milestone': { label: 'Milestone', color: 'bg-purple-100 text-purple-800' },
      'goal-completed': { label: 'Goal Completed', color: 'bg-yellow-100 text-yellow-800' },
      'testimonial': { label: 'Testimonial', color: 'bg-red-100 text-red-800' }
    }
    
    const badge = badges[type] || { label: 'Success', color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <TrendingUp className="h-7 w-7 text-green-600" />
          Success Proof
        </h2>
        <p className="text-gray-600">
          Real results from our community members - screenshots, testimonials, and milestone achievements
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
            <option value="all">All Success Stories</option>
            <option value="revenue">Revenue Wins</option>
            <option value="client-wins">Client Wins</option>
            <option value="milestones">Milestones & Goals</option>
            <option value="testimonials">Client Testimonials</option>
            <option value="verified">Verified Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Liked</option>
            <option value="amount">Highest Amount</option>
            <option value="engagement">Most Engagement</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {sortedPosts.length} success stories
        </div>
      </div>

      {/* Success Posts */}
      <div className="space-y-6">
        {sortedPosts.map((post) => (
          <div
            key={post.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Post Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {post.author.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {isRestricted ? `Member ${post.id}` : post.author.name}
                      </span>
                      {post.author.role === 'instructor' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {post.isVerified && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{post.timestamp}</span>
                      <span>•</span>
                      <span>{isRestricted ? '$XK Goal Track' : post.author.goal}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeIcon(post.type)}
                  {getTypeBadge(post.type)}
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {post.title}
              </h3>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                {isRestricted 
                  ? `Amazing success story from one of our members! Join the community to see the full details and screenshots.`
                  : post.description
                }
              </p>

              {/* Amount Display */}
              {post.amount && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                    <DollarSign className="h-4 w-4" />
                    ${isRestricted ? 'XXX' : post.amount.toLocaleString()}
                    {post.type === 'revenue' && post.metrics?.revenueIncrease && (
                      <span className="text-sm">({post.metrics.revenueIncrease})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {post.metrics && !isRestricted && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {post.metrics.clientsGained && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{post.metrics.clientsGained}</div>
                      <div className="text-sm text-blue-800">Clients Gained</div>
                    </div>
                  )}
                  {post.metrics.goalProgress && (
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{post.metrics.goalProgress}%</div>
                      <div className="text-sm text-purple-800">Goal Progress</div>
                    </div>
                  )}
                  {post.metrics.revenueIncrease && (
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{post.metrics.revenueIncrease}</div>
                      <div className="text-sm text-green-800">Revenue Growth</div>
                    </div>
                  )}
                </div>
              )}

              {/* Screenshot */}
              {post.screenshot && (
                <div className="mb-4">
                  {isRestricted ? (
                    <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
                      <div className="text-center">
                        <Eye className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">Screenshot Hidden</p>
                        <p className="text-sm text-gray-500">Join to see proof</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={post.screenshot}
                      alt="Success proof screenshot"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Post Actions */}
            <div className="px-6 pb-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Eye className="h-4 w-4" />
                    <span>{post.views}</span>
                  </div>
                </div>
                
                {post.isVerified && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">See Your Success Story Here</h3>
          <p className="text-gray-600 mb-4">
            Join hundreds of members sharing their wins, revenue screenshots, and milestone achievements.
          </p>
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Start Your Journey - $97/month
          </button>
        </div>
      )}
    </div>
  )
}