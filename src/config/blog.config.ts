/**
 * Blog System Configuration
 * Centralized configuration for blog routes, storage, and features
 */

export interface BlogConfig {
  routes: {
    admin: string
    public: string
    api?: string
  }
  storage: {
    provider: 'backblaze' | 's3' | 'cloudflare-r2'
  }
  images: {
    autoGenerate: boolean
    provider?: 'unsplash' | 'dalle' | 'templates'
  }
  seo: {
    siteName: string
    siteUrl: string
  }
}

export const blogConfig: BlogConfig = {
  routes: {
    admin: '/admin/blog',
    public: '/blog',
    api: '/api/blog'
  },
  storage: {
    provider: 'backblaze'
  },
  images: {
    autoGenerate: true,
    provider: 'unsplash'
  },
  seo: {
    siteName: 'Unpuzzle Blog',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://unpuzzle.com'
  }
}
