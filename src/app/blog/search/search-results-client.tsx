'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Clock, ArrowRight, ChevronRight } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  publishedAt: string
  readingTime: number
  featuredImageUrl?: string
}

interface SearchResultsClientProps {
  query: string
  initialResults: SearchResult[]
}

export function SearchResultsClient({ query, initialResults }: SearchResultsClientProps) {
  const [searchQuery, setSearchQuery] = useState(query)
  const results = initialResults

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/blog/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <div className="container px-4 py-8 max-w-6xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Search</span>
          </nav>

          {/* Search Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Search Blog</h1>

            <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            {query && (
              <p className="text-muted-foreground mt-4">
                Found <span className="font-semibold text-foreground">{results.length}</span> {results.length === 1 ? 'result' : 'results'} for "{query}"
              </p>
            )}
          </div>

          {/* Search Results */}
          {results.length > 0 ? (
            <div className="space-y-8">
              {results.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block p-6 border rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Featured Image */}
                    {post.featuredImageUrl && (
                      <div className="md:w-48 h-32 bg-gradient-to-br from-primary/10 to-purple-600/10 rounded flex-shrink-0" />
                    )}

                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-2">
                        {post.category}
                      </Badge>

                      <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>

                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>

                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min read
                        </div>

                        <ArrowRight className="h-4 w-4 ml-auto group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : query ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No results found for "{query}"</p>
              <Link href="/blog">
                <Button variant="outline">View All Posts</Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Enter a search term to find blog posts</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
