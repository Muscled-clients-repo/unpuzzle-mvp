import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { blogPosts, categories } from '@/data/blog-posts'
import { BlogListingClient } from '../../blog-listing-client'
import { generateBlogListSchema, renderJsonLd } from '@/lib/seo/structured-data'

interface PageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return categories
    .filter(cat => cat.slug !== 'all')
    .map((category) => ({
      slug: category.slug,
    }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = categories.find(c => c.slug === params.slug)

  if (!category) {
    return {
      title: 'Category Not Found - Unpuzzle Blog',
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'
  const categoryUrl = `${siteUrl}/blog/category/${params.slug}`

  return {
    title: `${category.name} Articles - Unpuzzle Blog`,
    description: `Browse all articles about ${category.name} on the Unpuzzle Blog. Learn from experts and discover insights on learning, AI, and education.`,
    alternates: {
      canonical: categoryUrl
    },
    openGraph: {
      title: `${category.name} Articles - Unpuzzle Blog`,
      description: `Browse all articles about ${category.name} on the Unpuzzle Blog.`,
      type: 'website',
      url: categoryUrl,
    },
  }
}

export default function CategoryPage({ params }: PageProps) {
  const category = categories.find(c => c.slug === params.slug)

  if (!category) {
    notFound()
  }

  // Filter posts by category
  const categoryPosts = blogPosts.filter(post => {
    const postCategorySlug = post.category
      .toLowerCase()
      .replace(' & ', '-')
      .replace(' ', '-')
    return postCategorySlug === params.slug
  })

  // Get featured posts from this category
  const featuredPosts = categoryPosts.filter(post => post.featured).slice(0, 2)

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
        categories={categories}
        featuredPosts={featuredPosts}
      />
    </>
  )
}
