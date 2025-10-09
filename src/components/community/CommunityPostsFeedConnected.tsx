'use client'

import React, { useState } from 'react'
import { Pin, MoreVertical, Heart, MessageCircle, Send, Crown, Loader2 } from 'lucide-react'
import { FilterDropdown } from '@/components/ui/filters'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import {
  getCommunityPosts,
  createCommunityPost,
  likePost,
  unlikePost,
  replyToPost,
  type CommunityPost
} from '@/app/actions/community-actions'
import { toast } from 'sonner'

export function CommunityPostsFeedConnected() {
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState('all')
  const [newPost, setNewPost] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // Fetch posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: async () => {
      const result = await getCommunityPosts()
      if (result.error) throw new Error(result.error)
      return result.posts || []
    }
  })

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: createCommunityPost,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Post created!')
      setNewPost('')
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    }
  })

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: likePost,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    }
  })

  // Unlike post mutation
  const unlikeMutation = useMutation({
    mutationFn: unlikePost,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    }
  })

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      replyToPost(postId, content),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Reply added!')
      setReplyContent('')
      setReplyingTo(null)
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    }
  })

  const filterOptions = [
    { value: 'all', label: 'All Posts' },
    { value: 'instructor', label: 'Instructor Posts' },
    { value: 'my-posts', label: 'My Posts' }
  ]

  const posts = postsData || []

  const filteredPosts = posts.filter(post => {
    switch (filter) {
      case 'instructor':
        return post.author?.role === 'instructor'
      case 'my-posts':
        return post.author_id === user?.id
      default:
        return true
    }
  })

  const handleSubmitPost = () => {
    if (!newPost.trim()) return
    createPostMutation.mutate(newPost)
  }

  const handleSubmitReply = (postId: string) => {
    if (!replyContent.trim()) return
    replyMutation.mutate({ postId, content: replyContent })
  }

  const handleLikePost = (post: CommunityPost) => {
    if (!user) {
      toast.error('Please sign in to like posts')
      return
    }

    const isLiked = post.likes.some(like => like.user_id === user.id)

    if (isLiked) {
      unlikeMutation.mutate(post.id)
    } else {
      likeMutation.mutate(post.id)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Post Creation Form */}
      {user && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share something with the community..."
            className="w-full resize-none border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500"
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmitPost}
              disabled={!newPost.trim() || createPostMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post
            </button>
          </div>
        </div>
      )}

      {/* Filter Dropdown */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Community Posts</h2>
        <FilterDropdown
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          placeholder="Filter posts..."
        />
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No posts yet. Be the first to post!
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = user ? post.likes.some(like => like.user_id === user.id) : false
            const authorName = post.author?.full_name || 'Unknown'
            const authorGoal = post.author?.track_goals?.name || 'No goal set'

            return (
              <div key={post.id} className={`bg-white border border-gray-200 rounded-lg ${
                post.author?.role === 'instructor' ? 'border-l-4 border-l-blue-600' : ''
              }`}>
                {/* Post Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{authorName}</span>
                          {post.author?.role === 'instructor' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-full">
                              <Crown className="h-3 w-3" />
                              Instructor
                            </span>
                          )}
                          {post.is_pinned && <Pin className={`h-4 w-4 ${
                            post.author?.role === 'instructor' ? 'text-yellow-500' : 'text-gray-500'
                          }`} />}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">Goal: {authorGoal}</div>
                        <span className="text-sm text-gray-500">{formatTimestamp(post.created_at)}</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4">
                  <p className={`leading-relaxed ${
                    post.author?.role === 'instructor' ? 'text-gray-900 text-base' : 'text-gray-900'
                  }`}>{post.content}</p>
                </div>

                {/* Post Actions */}
                <div className="px-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => handleLikePost(post)}
                      disabled={likeMutation.isPending || unlikeMutation.isPending}
                      className={`flex items-center gap-2 text-sm hover:text-red-600 transition-colors ${
                        isLiked ? 'text-red-600' : 'text-gray-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </button>
                    <button
                      onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Reply ({post.replies_count})
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {post.replies.length > 0 && (
                  <div className="p-4 bg-gray-50 space-y-3">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {reply.author_id.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">User</span>
                              <span className="text-xs text-gray-500">{formatTimestamp(reply.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-900">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === post.id && user && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full resize-none border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitReply(post.id)}
                            disabled={!replyContent.trim() || replyMutation.isPending}
                            className="px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            {replyMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Reply'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
