import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogListingClient } from '../../blog-listing-client'
import { generateBlogListSchema, renderJsonLd } from '@/lib/seo/structured-data'
import {
  getPublishedPostsByTag,
  getBlogCategories,
  getBlogTags
} from '@/lib/blog/get-published-posts'

interface PageProps {
  params: Promise<{
    tag: string
  }>
}

export async function generateStaticParams() {
  const tags = (await getBlogTags()) || []
  return tags.map((tag) => ({
    tag: tag.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const tags = (await getBlogTags()) || []
  const tag = tags.find(t => t.slug === resolvedParams.tag)

  const tagName = tag?.name || resolvedParams.tag.replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'
  const tagUrl = `${siteUrl}/blog/tag/${resolvedParams.tag}`

  return {
    title: `${tagName} Articles - Unpuzzle Blog`,
    description: `Browse all articles tagged with "${tagName}" on the Unpuzzle Blog. Learn from experts and discover insights on learning, AI, and education.`,
    alternates: {
      canonical: tagUrl
    },
    openGraph: {
      title: `${tagName} Articles - Unpuzzle Blog`,
      description: `Browse all articles tagged with "${tagName}" on the Unpuzzle Blog.`,
      type: 'website',
      url: tagUrl,
    },
  }
}

// Force dynamic rendering for now (will switch to ISR after testing)
export const dynamic = 'force-dynamic'

export default async function TagPage({ params }: PageProps) {
  const resolvedParams = await params

  // Fetch posts by tag from database
  const dbPosts = (await getPublishedPostsByTag(resolvedParams.tag)) || []

  if (dbPosts.length === 0) {
    notFound()
  }

  // Convert database posts to format expected by BlogListingClient
  const tagPosts = dbPosts.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    content: post.content,
    category: post.blog_categories?.name || 'Uncategorized',
    categorySlug: post.blog_categories?.slug || 'uncategorized',
    author: {
      name: post.author?.full_name || 'Unpuzzle Team',
      avatar: post.author?.avatar_url || '/default-avatar.png'
    },
    publishedAt: post.published_at || post.created_at,
    readingTime: post.reading_time || 5,
    image: post.featured_image_url || '/blog-placeholder.jpg',
    featured: false, // Can be enhanced later with a featured flag
    tags: [] // Tags not loaded in listing view for performance
  }))

  // Get first 2 as featured
  const featuredPosts = tagPosts.slice(0, 2).map(p => ({ ...p, featured: true }))

  // Fetch categories for client
  const categories = (await getBlogCategories()) || []
  const formattedCategories = categories.map(cat => ({
    name: cat.name,
    slug: cat.slug,
    count: 0
  }))

  // Generate JSON-LD structured data
  const blogListSchema = generateBlogListSchema(tagPosts)

  return (
    <>
      {/* Blog List Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(blogListSchema)}
      />

      <BlogListingClient
        initialPosts={tagPosts}
        categories={formattedCategories}
        featuredPosts={featuredPosts}
      />
    </>
  )
}
