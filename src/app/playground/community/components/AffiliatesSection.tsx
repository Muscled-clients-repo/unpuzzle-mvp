'use client'

import React, { useState } from 'react'
import { DollarSign, Users, Target, Copy, ExternalLink, TrendingUp, Award, Crown, CheckCircle, Calendar, BarChart3, Gift, Zap, Star } from 'lucide-react'

interface AffiliateStats {
  totalEarnings: number
  monthlyEarnings: number
  referrals: number
  conversions: number
  conversionRate: number
  rank: number
  commissionRate: number
}

interface TopAffiliate {
  id: string
  name: string
  earnings: number
  referrals: number
  joinDate: string
  avatar?: string
  badge?: 'top-performer' | 'rising-star' | 'consistent'
}

interface AffiliatesSectionProps {
  userRole: 'guest' | 'member' | 'instructor'
  isAffiliate?: boolean
}

export function AffiliatesSection({ userRole, isAffiliate = false }: AffiliatesSectionProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const isRestricted = userRole === 'guest'

  // Mock data - replace with real data
  const mockUserStats: AffiliateStats = {
    totalEarnings: 2847,
    monthlyEarnings: 485,
    referrals: 23,
    conversions: 7,
    conversionRate: 30.4,
    rank: 12,
    commissionRate: 30
  }

  const mockTopAffiliates: TopAffiliate[] = [
    {
      id: '1',
      name: 'Sarah M.',
      earnings: 8450,
      referrals: 67,
      joinDate: '2024-03-15',
      badge: 'top-performer'
    },
    {
      id: '2',
      name: 'Mike R.',
      earnings: 6230,
      referrals: 52,
      joinDate: '2024-04-01',
      badge: 'consistent'
    },
    {
      id: '3',
      name: 'Lisa K.',
      earnings: 4890,
      referrals: 41,
      joinDate: '2024-05-20',
      badge: 'rising-star'
    },
    {
      id: '4',
      name: 'John D.',
      earnings: 3675,
      referrals: 28,
      joinDate: '2024-06-10',
      badge: 'consistent'
    },
    {
      id: '5',
      name: 'Emma S.',
      earnings: 2940,
      referrals: 19,
      joinDate: '2024-07-05',
      badge: 'rising-star'
    }
  ]

  const affiliateLink = 'https://unpuzzle.com/?ref=john_d_2024'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'top-performer':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'rising-star':
        return <Star className="h-4 w-4 text-blue-500" />
      case 'consistent':
        return <Target className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'top-performer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rising-star':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'consistent':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isRestricted) {
    // Guest view - affiliate recruitment
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            Affiliate Program
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Earn 30% commission for every member you refer. Help entrepreneurs succeed while building passive income.
          </p>
        </div>

        {/* Value Proposition */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">30% Commission</h3>
            <p className="text-gray-600 text-sm">Earn $29.10 for every $97 member you refer</p>
          </div>

          <div className="text-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">High Conversion</h3>
            <p className="text-gray-600 text-sm">Our members see real results, making referrals easier</p>
          </div>

          <div className="text-center p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring Income</h3>
            <p className="text-gray-600 text-sm">Monthly recurring commissions as long as they stay</p>
          </div>
        </div>

        {/* Top Performer Showcase */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performing Affiliates
          </h3>
          
          <div className="space-y-4">
            {mockTopAffiliates.slice(0, 3).map((affiliate, index) => (
              <div key={affiliate.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    'bg-orange-500 text-white'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Member {String.fromCharCode(65 + index)}</div>
                    <div className="text-sm text-gray-500">{affiliate.referrals} referrals</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${(affiliate.earnings * 0.7).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">earned</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start Earning?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join our community first, see the results for yourself, then become an affiliate and help others succeed while earning passive income.
          </p>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
            Join Community First - $97/month
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Affiliate program available to members after 30 days
          </p>
        </div>
      </div>
    )
  }

  if (!isAffiliate) {
    // Member but not affiliate yet
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            Become an Affiliate
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            You've experienced the value. Now help others succeed and earn 30% commission on every referral.
          </p>
        </div>

        {/* Your Success Story */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Your Journey So Far
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600">90</div>
              <div className="text-sm text-gray-600">Days in Community</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">$3,750</div>
              <div className="text-sm text-gray-600">Earnings This Month</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">75%</div>
              <div className="text-sm text-gray-600">Goal Progress</div>
            </div>
          </div>
        </div>

        {/* Earning Potential */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Earning Potential</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Monthly Scenarios</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>5 referrals/month</span>
                  <span className="font-bold text-green-600">$145.50</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>10 referrals/month</span>
                  <span className="font-bold text-green-600">$291.00</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span>20 referrals/month</span>
                  <span className="font-bold text-green-600">$582.00</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Why You'll Succeed</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>You've seen real results yourself</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>You understand the value proposition</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Your network trusts your recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>High-converting landing pages provided</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Start Earning?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Apply for our affiliate program and start earning 30% commission on every successful referral.
          </p>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
            Apply for Affiliate Program
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Approval typically takes 24-48 hours
          </p>
        </div>
      </div>
    )
  }

  // Active affiliate dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-green-600" />
            Affiliate Dashboard
          </h2>
          <p className="text-gray-600">Track your earnings and manage your referrals</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          <Crown className="h-4 w-4" />
          Rank #{mockUserStats.rank}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Earnings</div>
          <div className="text-2xl font-bold text-green-600">${mockUserStats.totalEarnings.toLocaleString()}</div>
          <div className="text-xs text-gray-500">All time</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-2xl font-bold text-blue-600">${mockUserStats.monthlyEarnings}</div>
          <div className="text-xs text-gray-500">+12% from last month</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Referrals</div>
          <div className="text-2xl font-bold text-purple-600">{mockUserStats.referrals}</div>
          <div className="text-xs text-gray-500">{mockUserStats.conversions} converted</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-2xl font-bold text-orange-600">{mockUserStats.conversionRate}%</div>
          <div className="text-xs text-gray-500">Above average</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'links', label: 'Links & Materials' },
            { id: 'leaderboard', label: 'Leaderboard' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Referrals</h3>
            <div className="space-y-3">
              {[
                { name: 'Alex M.', date: '2 days ago', status: 'converted', amount: 29.10 },
                { name: 'Sarah K.', date: '5 days ago', status: 'pending', amount: 0 },
                { name: 'Mike R.', date: '1 week ago', status: 'converted', amount: 29.10 }
              ].map((referral, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{referral.name}</div>
                    <div className="text-sm text-gray-500">{referral.date}</div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      referral.status === 'converted' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {referral.status}
                    </div>
                    {referral.amount > 0 && (
                      <div className="text-sm font-bold text-green-600">+${referral.amount}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* Affiliate Link */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Affiliate Link</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={affiliateLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  copiedLink 
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-white hover:bg-black'
                }`}
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 inline mr-2" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Marketing Materials */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Materials</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Email Templates</h4>
                <p className="text-sm text-gray-600 mb-3">Ready-to-use email sequences</p>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Download Templates →
                </button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Social Media Kit</h4>
                <p className="text-sm text-gray-600 mb-3">Graphics and copy for social posts</p>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Download Kit →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Affiliates This Month
          </h3>
          
          <div className="space-y-3">
            {mockTopAffiliates.map((affiliate, index) => (
              <div key={affiliate.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {affiliate.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{affiliate.name}</span>
                      {affiliate.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(affiliate.badge)} flex items-center gap-1`}>
                          {getBadgeIcon(affiliate.badge)}
                          {affiliate.badge.replace('-', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{affiliate.referrals} referrals</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${affiliate.earnings.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">this month</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}