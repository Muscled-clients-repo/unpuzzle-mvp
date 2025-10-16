'use client'

import { BlogPostsTable } from '@/components/admin/blog/BlogPostsTable'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'

export default function AdminBlogPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Blog Management"
        description="Create and manage blog posts with SEO optimization"
      />

      <BlogPostsTable />
    </PageContainer>
  )
}
