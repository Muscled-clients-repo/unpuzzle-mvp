'use client'

import React from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { InstructorTrackHistoryView } from './components/InstructorTrackHistoryView'

export default function InstructorTrackHistoryPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Student Track History"
        description="View all student track progressions and transitions"
      />
      <InstructorTrackHistoryView />
    </PageContainer>
  )
}