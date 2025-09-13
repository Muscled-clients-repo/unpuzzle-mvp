'use client'

import React, { useState } from 'react'
import { Pin, MoreVertical, Heart, MessageCircle, Send, Crown } from 'lucide-react'
import { FilterDropdown } from '@/components/ui/filters'

interface Post {
  id: string
  author: {
    name: string
    role: 'instructor' | 'member'
    avatar?: string
  }
  content: string
  timestamp: string
  isPinned: boolean
  likes: number
  replies: Reply[]
  isLiked: boolean
}

interface Reply {
  id: string
  author: {
    name: string
    role: 'instructor' | 'member'
  }
  content: string
  timestamp: string
}

export function CommunityPostsFeed() {
  const [filter, setFilter] = useState('all')
  const [newPost, setNewPost] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // Mock data - replace with real data later
  const mockPosts: Post[] = [
    {
      id: '1',
      author: { name: 'Mahtab', role: 'instructor' },
      content: '🎉 Welcome to our founding members! This week we\'re focusing on setting up your first Claude Code project. Don\'t forget to join tomorrow\'s live Q&A at 3 PM EST.',
      timestamp: '2 hours ago',
      isPinned: true,
      likes: 12,
      replies: [
        {
          id: '1-1',
          author: { name: 'Sarah M.', role: 'member' },
          content: 'Thanks for the welcome! Excited to get started.',
          timestamp: '1 hour ago'
        }
      ],
      isLiked: false
    },
    {
      id: '2',
      author: { name: 'John D.', role: 'member' },
      content: 'Just hit my first $1k milestone! 🎯 The Claude Code techniques are incredible - built my first Shopify app in just 3 days. Thanks to everyone for the support!',
      timestamp: '4 hours ago',
      isPinned: false,
      likes: 28,
      replies: [
        {
          id: '2-1',
          author: { name: 'Lisa K.', role: 'member' },
          content: 'Congratulations! That\'s amazing progress.',
          timestamp: '3 hours ago'
        },
        {
          id: '2-2',
          author: { name: 'Mahtab', role: 'instructor' },
          content: 'Outstanding work John! You\'re ahead of schedule - keep it up! 🚀',
          timestamp: '3 hours ago'
        }
      ],
      isLiked: true
    },
    {
      id: '3',
      author: { name: 'Lisa K.', role: 'member' },
      content: 'Quick question - what\'s the best way to handle API rate limits when building with Claude Code? Running into some issues with my current project.',
      timestamp: '6 hours ago',
      isPinned: false,
      likes: 5,
      replies: [
        {
          id: '3-1',
          author: { name: 'Mike R.', role: 'member' },
          content: 'I had the same issue! Try implementing exponential backoff - worked great for me.',
          timestamp: '5 hours ago'
        }
      ],
      isLiked: false
    }
  ]

  const filterOptions = [
    { value: 'all', label: 'All Posts' },
    { value: 'instructor', label: 'Instructor Posts' },
    { value: 'my-posts', label: 'My Posts' }
  ]

  const filteredPosts = mockPosts.filter(post => {
    switch (filter) {
      case 'instructor':
        return post.author.role === 'instructor'
      case 'my-posts':
        // For demo, show posts from 'current user' (you'd use actual user ID)
        return post.author.name === 'John D.'
      default:
        return true
    }
  }).sort((a, b) => {
    // Pinned posts first
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })

  const handleSubmitPost = () => {
    if (!newPost.trim()) return
    // Handle post submission here
    console.log('New post:', newPost)
    setNewPost('')
  }

  const handleSubmitReply = (postId: string) => {
    if (!replyContent.trim()) return
    // Handle reply submission here
    console.log('Reply to:', postId, 'Content:', replyContent)
    setReplyContent('')
    setReplyingTo(null)
  }

  const handleLikePost = (postId: string) => {
    // Handle like/unlike logic
    console.log('Toggle like for post:', postId)
  }

  return (
    <div className="space-y-6">
      {/* Post Creation Form */}
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
            disabled={!newPost.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Post
          </button>
        </div>
      </div>

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
        {filteredPosts.map((post) => (
          <div key={post.id} className={`bg-white border border-gray-200 rounded-lg ${
            post.author.role === 'instructor' ? 'border-l-4 border-l-blue-600' : ''
          }`}>
            {/* Post Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {post.author.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{post.author.name}</span>
                      {post.author.role === 'instructor' && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs rounded-full">
                          <Crown className="h-3 w-3" />
                          Instructor
                        </span>
                      )}
                      {post.isPinned && <Pin className={`h-4 w-4 ${
                        post.author.role === 'instructor' ? 'text-yellow-500' : 'text-gray-500'
                      }`} />}
                    </div>
                    <span className="text-sm text-gray-500">{post.timestamp}</span>
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
                post.author.role === 'instructor' ? 'text-gray-900 text-base' : 'text-gray-900'
              }`}>{post.content}</p>
            </div>

            {/* Post Actions */}
            <div className="px-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => handleLikePost(post.id)}
                  className={`flex items-center gap-2 text-sm hover:text-red-600 transition-colors ${
                    post.isLiked ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                  {post.likes}
                </button>
                <button
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Reply
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
                        {reply.author.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">{reply.author.name}</span>
                          {reply.author.role === 'instructor' && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              Instructor
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{reply.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-900">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === post.id && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700">You</span>
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
                        disabled={!replyContent.trim()}
                        className="px-3 py-1 bg-gray-900 text-white text-sm rounded hover:bg-black transition-colors disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}