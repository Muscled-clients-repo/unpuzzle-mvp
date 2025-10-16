import { Metadata } from 'next'
import { type BlogPost } from '@/lib/actions/blog-actions'

interface BlogSEOProps {
  post: BlogPost
  siteUrl?: string
}

export function generateBlogMetadata(post: BlogPost, siteUrl: string = 'https://unpuzzle.com'): Metadata {
  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt || post.title
  const imageUrl = post.og_image_url || post.featured_image_url || `${siteUrl}/og-default.jpg`
  const url = `${siteUrl}/blog/${post.slug}`
  const canonicalUrl = post.canonical_url || url

  const keywords = [
    post.focus_keyword,
    ...(post.additional_keywords || []),
  ].filter(Boolean)

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: post.author ? [{ name: post.author.full_name || 'Unpuzzle Team' }] : undefined,

    // Open Graph
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Unpuzzle',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: post.author?.full_name ? [post.author.full_name] : undefined,
      tags: post.categories?.map(c => c.name) || undefined,
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@unpuzzle',
      site: '@unpuzzle',
    },

    // Additional metadata
    alternates: {
      canonical: canonicalUrl,
    },

    // Robots
    robots: {
      index: post.status === 'published',
      follow: post.status === 'published',
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },

    // Other metadata
    other: {
      'article:published_time': post.published_at || '',
      'article:modified_time': post.updated_at,
      'article:author': post.author?.full_name || 'Unpuzzle Team',
      'reading_time': `${post.reading_time_minutes} min read`,
    },
  }
}

// Schema.org structured data for blog posts
export function generateBlogStructuredData(post: BlogPost, siteUrl: string = 'https://unpuzzle.com') {
  const imageUrl = post.featured_image_url || `${siteUrl}/og-default.jpg`
  const url = `${siteUrl}/blog/${post.slug}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    image: imageUrl,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author?.full_name || 'Unpuzzle Team',
      url: `${siteUrl}/team/${post.author?.id || 'unpuzzle'}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Unpuzzle',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: [
      post.focus_keyword,
      ...(post.additional_keywords || []),
    ].filter(Boolean).join(', '),
    articleSection: post.categories?.map(c => c.name).join(', ') || 'Learning',
    wordCount: post.word_count || undefined,
    timeRequired: post.reading_time_minutes ? `PT${post.reading_time_minutes}M` : undefined,
  }

  // Add FAQs if available in structured_data
  if (post.structured_data?.faqs) {
    structuredData['@graph'] = [
      structuredData,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.structured_data.faqs.map((faq: any) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ]
  }

  // Add HowTo if available in structured_data
  if (post.structured_data?.howto) {
    const howto = post.structured_data.howto
    structuredData['@graph'] = [
      ...(structuredData['@graph'] || [structuredData]),
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: howto.name,
        description: howto.description,
        step: howto.steps.map((step: any, index: number) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      },
    ]
  }

  return structuredData
}

// Component to render structured data script
export function BlogStructuredData({ post, siteUrl }: BlogSEOProps) {
  const structuredData = generateBlogStructuredData(post, siteUrl)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// AI/LLM Optimization: Generate citation-friendly summary
export function generateAISummary(post: BlogPost): string {
  if (post.ai_summary) {
    return post.ai_summary
  }

  // Fallback: Create a structured summary
  const summary = []

  summary.push(`Title: ${post.title}`)

  if (post.excerpt) {
    summary.push(`\nSummary: ${post.excerpt}`)
  }

  if (post.focus_keyword) {
    summary.push(`\nTopic: ${post.focus_keyword}`)
  }

  if (post.categories && post.categories.length > 0) {
    summary.push(`\nCategories: ${post.categories.map(c => c.name).join(', ')}`)
  }

  if (post.reading_time_minutes) {
    summary.push(`\nReading Time: ${post.reading_time_minutes} minutes`)
  }

  // Extract key points from content (first few paragraphs)
  const plainText = post.content.replace(/<[^>]*>/g, '')
  const paragraphs = plainText.split('\n\n').filter(p => p.trim().length > 50).slice(0, 3)

  if (paragraphs.length > 0) {
    summary.push('\nKey Points:')
    paragraphs.forEach((p, i) => {
      summary.push(`${i + 1}. ${p.trim().substring(0, 200)}...`)
    })
  }

  return summary.join('\n')
}

// SEO Score Calculator (0-100)
export function calculateSEOScore(post: BlogPost): {
  score: number
  checks: Array<{ name: string; passed: boolean; weight: number }>
} {
  const checks = [
    {
      name: 'Has title (50-60 characters)',
      passed: post.title.length >= 30 && post.title.length <= 60,
      weight: 10,
    },
    {
      name: 'Has meta description (120-160 characters)',
      passed: (post.meta_description || post.excerpt || '').length >= 120 &&
              (post.meta_description || post.excerpt || '').length <= 160,
      weight: 10,
    },
    {
      name: 'Has focus keyword',
      passed: !!post.focus_keyword,
      weight: 10,
    },
    {
      name: 'Has featured image',
      passed: !!post.featured_image_url,
      weight: 5,
    },
    {
      name: 'Content length (>800 words)',
      passed: (post.word_count || 0) >= 800,
      weight: 15,
    },
    {
      name: 'Has excerpt',
      passed: !!post.excerpt && post.excerpt.length > 50,
      weight: 5,
    },
    {
      name: 'Has categories',
      passed: (post.categories?.length || 0) > 0,
      weight: 5,
    },
    {
      name: 'Has additional keywords',
      passed: (post.additional_keywords?.length || 0) > 0,
      weight: 5,
    },
    {
      name: 'Has Open Graph image',
      passed: !!post.og_image_url || !!post.featured_image_url,
      weight: 5,
    },
    {
      name: 'URL slug is SEO-friendly',
      passed: post.slug.length > 3 && post.slug.includes('-') && !/\d{4}/.test(post.slug),
      weight: 5,
    },
    {
      name: 'Has structured data',
      passed: !!post.structured_data,
      weight: 10,
    },
    {
      name: 'Has AI summary for LLM citations',
      passed: !!post.ai_summary,
      weight: 10,
    },
    {
      name: 'Reading time calculated',
      passed: !!post.reading_time_minutes && post.reading_time_minutes > 0,
      weight: 5,
    },
  ]

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0)
  const passedWeight = checks
    .filter(check => check.passed)
    .reduce((sum, check) => sum + check.weight, 0)

  const score = Math.round((passedWeight / totalWeight) * 100)

  return { score, checks }
}
