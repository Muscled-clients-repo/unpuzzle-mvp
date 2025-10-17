import { BlogPost } from "@/types/blog"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://unpuzzle.com"

/**
 * Generates Organization schema for Unpuzzle
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Unpuzzle",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "AI-powered learning platform transforming education through personalized learning experiences",
    sameAs: [
      // Add social media links here when available
      // "https://twitter.com/unpuzzle",
      // "https://linkedin.com/company/unpuzzle"
    ]
  }
}

/**
 * Generates Person schema for blog post author
 */
export function generatePersonSchema(author: BlogPost['author']) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    image: author.avatar ? `${SITE_URL}${author.avatar}` : undefined,
    // Add social links when author.social is available in Phase 2
  }
}

/**
 * Generates Article schema for blog post
 */
export function generateArticleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.image ? `${SITE_URL}${post.image}` : undefined,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "Unpuzzle",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`
      }
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
    inLanguage: "en-US",
    // ISO 8601 duration format (PT5M = 5 minutes)
    timeRequired: `PT${post.readingTime}M`
  }
}

/**
 * Generates BreadcrumbList schema for blog post
 */
export function generateBreadcrumbSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`
      }
    ]
  }
}

/**
 * Generates BlogPosting list schema for blog listing page
 */
export function generateBlogListSchema(posts: BlogPost[]) {
  const safePosts = posts || []
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Unpuzzle Blog",
    description: "Insights on Learning, AI, and Education",
    url: `${SITE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Unpuzzle",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`
      }
    },
    blogPost: safePosts.slice(0, 10).map(post => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      author: {
        "@type": "Person",
        name: post.author.name
      }
    }))
  }
}

/**
 * Helper function to render JSON-LD script tag
 */
export function renderJsonLd(data: object) {
  return {
    __html: JSON.stringify(data)
  }
}
