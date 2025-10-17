import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogListingClient } from '../../blog-listing-client'
import { getPublishedPostsByYear, getBlogCategories } from '@/lib/blog/get-published-posts'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'

interface YearArchivePageProps {
  params: {
    year: string
  }
}

export async function generateMetadata({ params }: YearArchivePageProps): Promise<Metadata> {
  const year = parseInt(params.year)

  return {
    title: `${year} Blog Archive - Unpuzzle`,
    description: `Browse all blog posts published in ${year}. Discover insights on AI in education, active learning, and more.`,
    alternates: {
      canonical: `${siteUrl}/blog/archive/${year}`
    }
  }
}

export default async function YearArchivePage({ params }: YearArchivePageProps) {
  const year = parseInt(params.year)

  // Validate year
  const currentYear = new Date().getFullYear()
  if (isNaN(year) || year < 2020 || year > currentYear + 1) {
    notFound()
  }

  // Fetch posts for this year
  const posts = await getPublishedPostsByYear(year)
  const categories = await getBlogCategories()

  // Format posts
  const formattedPosts = posts.map(post => ({
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
    featured: false,
    tags: []
  }))

  const formattedCategories = categories.map(cat => ({
    name: cat.name,
    slug: cat.slug,
    count: 0
  }))

  return (
    <BlogListingClient
      initialPosts={formattedPosts}
      categories={formattedCategories}
      featuredPosts={[]}
      archiveTitle={`${year} Archive`}
      archiveDescription={`${formattedPosts.length} ${formattedPosts.length === 1 ? 'post' : 'posts'} published in ${year}`}
    />
  )
}
