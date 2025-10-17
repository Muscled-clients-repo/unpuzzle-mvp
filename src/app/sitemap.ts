import { MetadataRoute } from 'next'
import {
  getPublishedBlogPosts,
  getBlogCategories,
  getBlogTags
} from '@/lib/blog/get-published-posts'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch blog data from database
  const [postsData, categoriesData, tagsData] = await Promise.all([
    getPublishedBlogPosts(),
    getBlogCategories(),
    getBlogTags()
  ])

  const posts = postsData || []
  const categories = categoriesData || []
  const tags = tagsData || []

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.published_at || post.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/blog/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Tag pages
  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/blog/tag/${tag.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages, ...categoryPages, ...tagPages]
}
