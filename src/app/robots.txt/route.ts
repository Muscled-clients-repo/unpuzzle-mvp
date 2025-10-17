import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

/**
 * Generate dynamic robots.txt
 * Allows all crawlers, references sitemap
 */
export async function GET() {
  const robotsTxt = `# Unpuzzle Robots.txt
# https://www.robotstxt.org/

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml

# Disallow admin routes
User-agent: *
Disallow: /admin/
Disallow: /api/

# Disallow private/draft content
User-agent: *
Disallow: /draft/

# Crawl-delay (optional, adjust if needed)
# User-agent: *
# Crawl-delay: 10
`

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    }
  })
}
