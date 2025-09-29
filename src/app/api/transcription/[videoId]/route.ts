import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Transcript API: Auth failed', { authError, hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Transcript API: User authenticated', { userId: user.id, videoId })

    // Get video and transcript via junction table (simplified RLS)
    const { data: mediaWithTranscript, error: mediaError } = await supabase
      .from('media_files')
      .select(`
        id,
        name,
        file_type,
        course_chapter_media!inner (
          id,
          title,
          transcript_text,
          transcript_file_path,
          transcript_segments,
          transcript_status,
          transcript_uploaded_at,
          course_chapters!inner (
            id,
            title,
            course_id,
            courses!inner (
              id,
              title,
              instructor_id
            )
          )
        )
      `)
      .eq('id', videoId)
      .eq('file_type', 'video')
      .single()

    console.log('Transcript API: Media query result', {
      mediaWithTranscript: JSON.stringify(mediaWithTranscript, null, 2),
      mediaError
    })

    if (mediaError || !mediaWithTranscript) {
      console.log('Transcript API: Media file not found', { mediaError, hasMedia: !!mediaWithTranscript })
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Get the first chapter media entry (should be only one)
    const chapterMedia = mediaWithTranscript.course_chapter_media[0]
    if (!chapterMedia) {
      console.log('Transcript API: No chapter media found')
      return NextResponse.json({ error: 'Video not associated with course' }, { status: 404 })
    }

    const courseData = chapterMedia.course_chapters.courses

    console.log('Transcript API: Video found', {
      videoTitle: chapterMedia.title || mediaWithTranscript.name,
      courseTitle: courseData.title,
      courseInstructorId: courseData.instructor_id,
      userId: user.id
    })

    // Allow both instructors and students with goal access
    const isInstructor = courseData.instructor_id === user.id

    // If not instructor, check if student has goal access to this course
    if (!isInstructor) {
      console.log('Transcript API: Checking goal access for student', {
        userId: user.id,
        courseId: courseData.id
      })

      // First check if user's current goal matches
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('current_goal_id')
        .eq('id', user.id)
        .single()

      console.log('Transcript API: User profile lookup', {
        userProfile,
        profileError
      })

      if (profileError || !userProfile) {
        console.log('Transcript API: Access denied - user profile not found')
        return NextResponse.json({
          error: 'Access denied. User profile not found.'
        }, { status: 403 })
      }

      // Check if user's goal aligns with course goal assignment
      const { data: goalAlignment, error: alignmentError } = await supabase
        .from('course_goal_assignments')
        .select('id, goal_id, course_id')
        .eq('course_id', courseData.id)
        .eq('goal_id', userProfile.current_goal_id)

      console.log('Transcript API: Goal alignment check', {
        goalAlignment,
        alignmentError,
        lookingFor: {
          courseId: courseData.id,
          goalId: userProfile.current_goal_id
        }
      })

      if (alignmentError || !goalAlignment || goalAlignment.length === 0) {
        console.log('Transcript API: Access denied - goal not aligned with course')
        return NextResponse.json({
          error: 'Access denied. Goal not aligned with course.'
        }, { status: 403 })
      }

      console.log('Transcript API: Student access granted via goal alignment')
    } else {
      console.log('Transcript API: Instructor access granted')
    }

    const hasTranscript = chapterMedia.transcript_text && chapterMedia.transcript_status === 'completed'

    console.log('Transcript API: Transcript lookup result', {
      hasTranscript,
      transcriptStatus: chapterMedia.transcript_status,
      textLength: chapterMedia.transcript_text?.length || 0,
      hasFilePath: !!chapterMedia.transcript_file_path
    })

    if (!hasTranscript) {
      console.log('Transcript API: No transcript found or not completed')
      return NextResponse.json({
        success: true,
        hasTranscript: false,
        message: 'No transcript available for this video',
        status: chapterMedia.transcript_status || 'none'
      })
    }

    // For segmented data, read from file path if available
    let segments = null
    if (chapterMedia.transcript_file_path) {
      try {
        // Note: In production, you might want to read from cloud storage
        // For now, we'll return the file path for client-side handling
        segments = { filePath: chapterMedia.transcript_file_path }
      } catch (error) {
        console.warn('Could not read transcript file:', error)
      }
    }

    return NextResponse.json({
      success: true,
      hasTranscript: true,
      transcript: {
        id: chapterMedia.id,
        text: chapterMedia.transcript_text,
        segments: chapterMedia.transcript_segments || segments,
        filePath: chapterMedia.transcript_file_path,
        status: chapterMedia.transcript_status,
        createdAt: chapterMedia.transcript_uploaded_at
      }
    })

  } catch (error) {
    console.error('Transcript fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const { text, filePath, segments } = await request.json()

    if (!videoId || (!text && !filePath && !segments)) {
      return NextResponse.json({ error: 'Video ID and either text, filePath, or segments are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this video via junction table
    const { data: mediaData, error: mediaError } = await supabase
      .from('media_files')
      .select(`
        id,
        name,
        course_chapter_media!inner (
          id,
          course_chapters!inner (
            course_id,
            courses!inner (
              instructor_id
            )
          )
        )
      `)
      .eq('id', videoId)
      .eq('file_type', 'video')
      .single()

    if (mediaError || !mediaData) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const chapterMedia = mediaData.course_chapter_media[0]
    if (!chapterMedia) {
      return NextResponse.json({ error: 'Video not associated with course' }, { status: 404 })
    }

    const hasInstructorAccess = chapterMedia.course_chapters.courses.instructor_id === user.id
    if (!hasInstructorAccess) {
      return NextResponse.json({ error: 'Only instructors can edit transcripts' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      transcript_status: 'completed',
      transcript_uploaded_at: new Date().toISOString()
    }

    // Update text if provided
    if (text) {
      updateData.transcript_text = text
    }

    // Update file path if provided
    if (filePath) {
      updateData.transcript_file_path = filePath
    }

    // Update segments if provided (migration 101 - transcript_segments JSONB column)
    if (segments) {
      updateData.transcript_segments = segments
    }

    // Update the transcript in course_chapter_media
    const { data: updatedMedia, error: updateError } = await supabase
      .from('course_chapter_media')
      .update(updateData)
      .eq('id', chapterMedia.id)
      .select('id, transcript_text, transcript_segments, transcript_file_path, transcript_status, transcript_uploaded_at')
      .single()

    if (updateError) {
      console.error('Transcript update error:', updateError)
      return NextResponse.json({ error: 'Failed to update transcript' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transcript: {
        id: updatedMedia.id,
        text: updatedMedia.transcript_text,
        segments: updatedMedia.transcript_segments,
        filePath: updatedMedia.transcript_file_path,
        status: updatedMedia.transcript_status,
        createdAt: updatedMedia.transcript_uploaded_at
      }
    })

  } catch (error) {
    console.error('Transcript update error:', error)
    return NextResponse.json(
      { error: 'Failed to update transcript' },
      { status: 500 }
    )
  }
}