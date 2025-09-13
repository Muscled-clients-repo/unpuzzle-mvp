'use client'

import { CommunityHeader } from './components/CommunityHeader'
import { CommunityReviewsSection } from './components/CommunityReviewsSection'

export default function CommunityPlaygroundPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Navigation */}
      <CommunityHeader />
      
      {/* Reviews Section */}
      <CommunityReviewsSection />
    </div>
  )
}