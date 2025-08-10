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
  }
  category: string
  tags: string[]
  publishedAt: string
  readingTime: number
  image: string
  featured: boolean
}

export interface BlogCategory {
  name: string
  slug: string
  count: number
}