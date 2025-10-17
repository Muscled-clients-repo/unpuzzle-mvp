'use client'

import { BlogPostForm } from '@/components/admin/blog/BlogPostForm'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBlogPostPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Create Blog Post"
        description="Write and publish a new blog post"
      >
        <Button variant="outline" asChild>
          <Link href="/admin/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </PageContentHeader>

      <div className="max-w-5xl">
        <BlogPostForm />
      </div>
    </PageContainer>
  )
}
