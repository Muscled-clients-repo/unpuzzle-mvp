import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { blogPosts, categories } from '@/data/blog-posts'
import { BlogListingClient } from '../../blog-listing-client'
import { generateBlogListSchema, renderJsonLd } from '@/lib/seo/structured-data'

interface PageProps {
  params: {
    tag: string
  }
}

// Get all unique tags from blog posts
function getAllTags() {
  const tagsSet = new Set<string>()
  blogPosts.forEach(post => {
    post.tags.forEach(tag => {
      tagsSet.add(tag.toLowerCase().replace(/\s+/g, '-'))
    })
  })
  return Array.from(tagsSet)
}

export async function generateStaticParams() {
  const tags = getAllTags()
  return tags.map((tag) => ({
    tag: tag,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tagName = params.tag.replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'
  const tagUrl = `${siteUrl}/blog/tag/${params.tag}`

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

export default function TagPage({ params }: PageProps) {
  // Filter posts by tag
  const tagPosts = blogPosts.filter(post =>
    post.tags.some(tag =>
      tag.toLowerCase().replace(/\s+/g, '-') === params.tag
    )
  )

  if (tagPosts.length === 0) {
    notFound()
  }

  // Get featured posts from this tag
  const featuredPosts = tagPosts.filter(post => post.featured).slice(0, 2)

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
        categories={categories}
        featuredPosts={featuredPosts}
      />
    </>
  )
}
