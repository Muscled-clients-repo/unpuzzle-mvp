import { getPublishedBlogPosts } from '@/lib/blog/get-published-posts'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.co'

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

/**
 * Generate RSS feed dynamically
 * Includes all published blog posts
 */
export async function GET() {
  try {
    const posts = await getPublishedBlogPosts() || []

    // Build RSS feed XML
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Unpuzzle Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Insights on Learning, AI, and Education from Unpuzzle</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>Unpuzzle Blog System</generator>
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>Unpuzzle Blog</title>
      <link>${SITE_URL}/blog</link>
    </image>

${posts.map(post => {
  const author = post.author?.full_name || 'Unpuzzle Team'
  const category = post.blog_categories?.name || 'Uncategorized'
  const pubDate = new Date(post.published_at || post.created_at).toUTCString()

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <category>${escapeXml(category)}</category>
      ${post.featured_image_url ? `<enclosure url="${escapeXml(post.featured_image_url)}" type="image/webp" />` : ''}
    </item>`
}).join('\n')}

  </channel>
</rss>`

    return new NextResponse(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('RSS feed generation error:', error)
    return new NextResponse('Error generating RSS feed', { status: 500 })
  }
}
