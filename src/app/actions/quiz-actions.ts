'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}

export interface QuizAttemptData {
  videoId: string
  courseId: string
  videoTimestamp: number
  questions: any[] // Array of question objects with options, correct answers, explanations
  userAnswers: number[] // Array of user's selected answers (indices)
  score: number
  totalQuestions: number
  percentage: number
  quizDurationSeconds?: number
}

export async function submitQuizAttemptAction(data: QuizAttemptData) {
  try {
    console.log('[QuizAction] Received data:', JSON.stringify(data, null, 2))

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[QuizAction] Auth error:', authError)
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    console.log('[QuizAction] User authenticated:', user.id)

    // Validate required fields
    if (!data.videoId || !data.courseId || data.videoTimestamp === undefined) {
      console.error('[QuizAction] Missing required fields:', { videoId: data.videoId, courseId: data.courseId, videoTimestamp: data.videoTimestamp })
      return {
        success: false,
        error: 'Missing required fields: videoId, courseId, or videoTimestamp'
      }
    }

    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      return {
        success: false,
        error: 'Questions array is required and cannot be empty'
      }
    }

    if (!data.userAnswers || !Array.isArray(data.userAnswers)) {
      return {
        success: false,
        error: 'User answers array is required'
      }
    }

    // Insert quiz attempt into database
    console.log('[QuizAction] Inserting into database...')
    const insertData = {
      user_id: user.id,
      video_id: data.videoId,
      course_id: data.courseId,
      video_timestamp: data.videoTimestamp,
      questions: data.questions,
      user_answers: data.userAnswers,
      score: data.score,
      total_questions: data.totalQuestions,
      percentage: data.percentage,
      quiz_duration_seconds: data.quizDurationSeconds || null
    }
    console.log('[QuizAction] Insert data:', JSON.stringify(insertData, null, 2))

    const { data: quizAttempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[QuizAction] Database insert error:', insertError)
      return {
        success: false,
        error: `Failed to save quiz attempt to database: ${insertError.message}`
      }
    }

    console.log('[QuizAction] Quiz attempt saved successfully:', quizAttempt)

    return {
      success: true,
      data: quizAttempt
    }

  } catch (error) {
    console.error('Quiz attempt submission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

export async function getQuizAttemptsAction(videoId: string, courseId: string) {
  try {
    const user = await requireAuth()
    const supabase = createServiceClient()

    const { data: quizAttempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('video_id', videoId)
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) // Most recent first

    if (error) {
      console.error('Quiz attempts fetch error:', error)
      return {
        success: false,
        error: 'Failed to fetch quiz attempts'
      }
    }

    return {
      success: true,
      data: quizAttempts || []
    }

  } catch (error) {
    console.error('Quiz attempts fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

export async function getQuizAttemptByIdAction(attemptId: string) {
  try {
    const user = await requireAuth()
    const supabase = createServiceClient()

    const { data: quizAttempt, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Quiz attempt fetch error:', error)
      return {
        success: false,
        error: 'Failed to fetch quiz attempt'
      }
    }

    return {
      success: true,
      data: quizAttempt
    }

  } catch (error) {
    console.error('Quiz attempt fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}