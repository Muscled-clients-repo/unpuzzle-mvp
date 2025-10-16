import { Metadata } from 'next'
import { BlogListingClient } from './blog-listing-client'
import { blogPosts, categories } from '@/data/blog-posts'
import {
  generateBlogListSchema,
  generateOrganizationSchema,
  renderJsonLd
} from '@/lib/seo/structured-data'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

export const metadata: Metadata = {
  title: 'Blog - Unpuzzle | Learning Insights & AI Education',
  description: 'Discover strategies, stories, and insights from our community of learners and educators. Learn about AI in education, active learning, and more.',
  alternates: {
    canonical: `${siteUrl}/blog`
  },
  openGraph: {
    title: 'Unpuzzle Blog - Learning Insights & AI Education',
    description: 'Discover strategies, stories, and insights from our community of learners and educators.',
    type: 'website',
    url: `${siteUrl}/blog`,
  },
}

// This page is statically generated at build time
export default function BlogPage() {
  // Get featured posts server-side
  const featuredPosts = blogPosts.filter(post => post.featured).slice(0, 2)

  // Generate JSON-LD structured data
  const blogListSchema = generateBlogListSchema(blogPosts)
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
        initialPosts={blogPosts}
        categories={categories}
        featuredPosts={featuredPosts}
      />
    </>
  )
}