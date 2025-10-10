'use client'

import { CommunityHeader } from '@/components/community/CommunityHeader'
import { CommunityReviewsSection } from '@/components/community/CommunityReviewsSection'

export default function CommunityGoalsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Navigation (starts on Goals tab) */}
      <CommunityHeader initialTab="goals" />

      {/* Reviews Section */}
      <CommunityReviewsSection />
    </div>
  )
}
