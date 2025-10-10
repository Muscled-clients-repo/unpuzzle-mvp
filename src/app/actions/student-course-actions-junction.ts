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
  console.log('[Junction Action] Function called - starting execution')
  const supabase = await createClient()

  try {
    console.log('[Junction Action] Getting user auth...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[Junction Action] Auth result:', { user: user?.id, authError })

    if (authError || !user) {
      console.log('[Junction Action] Authentication failed:', authError)
      throw new Error('Not authenticated')
    }

    console.log('[Junction Action] Fetching accessible courses for user:', user.id)

    // First check if user has a goal assigned
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    console.log('[Junction Action] Profile query result:', { profile, profileError })

    if (!profile?.current_goal_id) {
      console.log('[Junction Action] User has no goal assigned - cannot access courses')
      return []
    }

    console.log('[Junction Action] User goal ID:', profile.current_goal_id)

    // Use the existing get_user_courses function which filters by goals
    const { data: courses, error } = await supabase
      .rpc('get_user_courses', { user_id: user.id })

    console.log('[Junction Action] RPC result:', { courses, error, coursesLength: courses?.length })

    if (error) {
      console.error('[Junction Action] Error fetching goal-based courses:', error)
      return []
    }

    if (!courses || courses.length === 0) {
      console.log('[Junction Action] No courses found for user goal')

      // Debug: Check course_goal_assignments
      const { data: assignments } = await supabase
        .from('course_goal_assignments')
        .select('*')
        .eq('goal_id', profile.current_goal_id)

      console.log('[Junction Action] Course assignments for goal:', assignments)
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

      console.log('[Junction Action] Course chapters for', courseData.title, ':', { chapters, chaptersError, chaptersLength: chapters?.length })

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

    console.log('[Junction Action] Enhanced courses:', enhancedCourses.length)
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

    console.log('[Junction Action] Getting course details for courseId:', courseId, 'userId:', user.id)

    // Get course basic info
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('status', 'published')
      .single()

    console.log('[Junction Action] Course query result:', { courseData, courseError })

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

    console.log('[Junction Action] Chapters query result:', { chapters, chaptersError, chaptersLength: chapters?.length })

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

    return course

  } catch (error) {
    console.error('[Junction Action] Error fetching course details:', error)
    return null
  }
}

/**
 * Get single video details from junction table architecture
 * 001-COMPLIANT: TanStack Query server state with proper loading patterns
 */
export async function getStudentVideoFromJunctionTable(videoId: string): Promise<any | null> {
  console.log('[Junction Video Action] Getting video details for videoId:', videoId)
  const supabase = await createClient()

  try {
    console.log('[Junction Video Action] Getting user auth...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[Junction Video Action] Authentication failed:', authError)
      throw new Error('Not authenticated')
    }

    console.log('[Junction Video Action] User ID:', user.id)

    // Get video via junction table: media_files -> course_chapter_media -> course_chapters -> courses
    const { data: videoData, error: videoError } = await supabase
      .from('media_files')
      .select(`
        id,
        name,
        file_type,
        file_size,
        duration_seconds,
        cdn_url,
        thumbnail_url,
        created_at,
        updated_at,
        course_chapter_media!inner (
          id,
          chapter_id,
          order_in_chapter,
          title,
          transcript_text,
          transcript_file_path,
          transcript_status,
          transcript_uploaded_at,
          course_chapters!inner (
            id,
            title,
            course_id,
            order_position,
            courses!inner (
              id,
              title,
              description,
              instructor_id,
              status
            )
          )
        )
      `)
      .eq('id', videoId)
      .eq('file_type', 'video')
      .eq('course_chapter_media.course_chapters.courses.status', 'published')
      .single()

    console.log('[Junction Video Action] Video query result:', { videoData, videoError })

    if (videoError || !videoData) {
      console.error('[Junction Video Action] Video not found:', videoError)
      return null
    }

    // Fix data structure - course_chapter_media is an array
    const chapterMediaArray = videoData.course_chapter_media
    if (!chapterMediaArray || chapterMediaArray.length === 0) {
      console.log('[Junction Video Action] No chapter media found for video:', videoId)
      return null
    }

    // Get the first (and should be only) chapter media entry
    const chapterMediaData = chapterMediaArray[0]
    console.log('[Junction Video Action] Chapter media data:', chapterMediaData)

    // Check if user has access via goal
    const courseId = chapterMediaData.course_chapters.course_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      console.log('[Junction Video Action] User has no goal assigned')
      return null
    }

    // Verify course access via goals
    const { data: courseAccess } = await supabase
      .from('course_goal_assignments')
      .select('course_id')
      .eq('goal_id', profile.current_goal_id)
      .eq('course_id', courseId)
      .single()

    if (!courseAccess) {
      console.log('[Junction Video Action] User does not have access to video course:', courseId)
      return null
    }

    // 001-COMPLIANT: Transform to expected video format
    const chapterData = chapterMediaData.course_chapters
    const courseData = chapterData.courses

    // Process transcript data
    let transcriptArray = []
    if (chapterMediaData.transcript_text && chapterMediaData.transcript_status === 'completed') {
      // Split transcript text into simple array format for compatibility
      transcriptArray = chapterMediaData.transcript_text.split(' ')
    }

    // Generate actual CDN URL from private URL format
    const actualVideoUrl = convertPrivateUrlToCDN(videoData.cdn_url)
    if (actualVideoUrl) {
      console.log('[Junction Video Action] Generated CDN URL from private format')
    }

    const transformedVideo = {
      id: videoData.id,
      courseId: courseData.id,
      title: chapterMediaData.title || videoData.name,
      description: '',
      videoUrl: actualVideoUrl,
      thumbnailUrl: videoData.thumbnail_url,
      duration: videoData.duration_seconds || 600,
      order: chapterMediaData.order_in_chapter,
      chapter_id: chapterData.id,
      aiContextEnabled: true,
      progress: undefined, // Will be filled by video progress hooks
      reflections: [],
      quizzes: [],
      transcript: transcriptArray,
      transcriptText: chapterMediaData.transcript_text || '',
      transcriptFilePath: chapterMediaData.transcript_file_path || '',
      transcriptStatus: chapterMediaData.transcript_status || 'none',
      timestamps: [], // Legacy field for compatibility
      createdAt: videoData.created_at || new Date().toISOString(),
      updatedAt: videoData.updated_at || new Date().toISOString(),
      // Course context for breadcrumbs
      course: {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description
      },
      chapter: {
        id: chapterData.id,
        title: chapterData.title,
        order: chapterData.order_position
      }
    }

    console.log('[Junction Video Action] Video retrieved:', transformedVideo.title)
    return transformedVideo

  } catch (error) {
    console.error('[Junction Video Action] Error fetching video:', error)
    return null
  }
}