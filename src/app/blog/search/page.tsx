import { Metadata } from 'next'
import { searchPublishedBlogPosts } from '@/lib/blog/get-published-posts'
import { SearchResultsClient } from './search-results-client'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'

export const metadata: Metadata = {
  title: 'Search Results - Unpuzzle Blog',
  description: 'Search through our blog posts to find insights on AI in education, active learning, and more.',
  alternates: {
    canonical: `${siteUrl}/blog/search`
  },
  robots: {
    index: false, // Don't index search results pages
    follow: true
  }
}

interface SearchPageProps {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ''

  // Server-side search
  let results: any[] = []
  if (query && query.trim().length >= 2) {
    results = await searchPublishedBlogPosts(query.trim())
  }

  // Format results
  const formattedResults = results.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    category: post.blog_categories?.name || 'Uncategorized',
    publishedAt: post.published_at || post.created_at,
    readingTime: post.reading_time || 5,
    featuredImageUrl: post.featured_image_url
  }))

  return <SearchResultsClient query={query} initialResults={formattedResults} />
}
