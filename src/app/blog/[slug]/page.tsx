import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogDetailClient } from './blog-detail-client'
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from '@/lib/blog/get-published-posts'
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  renderJsonLd
} from '@/lib/seo/structured-data'
import { tiptapToHtml } from '@/lib/blog/tiptap-to-html'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const posts = (await getPublishedBlogPosts()) || []
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const dbPost = await getPublishedBlogPostBySlug(resolvedParams.slug)

  if (!dbPost) {
    return {
      title: 'Post Not Found - Unpuzzle Blog',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'
  const postUrl = `${siteUrl}/blog/${resolvedParams.slug}`

  return {
    title: dbPost.meta_title || `${dbPost.title} - Unpuzzle Blog`,
    description: dbPost.meta_description || dbPost.excerpt || '',
    alternates: {
      canonical: dbPost.canonical_url || postUrl
    },
    openGraph: {
      title: dbPost.meta_title || dbPost.title,
      description: dbPost.meta_description || dbPost.excerpt || '',
      type: 'article',
      url: postUrl,
      publishedTime: dbPost.published_at || dbPost.created_at,
      images: dbPost.og_image_url ? [dbPost.og_image_url] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: dbPost.meta_title || dbPost.title,
      description: dbPost.meta_description || dbPost.excerpt || '',
      images: dbPost.og_image_url ? [dbPost.og_image_url] : undefined,
    },
  }
}

// Force dynamic rendering for now (will switch to ISR after testing)
export const dynamic = 'force-dynamic'

export default async function BlogDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const dbPost = await getPublishedBlogPostBySlug(resolvedParams.slug)

  if (!dbPost) {
    notFound()
  }

  // Convert Tiptap JSON content to HTML
  const contentHtml = tiptapToHtml(dbPost.content)

  // Convert database post to format expected by BlogDetailClient
  const post = {
    id: dbPost.id,
    title: dbPost.title,
    slug: dbPost.slug,
    excerpt: dbPost.excerpt || '',
    content: contentHtml,
    category: dbPost.blog_categories?.name || 'Uncategorized',
    categorySlug: dbPost.blog_categories?.slug || 'uncategorized',
    author: {
      name: dbPost.author?.full_name || 'Unpuzzle Team',
      avatar: dbPost.author?.avatar_url || '/default-avatar.png',
      role: 'Content Author',
      bio: 'Contributing to the Unpuzzle learning platform with insights on education, AI, and technology.'
    },
    publishedAt: dbPost.published_at || dbPost.created_at,
    updatedAt: dbPost.updated_at,
    readingTime: dbPost.reading_time || 5,
    image: dbPost.featured_image_url || '/blog-placeholder.jpg',
    tags: (dbPost as any).blog_post_tags?.map((pt: any) => pt.blog_tags?.name).filter(Boolean) || [],
    featured: false,
    views: dbPost.view_count || 0,
    likes: dbPost.like_count || 0,
    shares: 0,
    comments: []
  }

  // Get related posts (same category)
  const allPosts = (await getPublishedBlogPosts()) || []
  const relatedPosts = allPosts
    .filter(p =>
      p.id !== dbPost.id &&
      p.category_id === dbPost.category_id
    )
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      category: p.blog_categories?.name || 'Uncategorized',
      categorySlug: p.blog_categories?.slug || 'uncategorized',
      publishedAt: p.published_at || p.created_at,
      readingTime: p.reading_time || 5,
      image: p.featured_image_url || '/blog-placeholder.jpg'
    }))

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