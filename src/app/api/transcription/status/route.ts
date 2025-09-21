import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course || course.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Course not found or unauthorized' }, { status: 404 })
    }

    // Get videos and their transcription status
    // Note: The JOIN might not work with RLS, so we'll verify the RLS policy is correct
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        duration,
        video_transcripts!inner (
          id,
          created_at,
          confidence_score,
          word_count
        )
      `)
      .eq('course_id', courseId)
      .order('chapter_id', { ascending: true })
      .order('order', { ascending: true })

    console.log('📋 [TRANSCRIPT STATUS] Videos with INNER JOIN result:', {
      courseId,
      videosCount: videos?.length || 0,
      videosError
    })

    if (videosError) {
      console.error('Error fetching videos with inner join:', videosError)
    }

    // Also try without INNER join to get all videos
    const { data: allVideos, error: allVideosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        duration,
        video_transcripts (
          id,
          created_at,
          confidence_score,
          word_count
        )
      `)
      .eq('course_id', courseId)
      .order('chapter_id', { ascending: true })
      .order('order', { ascending: true })

    console.log('📋 [TRANSCRIPT STATUS] All videos (LEFT JOIN) result:', {
      courseId,
      videosCount: allVideos?.length || 0,
      videosWithTranscripts: allVideos?.filter(v => v.video_transcripts?.length > 0).length || 0,
      allVideosError
    })

    if (allVideosError) {
      console.error('Error fetching videos:', allVideosError)
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }

    // Get active transcription jobs for this course
    const { data: activeJobs, error: jobsError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }

    // Combine results: all videos from LEFT JOIN + transcript info from INNER JOIN
    const videosWithTranscripts = videos || [] // INNER JOIN - videos that have transcripts
    const allVideosList = allVideos || [] // LEFT JOIN - all videos

    // Create transcript map from INNER JOIN results
    const transcriptMap = new Map()
    videosWithTranscripts.forEach(video => {
      console.log('🔍 [DEBUG] Processing video for transcript map:', {
        videoId: video.id,
        title: video.title,
        videoTranscripts: video.video_transcripts,
        isArray: Array.isArray(video.video_transcripts),
        hasTranscripts: !!video.video_transcripts
      })

      // INNER JOIN returns a single object, not an array
      if (video.video_transcripts) {
        transcriptMap.set(video.id, video.video_transcripts)
        console.log('✅ [DEBUG] Added to transcript map:', video.id)
      }
    })

    console.log('🔧 [TRANSCRIPT FIX] Combined approach:', {
      allVideosCount: allVideosList.length,
      videosWithTranscriptsCount: videosWithTranscripts.length,
      transcriptMapSize: transcriptMap.size
    })

    // Map video statuses using combined approach
    const statuses = allVideosList?.map(video => {
      const transcript = transcriptMap.get(video.id)
      const hasTranscript = !!transcript

      // Check if this video is in an active job
      const activeJob = activeJobs?.find(job => {
        const videoIds = Array.isArray(job.video_ids) ? job.video_ids : []
        return videoIds.includes(video.id)
      })

      return {
        videoId: video.id,
        title: video.title,
        duration: video.duration,
        hasTranscript,
        isProcessing: !!activeJob,
        progress: activeJob?.progress_percent || 0,
        jobId: activeJob?.id,
        transcriptCreatedAt: hasTranscript ? transcript?.created_at : null,
        confidenceScore: hasTranscript ? transcript?.confidence_score : null
      }
    }) || []

    return NextResponse.json({
      success: true,
      statuses,
      activeJobs: activeJobs || []
    })

  } catch (error) {
    console.error('Transcription status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}