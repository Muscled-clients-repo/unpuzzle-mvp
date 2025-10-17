export interface BlogComment {
  id: string
  author: string
  avatar?: string
  content: string
  createdAt: string
  likes: number
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  author: {
    name: string
    avatar: string
    role: string
    bio?: string
    credentials?: string[]
    social?: {
      linkedin?: string
      twitter?: string
      github?: string
    }
  }
  category: string
  tags: string[]
  publishedAt: string
  updatedAt?: string
  readingTime: number
  image: string
  featured: boolean
  // Phase 3: Engagement metrics
  views?: number
  likes?: number
  shares?: number
  comments?: BlogComment[]
}

export interface BlogCategory {
  name: string
  slug: string
  count: number
}