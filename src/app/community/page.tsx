'use client'

import { CommunityHeader } from '@/components/community/CommunityHeader'
import { CommunityReviewsSection } from '@/components/community/CommunityReviewsSection'

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Navigation */}
      <CommunityHeader />

      {/* Reviews Section */}
      <CommunityReviewsSection />
    </div>
  )
}

