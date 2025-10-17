import { Metadata } from 'next'
import { BlogListingClient } from './blog-listing-client'
import { getPublishedBlogPosts, getBlogCategories } from '@/lib/blog/get-published-posts'
import {
  generateBlogListSchema,
  generateOrganizationSchema,
  renderJsonLd
} from '@/lib/seo/structured-data'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'

export const metadata: Metadata = {
  title: 'Blog - Unpuzzle | Learning Insights & AI Education',
  description: 'Discover strategies, stories, and insights from our community of learners and educators. Learn about AI in education, active learning, and more.',
  alternates: {
    canonical: `${siteUrl}/blog`,
    types: {
      'application/rss+xml': `${siteUrl}/feed.xml`
    }
  },
  openGraph: {
    title: 'Unpuzzle Blog - Learning Insights & AI Education',
    description: 'Discover strategies, stories, and insights from our community of learners and educators.',
    type: 'website',
    url: `${siteUrl}/blog`,
  },
}

// Force dynamic rendering for now (will switch to ISR after testing)
export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  // Fetch published posts from database
  const publishedPosts = (await getPublishedBlogPosts()) || []
  const categories = (await getBlogCategories()) || []

  // Get first 2 posts as featured (you can add a featured flag later)
  const featuredPosts = publishedPosts.slice(0, 2)

  // Convert database posts to format expected by BlogListingClient
  const formattedPosts = publishedPosts.map(post => ({
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
    featured: featuredPosts.some(fp => fp.id === post.id),
    tags: [] // Tags not loaded in listing view for performance
  }))

  const formattedCategories = categories.map(cat => ({
    name: cat.name,
    slug: cat.slug,
    count: 0 // We'll calculate this on the client if needed
  }))

  // Generate JSON-LD structured data
  const blogListSchema = generateBlogListSchema(formattedPosts)
  const organizationSchema = generateOrganizationSchema()

  return (
    <>
      {/* Blog List Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(blogListSchema)}
      />

      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(organizationSchema)}
      />

      <BlogListingClient
        initialPosts={formattedPosts}
        categories={formattedCategories}
        featuredPosts={formattedPosts.filter(p => p.featured)}
      />
    </>
  )
}