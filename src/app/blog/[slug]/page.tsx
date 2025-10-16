import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogDetailClient } from './blog-detail-client'
import { blogPosts } from '@/data/blog-posts'
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  renderJsonLd
} from '@/lib/seo/structured-data'

interface PageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = blogPosts.find(p => p.slug === params.slug)

  if (!post) {
    return {
      title: 'Post Not Found - Unpuzzle Blog',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'
  const postUrl = `${siteUrl}/blog/${params.slug}`

  return {
    title: `${post.title} - Unpuzzle Blog`,
    description: post.excerpt,
    alternates: {
      canonical: postUrl
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: postUrl,
      publishedTime: post.publishedAt,
      authors: [post.author?.name || 'Unpuzzle Team'],
      tags: post.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default function BlogDetailPage({ params }: PageProps) {
  const post = blogPosts.find(p => p.slug === params.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = blogPosts
    .filter(p =>
      p.id !== post.id &&
      (p.category === post.category ||
       (p.tags && post.tags && p.tags.some(tag => post.tags.includes(tag))))
    )
    .slice(0, 3)

  // Generate JSON-LD structured data
  const articleSchema = generateArticleSchema(post)
  const breadcrumbSchema = generateBreadcrumbSchema(post)

  return (
    <>
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(articleSchema)}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(breadcrumbSchema)}
      />

      <BlogDetailClient
        post={post}
        relatedPosts={relatedPosts}
      />
    </>
  )
}