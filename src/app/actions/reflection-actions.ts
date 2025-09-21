'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}

export async function getReflectionsAction(videoId: string, courseId: string) {
  try {
    const user = await requireAuth()
    const supabase = createServiceClient()

    const { data: reflections, error } = await supabase
      .from('reflections')
      .select(`
        id,
        user_id,
        video_id,
        course_id,
        reflection_type,
        reflection_text,
        reflection_prompt,
        created_at,
        updated_at,
        file_url,
        duration_seconds,
        video_timestamp_seconds
      `)
      .eq('video_id', videoId)
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch reflections:', error)
      return { success: false, error: 'Failed to fetch reflections' }
    }

    return { success: true, data: reflections }
  } catch (error) {
    console.error('Get reflections error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function deleteAllVoiceMemosAction() {
  try {
    const user = await requireAuth()
    const supabase = createServiceClient()

    // Get all voice memo reflections for this user
    const { data: voiceMemos, error: fetchError } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', user.id)
      .eq('reflection_type', 'voice')

    if (fetchError) {
      console.error('Failed to fetch voice memos:', fetchError)
      return { success: false, error: 'Failed to fetch voice memos' }
    }

    console.log(`[DELETE] Found ${voiceMemos?.length || 0} voice memos to delete`)

    // Delete all voice memo reflections from database
    const { error: deleteError } = await supabase
      .from('reflections')
      .delete()
      .eq('user_id', user.id)
      .eq('reflection_type', 'voice')

    if (deleteError) {
      console.error('Failed to delete voice memos from database:', deleteError)
      return { success: false, error: 'Failed to delete voice memos from database' }
    }

    // Note: Files in Backblaze could be deleted here, but they'll be cleaned up automatically
    // when their lifecycle expires, or you could implement a cleanup job

    return {
      success: true,
      message: `Successfully deleted ${voiceMemos?.length || 0} voice memos`
    }
  } catch (error) {
    console.error('Delete voice memos error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function submitReflectionAction(formData: FormData) {
  try {
    // 1. Authenticate user
    const user = await requireAuth()

    // 2. Extract and validate required fields from FormData
    const type = formData.get('type') as string
    const videoId = formData.get('videoId') as string
    const courseId = formData.get('courseId') as string
    const videoTimestampStr = formData.get('videoTimestamp') as string
    const file = formData.get('file') as File | null
    const loomUrl = formData.get('loomUrl') as string | null
    const durationStr = formData.get('duration') as string | null

    if (!type || !videoId || !courseId || !videoTimestampStr) {
      return {
        success: false,
        error: 'Missing required fields: type, videoId, courseId, videoTimestamp'
      }
    }

    const videoTimestamp = parseFloat(videoTimestampStr)
    const duration = durationStr ? parseFloat(durationStr) : undefined

    if (isNaN(videoTimestamp)) {
      return {
        success: false,
        error: 'Invalid videoTimestamp'
      }
    }

    // 3. Create service client
    const supabase = createServiceClient()

    // 4. Verify user has access to this video/course
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, course_id, courses!inner(id, instructor_id)')
      .eq('id', videoId)
      .eq('course_id', courseId)
      .single()

    if (videoError || !video) {
      return { success: false, error: 'Video not found or access denied' }
    }

    let contentUrl = null

    // 5. Handle file upload for voice and screenshot types
    if (type === 'voice' || type === 'screenshot') {
      if (!file) {
        return { success: false, error: 'File is required for voice and screenshot reflections' }
      }

      // Validate file type
      if (type === 'voice' && !file.type.startsWith('audio/')) {
        return { success: false, error: 'Invalid file type for voice memo. Must be audio file.' }
      }

      if (type === 'screenshot' && !file.type.startsWith('image/')) {
        return { success: false, error: 'Invalid file type for screenshot. Must be image file.' }
      }

      // Upload to Backblaze
      try {
        const fileName = `reflections/${user.id}/${Date.now()}-${file.name}`
        const uploadResult = await backblazeService.uploadVideo(file, fileName)
        contentUrl = uploadResult.fileUrl
      } catch (uploadError) {
        console.error('File upload failed:', uploadError)
        return { success: false, error: 'File upload failed' }
      }
    } else if (type === 'loom') {
      if (!loomUrl) {
        return { success: false, error: 'Loom URL is required for loom reflections' }
      }
      contentUrl = loomUrl
    }

    // 6. Prepare reflection text (simplified, no metadata)
    const reflectionText = `${type} reflection captured at ${videoTimestamp}s`

    // 7. Save reflection to database with proper columns (industry standard)
    const { data: reflection, error: insertError } = await supabase
      .from('reflections')
      .insert({
        user_id: user.id,
        video_id: videoId,
        course_id: courseId,
        reflection_type: type,
        reflection_text: reflectionText,
        reflection_prompt: `Captured ${type} reflection at video timestamp ${videoTimestamp}`,
        // Industry standard: Store metadata in separate columns
        file_url: contentUrl,
        duration_seconds: duration,
        video_timestamp_seconds: videoTimestamp,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert failed:', insertError)
      return { success: false, error: 'Failed to save reflection' }
    }

    return {
      success: true,
      data: {
        ...reflection,
        fileUrl: contentUrl // Include the file URL for playback
      }
    }

  } catch (error) {
    console.error('Reflection submission error:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}