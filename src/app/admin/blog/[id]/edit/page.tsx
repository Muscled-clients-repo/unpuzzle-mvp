'use client'

import { use } from 'react'
import { BlogPostForm } from '@/components/admin/blog/BlogPostForm'
import { useBlogPost } from '@/hooks/blog/useBlogPosts'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: post, isLoading, error } = useBlogPost(resolvedParams.id)

  if (isLoading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </PageContainer>
    )
  }

  if (error || !post) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-red-600">Post not found</p>
          <Button asChild className="mt-4">
            <Link href="/admin/blog">Back to Blog Posts</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageContentHeader
        title="Edit Blog Post"
        description="Update and manage your blog post"
      >
        <Button variant="outline" asChild>
          <Link href="/admin/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </PageContentHeader>

      <div className="max-w-5xl">
        <BlogPostForm initialData={post} postId={resolvedParams.id} />
      </div>
    </PageContainer>
  )
}
