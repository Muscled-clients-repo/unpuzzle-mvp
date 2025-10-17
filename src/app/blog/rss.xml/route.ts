import { blogPosts } from '@/data/blog-posts'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

function generateRssItem(post: typeof blogPosts[0]): string {
  return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author><![CDATA[${post.author.name}]]></author>
      <category><![CDATA[${post.category}]]></category>
      ${post.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('\n      ')}
    </item>
  `
}

function generateRssFeed(): string {
  const rssItems = blogPosts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(generateRssItem)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Unpuzzle Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Insights on Learning, AI, and Education</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <copyright>Copyright ${new Date().getFullYear()} Unpuzzle</copyright>
    <generator>Next.js</generator>
    ${rssItems}
  </channel>
</rss>`
}

export async function GET() {
  const feed = generateRssFeed()

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
