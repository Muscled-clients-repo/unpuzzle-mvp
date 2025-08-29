"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BlogPost } from "@/types/blog"
import { useAppStore } from "@/stores/app-store"
import { 
  Calendar, 
  Clock, 
  ArrowRight,
  ThumbsUp,
  Tag,
  Twitter,
  Linkedin,
  Link2,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BlogDetailClientProps {
  post: BlogPost
  relatedPosts: BlogPost[]
}

export function BlogDetailClient({ post, relatedPosts }: BlogDetailClientProps) {
  const { 
    likedPosts,
    toggleLikePost
  } = useAppStore()
  
  const isLiked = likedPosts.includes(post.id)

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    if (email) {
      console.log('Newsletter subscription:', email)
      e.currentTarget.reset()
    }
  }

  const formatContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold mt-6 mb-3">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{line.replace('## ', '')}</h2>
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{line.replace('# ', '')}</h1>
      }
      
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-6 mb-2 list-disc">
            {line.replace('- ', '')}
          </li>
        )
      }
      
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part
            )}
          </p>
        )
      }
      
      if (line.trim()) {
        return <p key={index} className="mb-4 text-muted-foreground leading-relaxed">{line}</p>
      }
      
      return null
    })
  }

  const handleShare = (platform: string) => {
    const url = window.location.href
    const text = `Check out "${post.title}" on Unpuzzle`
    
    switch(platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
        break
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        break
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        <article className="container max-w-4xl mx-auto px-4 py-12">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{post.category}</span>
          </nav>

          <header className="mb-8">
            <Badge className="mb-4" variant="secondary">
              {post.category}
            </Badge>
            
            <h1 className="text-4xl font-bold mb-4">
              {post.title}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-6">
              {post.excerpt}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <p className="font-medium text-foreground">{post.author.name}</p>
                  <p className="text-xs">{post.author.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </div>
            </div>
          </header>

          <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-lg mb-8" />

          <div className="flex items-center justify-between py-4 mb-8 border-y">
            <div className="flex items-center gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLikePost(post.id)}
              >
                <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="ml-2">{isLiked ? "Liked" : "Like"}</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare('linkedin')}
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare('copy')}
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            {formatContent(post.content)}
          </div>

          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
            <span className="text-sm font-medium">Tags:</span>
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="bg-muted rounded-lg p-6 mt-12">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-background" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">About {post.author.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{post.author.role}</p>
                <p className="text-sm text-muted-foreground">
                  Passionate about transforming education through technology. 
                  Helping thousands of learners achieve their goals through AI-enhanced learning experiences.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                  <Button size="sm" variant="outline">
                    Follow
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <section className="bg-muted py-12">
            <div className="container max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link 
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.slug}`}
                    className="group"
                  >
                    <div className="bg-background rounded-lg p-6 hover:shadow-lg transition-all">
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-purple-600/10 rounded mb-4" />
                      
                      <Badge variant="secondary" className="mb-2">
                        {relatedPost.category}
                      </Badge>
                      
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {relatedPost.excerpt}
                      </p>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {relatedPost.readingTime} min read
                        <ArrowRight className="h-4 w-4 ml-auto group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="container max-w-4xl mx-auto px-4 py-12">
          <div className="bg-primary rounded-lg p-8 text-primary-foreground text-center">
            <h2 className="text-2xl font-bold mb-4">
              Enjoyed this article?
            </h2>
            <p className="mb-6 opacity-90">
              Get weekly insights on learning, AI, and education delivered to your inbox
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