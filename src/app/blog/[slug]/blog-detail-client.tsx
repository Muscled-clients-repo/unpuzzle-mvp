"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BlogPost } from "@/types/blog"
import { EnhancedAuthorBio } from "@/components/blog/EnhancedAuthorBio"
import { TableOfContents } from "@/components/blog/TableOfContents"
import { SocialProof } from "@/components/blog/SocialProof"
import { ReadingProgress } from "@/components/blog/ReadingProgress"
import { Comments } from "@/components/blog/Comments"
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
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
  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    if (email) {
      console.log('Newsletter subscription:', email)
      e.currentTarget.reset()
    }
  }

  // Check if content is HTML (from Tiptap) or markdown
  const isHtmlContent = (content: string) => {
    return content.trim().startsWith('<')
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
      <ReadingProgress />
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container px-4 py-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8 max-w-7xl mx-auto">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{post.category}</span>
          </nav>

          <div className="flex gap-12 max-w-7xl mx-auto">
            {/* Left sidebar: TOC + Author Bio */}
            <aside className="hidden lg:block w-[280px] shrink-0">
              <div className="sticky top-24 space-y-8">
                <TableOfContents content={post.content} />
                <EnhancedAuthorBio author={post.author} compact={true} />
              </div>
            </aside>

            <article className="flex-1 max-w-4xl mx-auto">
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
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {post.author.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
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

              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Updated {new Date(post.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </div>
            </div>

            {post.views > 0 && (
              <SocialProof
                views={post.views}
                likes={post.likes}
                shares={post.shares}
                className="mt-6 pt-6 border-t"
              />
            )}
          </header>

          {/* Featured image removed for now */}

          <div className="flex items-center justify-end py-4 mb-8 border-y">
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

          <div
            className="prose prose-lg max-w-none min-h-[200px] prose-headings:scroll-mt-20 prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:mb-4 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:hover:underline prose-strong:text-foreground prose-strong:font-semibold prose-ul:ml-6 prose-ul:mb-4 prose-li:mb-2 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-img:rounded-lg prose-img:max-w-full"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
              <span className="text-sm font-medium">Tags:</span>
              {post.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {post.comments && post.comments.length > 0 && (
            <Comments comments={post.comments} postId={post.id} />
          )}
            </article>
          </div>
        </div>

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