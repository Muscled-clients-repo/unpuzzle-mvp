'use client'

import { CommunityHeader } from './components/CommunityHeader'
import { CommunityStats } from './components/CommunityStats'
import { LeaderboardSection } from './components/LeaderboardSection'
import { SuccessStoriesSection } from './components/SuccessStoriesSection'
import { PublicDiscussions } from './components/PublicDiscussions'
import { JoinCommunitySection } from './components/JoinCommunitySection'

export default function CommunityPlaygroundPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <CommunityHeader />
      
      {/* Community Stats */}
      <CommunityStats />
      
      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Leaderboards */}
          <div className="lg:col-span-2 space-y-8">
            <LeaderboardSection />
            <PublicDiscussions />
          </div>
          
          {/* Right Column - Success Stories & CTA */}
          <div className="space-y-8">
            <SuccessStoriesSection />
            <JoinCommunitySection />
          </div>
        </div>
      </div>
      
    </div>
  )
}