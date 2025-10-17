import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogListingClient } from '../../blog-listing-client'
import { generateBlogListSchema, renderJsonLd } from '@/lib/seo/structured-data'
import {
  getPublishedPostsByCategory,
  getBlogCategories
} from '@/lib/blog/get-published-posts'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const categories = (await getBlogCategories()) || []
  return categories.map((category) => ({
    slug: category.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const categories = (await getBlogCategories()) || []
  const category = categories.find(c => c.slug === resolvedParams.slug)

  if (!category) {
    return {
      title: 'Category Not Found - Unpuzzle Blog',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'
  const categoryUrl = `${siteUrl}/blog/category/${resolvedParams.slug}`

  return {
    title: category.meta_title || `${category.name} Articles - Unpuzzle Blog`,
    description: category.meta_description || `Browse all articles about ${category.name} on the Unpuzzle Blog. Learn from experts and discover insights on learning, AI, and education.`,
    alternates: {
      canonical: categoryUrl
    },
    openGraph: {
      title: category.meta_title || `${category.name} Articles - Unpuzzle Blog`,
      description: category.meta_description || `Browse all articles about ${category.name} on the Unpuzzle Blog.`,
      type: 'website',
      url: categoryUrl,
    },
  }
}

// Force dynamic rendering for now (will switch to ISR after testing)
export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const categories = (await getBlogCategories()) || []
  const category = categories.find(c => c.slug === resolvedParams.slug)

  if (!category) {
    notFound()
  }

  // Fetch posts by category from database
  const dbPosts = (await getPublishedPostsByCategory(resolvedParams.slug)) || []

  // Convert database posts to format expected by BlogListingClient
  const categoryPosts = dbPosts.map(post => ({
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
  const featuredPosts = categoryPosts.slice(0, 2).map(p => ({ ...p, featured: true }))

  // Format categories for client
  const formattedCategories = categories.map(cat => ({
    name: cat.name,
    slug: cat.slug,
    count: 0
  }))

  // Generate JSON-LD structured data
  const blogListSchema = generateBlogListSchema(categoryPosts)

  return (
    <>
      {/* Blog List Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(blogListSchema)}
      />

      <BlogListingClient
        initialPosts={categoryPosts}
        categories={formattedCategories}
        featuredPosts={featuredPosts}
      />
    </>
  )
}
