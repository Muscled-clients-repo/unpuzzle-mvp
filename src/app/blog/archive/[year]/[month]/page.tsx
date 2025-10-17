import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogListingClient } from '../../../blog-listing-client'
import { getPublishedPostsByYearMonth, getBlogCategories } from '@/lib/blog/get-published-posts'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface YearMonthArchivePageProps {
  params: {
    year: string
    month: string
  }
}

export async function generateMetadata({ params }: YearMonthArchivePageProps): Promise<Metadata> {
  const year = parseInt(params.year)
  const month = parseInt(params.month)
  const monthName = MONTH_NAMES[month - 1]

  return {
    title: `${monthName} ${year} Blog Archive - Unpuzzle`,
    description: `Browse all blog posts published in ${monthName} ${year}. Discover insights on AI in education, active learning, and more.`,
    alternates: {
      canonical: `${siteUrl}/blog/archive/${year}/${month.toString().padStart(2, '0')}`
    }
  }
}

export default async function YearMonthArchivePage({ params }: YearMonthArchivePageProps) {
  const year = parseInt(params.year)
  const month = parseInt(params.month)

  // Validate year and month
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  if (
    isNaN(year) || isNaN(month) ||
    year < 2020 || year > currentYear + 1 ||
    month < 1 || month > 12 ||
    (year === currentYear + 1 && month > currentMonth)
  ) {
    notFound()
  }

  const monthName = MONTH_NAMES[month - 1]

  // Fetch posts for this year/month
  const posts = await getPublishedPostsByYearMonth(year, month)
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
      archiveTitle={`${monthName} ${year}`}
      archiveDescription={`${formattedPosts.length} ${formattedPosts.length === 1 ? 'post' : 'posts'} published in ${monthName} ${year}`}
    />
  )
}
