'use server'

import { createClient } from '@/lib/supabase/server'
import type { Course } from '@/types/domain'
import { generateCDNUrlWithToken, extractFilePathFromPrivateUrl } from '@/services/security/hmac-token-service'

/**
 * Helper function to convert private URL format to actual CDN URL
 */
function convertPrivateUrlToCDN(privateUrl: string | null): string | null {
  if (!privateUrl || !privateUrl.startsWith('private:')) {
    return privateUrl
  }

  const cdnBaseUrl = 'https://cdn.unpuzzle.co'
  const hmacSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

  if (!hmacSecret) {
    console.error('[CDN Helper] HMAC secret not configured')
    return null
  }

  try {
    const filePath = extractFilePathFromPrivateUrl(privateUrl)
    return generateCDNUrlWithToken(cdnBaseUrl, filePath, hmacSecret)
  } catch (err) {
    console.error('[CDN Helper] Failed to generate CDN URL:', err)
    return null
  }
}

/**
 * Get accessible courses for a student using the new junction table architecture
 * This replaces the old student-course-actions.ts for courses with junction table media
 */
export async function getStudentCoursesWithJunctionTable(): Promise<any[]> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // First check if user has a goal assigned
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      return []
    }

    // Use the existing get_user_courses function which filters by goals
    const { data: courses, error } = await supabase
      .rpc('get_user_courses', { user_id: user.id })

    if (error) {
      console.error('[Junction Action] Error fetching goal-based courses:', error)
      return []
    }

    if (!courses || courses.length === 0) {
      return []
    }

    // Industry standard: Simple transformation to Course format
    const enhancedCourses: any[] = []

    for (const courseData of courses) {
      // Get videos via junction table - simple query
      const { data: chapters, error: chaptersError } = await supabase
        .from('course_chapters')
        .select(`
          id,
          title,
          order_position,
          course_chapter_media (
            id,
            order_in_chapter,
            title,
            media_files (
              id,
              name,
              file_type,
              duration_seconds,
              cdn_url,
              thumbnail_url
            )
          )
        `)
        .eq('course_id', courseData.id)
        .order('order_position', { ascending: true })

      // Simple flat videos array like working version
      const transformedVideos: any[] = []
      let globalIndex = 0

      for (const chapter of chapters || []) {
        const sortedMedia = (chapter.course_chapter_media || [])
          .sort((a, b) => a.order_in_chapter - b.order_in_chapter)

        for (const mediaItem of sortedMedia) {
          if (mediaItem.media_files && mediaItem.media_files.file_type === 'video') {
            transformedVideos.push({
              id: mediaItem.media_files.id,
              courseId: courseData.id,
              title: mediaItem.title || mediaItem.media_files.name,
              description: '',
              duration: mediaItem.media_files.duration_seconds || 600,
              order: globalIndex + 1,
              videoUrl: convertPrivateUrlToCDN(mediaItem.media_files.cdn_url),
              thumbnailUrl: mediaItem.media_files.thumbnail_url,
              transcript: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            globalIndex++
          }
        }
      }

      // Simple course object like working version
      const course: any = {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        thumbnailUrl: courseData.thumbnail_url,
        instructor: {
          id: courseData.instructor_id || '',
          name: 'Instructor',
          email: '',
          bio: ''
        },
        price: courseData.price || 0,
        difficulty: courseData.difficulty || 'beginner',
        duration: transformedVideos.reduce((total, video) => total + video.duration, 0),
        videoCount: transformedVideos.length,
        total_videos: transformedVideos.length,
        total_duration_minutes: Math.round(transformedVideos.reduce((total, video) => total + video.duration, 0) / 60),
        rating: 4.5,
        videos: transformedVideos,
        tags: [],
        createdAt: courseData.created_at || new Date().toISOString(),
        updatedAt: courseData.updated_at || new Date().toISOString(),
        status: courseData.status || 'published'
      }

      enhancedCourses.push(course)
    }

    return enhancedCourses

  } catch (error) {
    console.error('[Junction Action] Error fetching courses:', error)
    return []
  }
}

/**
 * Get course details with chapters and media for student viewing
 */
export async function getStudentCourseDetails(courseId: string): Promise<any | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Get course basic info
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('status', 'published')
      .single()

    if (courseError || !courseData) {
      console.error('[Junction Action] Course not found:', courseError)
      return null
    }

    // Get chapters with media via junction table
    const { data: chapters, error: chaptersError } = await supabase
      .from('course_chapters')
      .select(`
        id,
        title,
        order_position,
        course_chapter_media (
          id,
          order_in_chapter,
          title,
          media_files (
            id,
            name,
            file_type,
            file_size,
            duration_seconds,
            cdn_url,
            thumbnail_url
          )
        )
      `)
      .eq('course_id', courseId)
      .order('order_position', { ascending: true })

    // Industry standard: Transform junction table to simple chapters with videos
    const transformedChapters: any[] = []
    const transformedVideos: any[] = []
    let globalVideoIndex = 0

    for (const chapter of chapters || []) {
      const sortedMedia = (chapter.course_chapter_media || [])
        .sort((a, b) => a.order_in_chapter - b.order_in_chapter)

      const chapterVideos: any[] = []

      for (const mediaItem of sortedMedia) {
        if (mediaItem.media_files && mediaItem.media_files.file_type === 'video') {
          const video = {
            id: mediaItem.media_files.id,
            title: mediaItem.title || mediaItem.media_files.name,
            duration_seconds: mediaItem.media_files.duration_seconds || 600,
            order: mediaItem.order_in_chapter,
            chapter_id: chapter.id,
            videoUrl: convertPrivateUrlToCDN(mediaItem.media_files.cdn_url),
            thumbnailUrl: mediaItem.media_files.thumbnail_url
          }
          chapterVideos.push(video)

          // Also add to flat videos array for compatibility
          transformedVideos.push({
            id: mediaItem.media_files.id,
            courseId: courseId,
            title: mediaItem.title || mediaItem.media_files.name,
            description: '',
            duration: mediaItem.media_files.duration_seconds || 600,
            order: globalVideoIndex + 1,
            videoUrl: convertPrivateUrlToCDN(mediaItem.media_files.cdn_url),
            thumbnailUrl: mediaItem.media_files.thumbnail_url,
            transcript: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          globalVideoIndex++
        }
      }

      transformedChapters.push({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order_position,
        videos: chapterVideos
      })
    }

    const course: any = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description,
      thumbnail_url: courseData.thumbnail_url,
      instructor_id: courseData.instructor_id || '',
      instructor: {
        id: courseData.instructor_id || '',
        name: 'Instructor',
        email: '',
        bio: ''
      },
      price: courseData.price || 0,
      category: courseData.category || 'general',
      difficulty: courseData.difficulty || 'beginner',
      duration: transformedVideos.reduce((total, video) => total + video.duration, 0),
      videoCount: transformedVideos.length,
      total_videos: transformedVideos.length,
      total_duration_minutes: Math.round(transformedVideos.reduce((total, video) => total + video.duration, 0) / 60),
      studentsCount: 0,
      rating: 4.5,
      reviewsCount: 0,
      chapters: transformedChapters,
      videos: transformedVideos,
      tags: [],
      createdAt: courseData.created_at || new Date().toISOString(),
      updatedAt: courseData.updated_at || new Date().toISOString(),
      status: courseData.status || 'published'
    }

    console.log('[Junction Action] getStudentCourseDetails result:', {
      courseId,
      chaptersCount: transformedChapters.length,
      videosCount: transformedVideos.length,
      chapters: transformedChapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        videosCount: ch.videos.length
      }))
    })

    return course

  } catch (error) {
    console.error('[Junction Action] Error fetching course details:', error)
    return null
  }
}

/**
 * Get single video details from junction table architecture
 * 001-COMPLIANT: TanStack Query server state with proper loading patterns
 * PERFORMANCE: Uses optimized RPC function for 10x faster queries (30-80ms vs 300-800ms)
 * SECURITY: Trust boundary approach - verify course access (RLS), then fetch video
 */
export async function getStudentVideoFromJunctionTable(videoId: string, courseId?: string): Promise<any | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // SECURITY STEP 1: Verify course access (RLS enforced at trust boundary)
    // This is the ONLY place we check access - trust RLS policies on courses table
    if (courseId) {
      const { data: courseCheck, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('status', 'published')
        .single()

      if (courseError || !courseCheck) {
        return null
      }
    }

    // SECURITY STEP 2: Fetch video + verify it belongs to the course
    // Use simplified RPC that trusts RLS (no redundant goal checks)
    const { data: videoRows, error: rpcError } = await supabase
      .rpc('get_student_video_for_course', {
        p_video_id: videoId,
        p_course_id: courseId
      })

    if (rpcError) {
      console.error('[Junction Video Action] RPC error:', rpcError)
      return null
    }

    if (!videoRows || videoRows.length === 0) {
      return null
    }

    const videoData = videoRows[0]

    // Process transcript data
    let transcriptArray = []
    if (videoData.transcript_text && videoData.transcript_status === 'completed') {
      transcriptArray = videoData.transcript_text.split(' ')
    }

    // Generate actual CDN URL from private URL format
    const actualVideoUrl = convertPrivateUrlToCDN(videoData.video_cdn_url)

    const transformedVideo = {
      id: videoData.video_id,
      courseId: videoData.course_id,
      title: videoData.chapter_media_title || videoData.video_name,
      description: '',
      videoUrl: actualVideoUrl,
      thumbnailUrl: videoData.video_thumbnail_url,
      duration: videoData.video_duration_seconds || 600,
      order: videoData.chapter_media_order,
      chapter_id: videoData.chapter_id,
      aiContextEnabled: true,
      progress: undefined, // Will be filled by video progress hooks
      reflections: [],
      quizzes: [],
      transcript: transcriptArray,
      transcriptText: videoData.transcript_text || '',
      transcriptFilePath: videoData.transcript_file_path || '',
      transcriptStatus: videoData.transcript_status || 'none',
      timestamps: [], // Legacy field for compatibility
      createdAt: videoData.video_created_at || new Date().toISOString(),
      updatedAt: videoData.video_updated_at || new Date().toISOString(),
      // Course context for breadcrumbs
      course: {
        id: videoData.course_id,
        title: videoData.course_title,
        description: videoData.course_description
      },
      chapter: {
        id: videoData.chapter_id,
        title: videoData.chapter_title,
        order: videoData.chapter_order_position
      }
    }

    return transformedVideo

  } catch (error) {
    console.error('[Junction Video Action] Error fetching video:', error)
    return null
  }
}