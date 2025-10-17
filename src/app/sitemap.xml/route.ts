import { getPublishedBlogPosts } from '@/lib/blog/get-published-posts'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

/**
 * Generate XML sitemap dynamically
 * Includes: homepage, blog listing, all published blog posts
 */
export async function GET() {
  try {
    const posts = await getPublishedBlogPosts() || []

    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Blog Listing -->
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Blog Posts -->
${posts.map(post => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}

</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
