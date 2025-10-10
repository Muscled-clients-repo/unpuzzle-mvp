'use client'

import { CommunityHeader } from '@/components/community/CommunityHeader'
import { CommunityReviewsSection } from '@/components/community/CommunityReviewsSection'

export default function CommunityResourcesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Navigation (starts on Resources tab) */}
      <CommunityHeader initialTab="resources" />

      {/* Reviews Section */}
      <CommunityReviewsSection />
    </div>
  )
}
