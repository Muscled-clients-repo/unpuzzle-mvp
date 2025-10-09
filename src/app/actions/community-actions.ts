'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Community post with likes/replies in JSONB
 */
export interface CommunityPost {
  id: string
  author_id: string
  content: string
  is_pinned: boolean
  likes: Array<{ user_id: string; created_at: string }>
  replies: Array<{
    id: string
    author_id: string
    content: string
    created_at: string
  }>
  likes_count: number
  replies_count: number
  created_at: string
  updated_at: string
  // Joined data
  author?: {
    id: string
    full_name: string | null
    role: string | null
    current_goal_id: string | null
    track_goals?: {
      name: string
    } | null
  }
}

/**
 * Get all community posts with author info
 */
export async function getCommunityPosts() {
  try {
    const supabase = await createClient()

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_author_id_fkey(
          id,
          full_name,
          role,
          current_goal_id,
          track_goals(name)
        )
      `)
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching community posts:', error)
      return { error: 'Failed to fetch posts' }
    }

    return { posts: posts as CommunityPost[] }
  } catch (error) {
    console.error('Error in getCommunityPosts:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new community post
 */
export async function createCommunityPost(content: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    if (!content.trim()) {
      return { error: 'Post content cannot be empty' }
    }

    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .insert({
        author_id: user.id,
        content: content.trim()
        // Let DB defaults handle likes, replies, counts
      })
      .select()
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      return { error: 'Failed to create post' }
    }

    console.log('Post created successfully:', post)
    revalidatePath('/community')
    return { success: true, post }
  } catch (error) {
    console.error('Error in createCommunityPost:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Like a post (uses Postgres function)
 */
export async function likePost(postId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: likeError } = await supabase.rpc('add_post_like', {
      post_id: postId,
      user_id: user.id
    })

    if (likeError) {
      console.error('Error liking post:', likeError)
      return { error: 'Failed to like post' }
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in likePost:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Unlike a post (uses Postgres function)
 */
export async function unlikePost(postId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: unlikeError } = await supabase.rpc('remove_post_like', {
      post_id: postId,
      user_id: user.id
    })

    if (unlikeError) {
      console.error('Error unliking post:', unlikeError)
      return { error: 'Failed to unlike post' }
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in unlikePost:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Reply to a post (uses Postgres function)
 */
export async function replyToPost(postId: string, replyContent: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    if (!replyContent.trim()) {
      return { error: 'Reply content cannot be empty' }
    }

    const { data: replyId, error: replyError } = await supabase.rpc('add_post_reply', {
      post_id: postId,
      author_id: user.id,
      reply_content: replyContent.trim()
    })

    if (replyError) {
      console.error('Error replying to post:', replyError)
      return { error: 'Failed to add reply' }
    }

    revalidatePath('/community')
    return { success: true, replyId }
  } catch (error) {
    console.error('Error in replyToPost:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a post (soft delete)
 */
export async function deletePost(postId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Security: Verify ownership with RLS-protected query
    // This ensures user can only see posts they own
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .eq('author_id', user.id) // Add this to leverage RLS
      .single()

    if (postError || !post) {
      return { error: 'Post not found or you do not have permission' }
    }

    // Use service role for the UPDATE to bypass problematic RLS WITH CHECK
    // SECURITY: This is safe because we've verified ownership with RLS above
    // The .eq('author_id', user.id) ensures we can only delete our own posts
    const { createServiceClient } = await import('@/lib/supabase/server')
    const adminClient = createServiceClient()

    const { error: deleteError } = await adminClient
      .from('community_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_id', user.id) // Double-check: only update if still owned by user

    if (deleteError) {
      console.error('Error deleting post:', deleteError)
      return { error: 'Failed to delete post' }
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in deletePost:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Pin/unpin a post (admin/instructor only)
 */
export async function togglePinPost(postId: string, isPinned: boolean) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return { error: 'Only instructors can pin posts' }
    }

    const { error: pinError } = await supabase
      .from('community_posts')
      .update({ is_pinned: isPinned })
      .eq('id', postId)

    if (pinError) {
      console.error('Error toggling pin:', pinError)
      return { error: 'Failed to update post' }
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in togglePinPost:', error)
    return { error: 'An unexpected error occurred' }
  }
}
