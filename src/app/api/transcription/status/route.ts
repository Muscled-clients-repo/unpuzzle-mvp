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

    // TEMPORARY: Transcript functionality disabled after junction table migration
    // Videos table was replaced with course_chapter_media junction table + media_files
    // TODO: Re-implement transcript status using media_files and course_chapter_media
    console.log('📋 [TRANSCRIPT STATUS] Transcript functionality temporarily disabled - videos table migrated to junction table')

    return NextResponse.json({
      success: true,
      statuses: [], // Empty until transcript functionality is re-implemented
      activeJobs: [],
      message: 'Transcript functionality temporarily disabled during junction table migration'
    })

  } catch (error) {
    console.error('Transcription status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}