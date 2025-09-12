import { CommunityHero } from '@/components/community/CommunityHero'

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-white">
      <CommunityHero />
    </div>
  )
}

export const metadata = {
  title: 'Join The Puzzle - Learn My $300K Upwork System',
  description: 'Join 50 founding members learning the exact system I used to build $300K on Upwork. No Code Tech Agency & Code With AI SaaS tracks available.',
  keywords: 'upwork, freelancing, agency, no code, AI, SaaS, claude code, development',
  openGraph: {
    title: 'Join The Puzzle - Learn My $300K Upwork System',
    description: 'Join 50 founding members learning the exact system I used to build $300K on Upwork.',
    type: 'website',
  },
}