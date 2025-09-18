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
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        duration,
        video_transcripts (
          id,
          created_at,
          confidence_score
        )
      `)
      .eq('course_id', courseId)
      .order('chapter_id', { ascending: true })
      .order('order', { ascending: true })

    if (videosError) {
      console.error('Error fetching videos:', videosError)
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

    // Map video statuses
    const statuses = videos?.map(video => {
      const hasTranscript = video.video_transcripts && video.video_transcripts.length > 0

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
        transcriptCreatedAt: hasTranscript ? video.video_transcripts[0]?.created_at : null,
        confidenceScore: hasTranscript ? video.video_transcripts[0]?.confidence_score : null
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