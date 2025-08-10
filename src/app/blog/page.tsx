import { Metadata } from 'next'
import { BlogListingClient } from './blog-listing-client'
import { blogPosts, categories } from '@/data/blog-posts'

export const metadata: Metadata = {
  title: 'Blog - Unpuzzle | Learning Insights & AI Education',
  description: 'Discover strategies, stories, and insights from our community of learners and educators. Learn about AI in education, active learning, and more.',
  openGraph: {
    title: 'Unpuzzle Blog - Learning Insights & AI Education',
    description: 'Discover strategies, stories, and insights from our community of learners and educators.',
    type: 'website',
  },
}

// This page is statically generated at build time
export default function BlogPage() {
  // Get featured posts server-side
  const featuredPosts = blogPosts.filter(post => post.featured).slice(0, 2)
  
  return (
    <BlogListingClient 
      initialPosts={blogPosts}
      categories={categories}
      featuredPosts={featuredPosts}
    />
  )
}