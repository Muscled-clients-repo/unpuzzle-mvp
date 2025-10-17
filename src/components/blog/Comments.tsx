"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BlogComment } from "@/types/blog"
import { MessageSquare, ThumbsUp, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommentsProps {
  comments?: BlogComment[]
  postId: string
}

export function Comments({ comments = [], postId }: CommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      // In production, this would call an API to save the comment
      console.log("New comment:", newComment)
      setNewComment("")
    }
  }

  const toggleLike = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 30) return `${diffInDays} days ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="mt-12">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {comment.author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {comment.content}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleLike(comment.id)}
                  >
                    <ThumbsUp
                      className={cn(
                        "h-3 w-3 mr-1",
                        likedComments.has(comment.id) && "fill-current text-primary"
                      )}
                    />
                    {comment.likes + (likedComments.has(comment.id) ? 1 : 0)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
