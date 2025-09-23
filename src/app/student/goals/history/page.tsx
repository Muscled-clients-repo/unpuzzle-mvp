'use client'

import React from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { TrackHistoryView } from './components/TrackHistoryView'

export default function StudentTrackHistoryPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Track History"
        description="View your track progression and goal history"
      />
      <TrackHistoryView />
    </PageContainer>
  )
}