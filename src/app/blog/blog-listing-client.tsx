"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useAppStore } from "@/stores/app-store"
import { BlogPost } from "@/types/blog"
import { 
  Calendar, 
  Clock, 
  Search, 
  ArrowRight,
  TrendingUp,
  BookOpen,
  Tag
} from "lucide-react"

interface BlogListingClientProps {
  initialPosts: BlogPost[]
  categories: Array<{ name: string; slug: string; count: number }>
  featuredPosts: BlogPost[]
}

export function BlogListingClient({ 
  initialPosts, 
  categories, 
  featuredPosts 
}: BlogListingClientProps) {
  const { 
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery
  } = useAppStore()

  // Filter posts client-side based on UI state
  const filteredPosts = useMemo(() => {
    return initialPosts.filter(post => {
      const matchesCategory = selectedCategory === 'all' || 
        post.category.toLowerCase().replace(' & ', '-').replace(' ', '-') === selectedCategory
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesCategory && matchesSearch
    })
  }, [initialPosts, selectedCategory, searchQuery])

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    if (email) {
      // In production, this would call an API endpoint
      console.log('Newsletter subscription:', email)
      e.currentTarget.reset()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-16">
          <div className="container px-4">
            <div className="text-center max-w-3xl mx-auto">
              <Badge className="mb-4" variant="secondary">
                <BookOpen className="mr-1 h-3 w-3" />
                Unpuzzle Blog
              </Badge>
              <h1 className="text-4xl font-bold mb-4">
                Insights on Learning, AI, and Education
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Discover strategies, stories, and insights from our community of learners and educators
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-12"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b">
          <div className="container px-4 py-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <Button
                  key={category.slug}
                  variant={selectedCategory === category.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.slug)}
                  className="whitespace-nowrap"
                >
                  {category.name}
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {selectedCategory === "all" && searchQuery === "" && featuredPosts.length > 0 && (
          <section className="container px-4 py-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Featured Articles</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {featuredPosts.map(post => (
                <Card key={post.id} className="group hover:shadow-lg transition-all">
                  <Link href={`/blog/${post.slug}`}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </div>
                    
                    <CardHeader>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min read
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground line-clamp-2 mt-2">
                        {post.excerpt}
                      </p>
                    </CardHeader>
                    
                    <CardFooter className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted" />
                        <div>
                          <p className="text-sm font-medium">{post.author.name}</p>
                          <p className="text-xs text-muted-foreground">{post.author.role}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardFooter>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Posts */}
        <section className="container px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory === "all" ? "All Articles" : `${categories.find(c => c.slug === selectedCategory)?.name} Articles`}
          </h2>
          
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <Card key={post.id} className="group hover:shadow-lg transition-all">
                  <Link href={`/blog/${post.slug}`}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-purple-600/10" />
                      <Badge className="absolute top-4 left-4" variant="secondary">
                        {post.category}
                      </Badge>
                    </div>
                    
                    <CardHeader>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min
                        </span>
                      </div>
                      
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                        {post.excerpt}
                      </p>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="mr-1 h-2 w-2" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-6 w-6 rounded-full bg-muted" />
                        <p className="text-sm text-muted-foreground">{post.author.name}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </div>
                    </CardFooter>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter CTA */}
        <section className="bg-primary py-12 text-primary-foreground">
          <div className="container px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Stay Updated with Learning Insights
            </h2>
            <p className="mb-6 opacity-90 max-w-xl mx-auto">
              Get weekly tips on effective learning, AI in education, and exclusive content from our instructors
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-3 max-w-md mx-auto">
              <Input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
              <Button type="submit" variant="secondary">
                Subscribe
              </Button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}