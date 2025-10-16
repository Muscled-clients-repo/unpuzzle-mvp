import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/instructor/',
          '/student/onboarding/',
          '/_next/',
          '/admin/'
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
