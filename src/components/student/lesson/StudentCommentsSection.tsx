"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  MessageCircle, 
  ThumbsUp, 
  Reply,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { FeatureGate } from "@/config/features"

interface Comment {
  id: string
  author: {
    name: string
    avatar?: string
    role?: 'instructor' | 'moderator' | 'student'
  }
  content: string
  timestamp: Date
  likes: number
  replies: Comment[]
  isLiked?: boolean
}

interface StudentCommentsSectionProps {
  lessonId: string
  user: any
  onSignupPrompt?: () => void
}

export function StudentCommentsSection({ lessonId, user, onSignupPrompt }: StudentCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: {
        name: 'Sarah Chen',
        role: 'student'
      },
      content: 'Great explanation of hooks! The useState example really cleared things up for me.',
      timestamp: new Date(Date.now() - 3600000),
      likes: 12,
      replies: [
        {
          id: '2',
          author: {
            name: 'John Doe',
            role: 'instructor'
          },
          content: 'Glad it helped! Let me know if you have any specific questions about the implementation.',
          timestamp: new Date(Date.now() - 1800000),
          likes: 5,
          replies: []
        }
      ]
    },
    {
      id: '3',
      author: {
        name: 'Mike Johnson',
        role: 'student'
      },
      content: 'Can you explain the dependency array in useEffect a bit more? Still confused about when to include variables.',
      timestamp: new Date(Date.now() - 7200000),
      likes: 8,
      replies: []
    }
  ])
  
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('popular')

  const handleAddComment = () => {
    if (!user) {
      onSignupPrompt?.()
      return
    }
    
    if (!newComment.trim()) return
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: {
        name: user.name || 'You',
        role: 'student'
      },
      content: newComment,
      timestamp: new Date(),
      likes: 0,
      replies: []
    }
    
    setComments([comment, ...comments])
    setNewComment("")
  }

  const handleAddReply = (parentId: string) => {
    if (!user) {
      onSignupPrompt?.()
      return
    }
    
    if (!replyText.trim()) return
    
    const reply: Comment = {
      id: Date.now().toString(),
      author: {
        name: user.name || 'You',
        role: 'student'
      },
      content: replyText,
      timestamp: new Date(),
      likes: 0,
      replies: []
    }
    
    const updateReplies = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          return { ...comment, replies: [...comment.replies, reply] }
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: updateReplies(comment.replies) }
        }
        return comment
      })
    }
    
    setComments(updateReplies(comments))
    setReplyText("")
    setReplyingTo(null)
  }

  const handleLike = (commentId: string) => {
    if (!user) {
      onSignupPrompt?.()
      return
    }
    
    const updateLikes = (comments: Comment[]): Comment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !comment.isLiked
          }
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: updateLikes(comment.replies) }
        }
        return comment
      })
    }
    
    setComments(updateLikes(comments))
  }

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const formatTime = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={depth > 0 ? "ml-12 mt-4" : ""}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar} />
          <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            {comment.author.role === 'instructor' && (
              <Badge variant="default" className="text-xs">Instructor</Badge>
            )}
            {comment.author.role === 'moderator' && (
              <Badge variant="secondary" className="text-xs">Moderator</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(comment.timestamp)}
            </span>
          </div>
          
          <p className="text-sm mt-1">{comment.content}</p>
          
          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => handleLike(comment.id)}
            >
              <ThumbsUp className={`mr-1 h-3 w-3 ${comment.isLiked ? 'fill-current' : ''}`} />
              {comment.likes}
            </Button>
            
            <FeatureGate role="student" feature="comments">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            </FeatureGate>
            
            {comment.replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => toggleExpanded(comment.id)}
              >
                {expandedComments.has(comment.id) ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </Button>
            )}
          </div>
          
          {replyingTo === comment.id && (
            <FeatureGate role="student" feature="comments">
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAddReply(comment.id)}>
                    Post Reply
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyText("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </FeatureGate>
          )}
          
          {expandedComments.has(comment.id) && comment.replies.map(reply => 
            renderComment(reply, depth + 1)
          )}
        </div>
      </div>
    </div>
  )

  return (
    <FeatureGate role="student" feature="comments">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Discussion ({comments.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'popular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('popular')}
              >
                Popular
              </Button>
              <Button
                variant={sortBy === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('newest')}
              >
                Newest
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={user ? "Share your thoughts or ask a question..." : "Sign in to join the discussion"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={!user}
            />
            <Button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="w-full sm:w-auto"
            >
              Post Comment
            </Button>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            {comments.map(comment => renderComment(comment))}
          </div>
        </CardContent>
      </Card>
    </FeatureGate>
  )
}