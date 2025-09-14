'use client'

import { CommunityHeader } from '../community/components/CommunityHeader'
import { CommunityReviewsSection } from '../community/components/CommunityReviewsSection'
import { guestCommunityPosts } from './mock-data/guest-posts'
import { guestSimilarMembers, guestRecentlyCompletedMembers, guestRecentActivities } from './mock-data/guest-goals'
import { guestGoalDiggers } from './mock-data/guest-goal-diggers'
import { guestCoursesByGoal } from './mock-data/guest-courses'
import { guestNavigationOverrides } from './mock-data/guest-navigation'

export default function CommunityGuestPage() {
  const guestGoalData = {
    similarMembers: guestSimilarMembers,
    recentlyCompletedMembers: guestRecentlyCompletedMembers,
    recentActivities: guestRecentActivities
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Navigation */}
      <CommunityHeader 
        communityPosts={guestCommunityPosts} 
        userRole="guest" 
        goalData={guestGoalData}
        goalDiggers={guestGoalDiggers}
        hiddenTabs={guestNavigationOverrides.hiddenTabs}
        coursesByGoal={guestCoursesByGoal}
      />
      
      {/* Reviews Section */}
      <CommunityReviewsSection />
    </div>
  )
}