'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Track {
  id: string
  title: string
  description: string
  focus_area: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_duration_weeks: number
  learning_outcomes: string[]
  prerequisites: string[]
  tags: string[]
  icon_url: string | null
  banner_url: string | null
  is_active: boolean
  course_count: number
  student_count: number
  created_at: string
  updated_at: string
}

export interface StudentTrackAssignment {
  id: string
  student_id: string
  track_id: string
  assignment_type: 'primary' | 'secondary'
  confidence_score: number
  assignment_source: 'manual' | 'questionnaire' | 'recommendation'
  assignment_reasoning: string | null
  progress_percentage: number
  is_active: boolean
  assigned_at: string
  completed_at: string | null
  track?: Track
}

export interface StudentPreferences {
  id: string
  student_id: string
  time_commitment_hours: number
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  learning_pace: 'slow' | 'normal' | 'fast'
  content_format_preferences: string[]
  goal_priorities: any[]
  difficulty_preference: 'easy' | 'progressive' | 'challenging'
  notification_preferences: Record<string, boolean>
  completed_questionnaire: boolean
  questionnaire_completed_at: string | null
  monthly_income_goal?: number
  approach_preference?: 'direct' | 'patient'
  questionnaire_data?: any
  questionnaire_version?: string
  questionnaire_track_id?: string
  created_at: string
  updated_at: string
}

// Mock tracks data until tracks table is implemented
const mockTracks: Track[] = [
  {
    id: 'frontend-track',
    title: 'Frontend Development',
    description: 'Master modern frontend technologies including React, TypeScript, and CSS frameworks to build beautiful user interfaces.',
    focus_area: 'frontend',
    difficulty_level: 'beginner',
    estimated_duration_weeks: 12,
    learning_outcomes: [
      'Build responsive web applications with React',
      'Master CSS and modern styling frameworks',
      'Implement state management and API integration',
      'Deploy and optimize frontend applications'
    ],
    prerequisites: ['Basic HTML/CSS', 'JavaScript fundamentals'],
    tags: ['react', 'typescript', 'css', 'javascript'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 8,
    student_count: 42,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fullstack-track',
    title: 'Full Stack Development',
    description: 'Learn to build complete web applications from frontend to backend, including databases and deployment.',
    focus_area: 'fullstack',
    difficulty_level: 'intermediate',
    estimated_duration_weeks: 16,
    learning_outcomes: [
      'Build full-stack web applications',
      'Design and implement RESTful APIs',
      'Work with databases and data modeling',
      'Deploy applications to production'
    ],
    prerequisites: ['JavaScript experience', 'Basic web development'],
    tags: ['react', 'node.js', 'database', 'api'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 12,
    student_count: 28,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'design-track',
    title: 'UI/UX Design',
    description: 'Create beautiful and intuitive user experiences through design thinking, prototyping, and visual design.',
    focus_area: 'design',
    difficulty_level: 'beginner',
    estimated_duration_weeks: 10,
    learning_outcomes: [
      'Apply design thinking methodology',
      'Create wireframes and prototypes',
      'Design accessible user interfaces',
      'Conduct user research and testing'
    ],
    prerequisites: ['Basic computer skills', 'Creative mindset'],
    tags: ['figma', 'design-thinking', 'prototyping', 'user-research'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 6,
    student_count: 35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'backend-track',
    title: 'Backend Development',
    description: 'Build robust server-side applications, APIs, and database systems that power modern web applications.',
    focus_area: 'backend',
    difficulty_level: 'intermediate',
    estimated_duration_weeks: 14,
    learning_outcomes: [
      'Build scalable server architectures',
      'Design efficient database schemas',
      'Implement authentication and security',
      'Deploy and monitor backend services'
    ],
    prerequisites: ['Programming fundamentals', 'Database basics'],
    tags: ['node.js', 'database', 'api', 'authentication'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 10,
    student_count: 22,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mobile-track',
    title: 'Mobile Development',
    description: 'Create native and cross-platform mobile applications for iOS and Android using modern frameworks.',
    focus_area: 'mobile',
    difficulty_level: 'advanced',
    estimated_duration_weeks: 18,
    learning_outcomes: [
      'Build native mobile applications',
      'Implement mobile-specific UI patterns',
      'Handle device APIs and sensors',
      'Publish apps to app stores'
    ],
    prerequisites: ['JavaScript/TypeScript', 'Mobile development basics'],
    tags: ['react-native', 'ios', 'android', 'mobile-ui'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 9,
    student_count: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'devops-track',
    title: 'DevOps & Cloud',
    description: 'Master deployment, infrastructure, and cloud technologies to build scalable and reliable systems.',
    focus_area: 'devops',
    difficulty_level: 'advanced',
    estimated_duration_weeks: 15,
    learning_outcomes: [
      'Set up CI/CD pipelines',
      'Manage cloud infrastructure',
      'Implement monitoring and logging',
      'Ensure security and compliance'
    ],
    prerequisites: ['Backend development', 'Linux basics', 'Networking fundamentals'],
    tags: ['aws', 'docker', 'kubernetes', 'ci-cd'],
    icon_url: null,
    banner_url: null,
    is_active: true,
    course_count: 11,
    student_count: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// Get all available tracks
export async function getAllTracks(): Promise<Track[]> {
  // Return mock data for now
  return mockTracks
}

// Get tracks with course information
export async function getTracksWithCourses(): Promise<(Track & { courses: any[] })[]> {
  const tracks = await getAllTracks()
  
  // For now, return tracks without courses until course_track_mappings is implemented
  return tracks.map(track => ({
    ...track,
    courses: []
  }))
}

// Get student's track assignments
export async function getStudentTrackAssignments(): Promise<StudentTrackAssignment[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('student_track_assignments')
    .select(`
      *,
      track:tracks (*)
    `)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })

  if (error) {
    throw new Error('Failed to get student track assignments')
  }

  return data || []
}

// Assign track to student
export async function assignTrackToStudent({
  trackId,
  goalId
}: {
  trackId: string
  goalId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('student_track_assignments')
    .select('id')
    .eq('student_id', user.id)
    .eq('track_id', trackId)
    .eq('status', 'active')
    .single()

  // If no goal provided, get the default goal for this track
  let actualGoalId = goalId
  if (!actualGoalId) {
    const { data: defaultGoal } = await supabase
      .from('track_goals')
      .select('id')
      .eq('track_id', trackId)
      .eq('is_default', true)
      .single()

    if (defaultGoal) {
      actualGoalId = defaultGoal.id
    }
  }

  if (existing) {
    // Update existing assignment
    const { data, error } = await supabase
      .from('student_track_assignments')
      .update({
        assigned_at: new Date().toISOString(),
        status: 'active',
        goal_id: actualGoalId || null
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update track assignment')
    }

    // Update the user's profile with the current goal AND track
    if (actualGoalId) {
      await supabase
        .from('profiles')
        .update({
          current_goal_id: actualGoalId,
          current_track_id: trackId
        })
        .eq('id', user.id)
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/track-selection')
    return data
  } else {
    // Create new assignment
    const { data, error } = await supabase
      .from('student_track_assignments')
      .insert({
        student_id: user.id,
        track_id: trackId,
        goal_id: actualGoalId || null,
        status: 'active',
        assigned_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error('Failed to assign track to student')
    }

    // Update the user's profile with the current goal AND track
    if (actualGoalId) {
      await supabase
        .from('profiles')
        .update({
          current_goal_id: actualGoalId,
          current_track_id: trackId
        })
        .eq('id', user.id)
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/track-selection')
    return data
  }
}

// Remove track assignment
export async function removeTrackAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('student_track_assignments')
    .update({ status: 'abandoned' })
    .eq('id', assignmentId)
    .eq('student_id', user.id)

  if (error) {
    throw new Error('Failed to remove track assignment')
  }

  revalidatePath('/student/dashboard')
  revalidatePath('/student/track-selection')
}

// Get student preferences
export async function getStudentPreferences(): Promise<StudentPreferences | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('student_preferences')
    .select('*')
    .eq('student_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error('Failed to get student preferences')
  }

  return data
}

// Submit questionnaire and create request for instructor review
export async function submitQuestionnaire(trackType: 'agency' | 'saas', questionnaireResponses: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Create a track change request with questionnaire data in metadata
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      user_id: user.id,
      request_type: 'track_change',
      title: `Track Selection: ${trackType === 'agency' ? 'Agency' : 'SaaS'} Track`,
      description: `${profile?.full_name || 'Student'} has completed the questionnaire and selected the ${trackType === 'agency' ? 'Agency' : 'SaaS'} track.`,
      status: 'pending',
      priority: 'medium',
      metadata: {
        track_type: trackType,
        questionnaire_responses: questionnaireResponses,
        submitted_at: new Date().toISOString(),
        requires_goal_assignment: true
      }
    })
    .select()
    .single()

  if (requestError) {
    console.error('Request creation error:', requestError)
    throw new Error('Failed to submit questionnaire for review')
  }

  // Get track ID for storing with questionnaire
  const { data: track } = await supabase
    .from('tracks')
    .select('id')
    .eq('name', trackType === 'agency' ? 'Agency Track' : 'SaaS Track')
    .single()

  // Update student preferences with questionnaire data
  await updateStudentPreferences({
    time_commitment_hours: questionnaireResponses.timeCommitment || null,
    monthly_income_goal: questionnaireResponses.monthlyIncomeGoal || null,
    approach_preference: questionnaireResponses.approachPreference || null,
    completed_questionnaire: true,
    questionnaire_completed_at: new Date().toISOString(),
    questionnaire_data: questionnaireResponses,
    questionnaire_version: '1.0', // You can version your questionnaires
    questionnaire_track_id: track?.id || null
  })

  revalidatePath('/student/track-selection')
  revalidatePath('/student/dashboard')
  return request
}

export async function updateStudentPreferences(preferences: Partial<StudentPreferences>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if preferences exist
  const existing = await getStudentPreferences()

  if (existing) {
    // Update existing preferences
    const { data, error } = await supabase
      .from('student_preferences')
      .update(preferences)
      .eq('student_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      throw new Error(`Failed to update student preferences: ${error.message}`)
    }

    revalidatePath('/student/track-selection')
    return data
  } else {
    // Create new preferences
    const { data, error } = await supabase
      .from('student_preferences')
      .insert({
        student_id: user.id,
        ...preferences
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating preferences:', error)
      throw new Error(`Failed to create student preferences: ${error.message}`)
    }

    revalidatePath('/student/track-selection')
    return data
  }
}

// Get filtered courses based on track assignments
export async function getFilteredCourses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // For now, return all published courses until course_track_mappings is implemented
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    throw new Error('Failed to get courses')
  }

  return data || []
}

// Get pending questionnaires for instructor review
export async function getPendingStudentReviews() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if user is instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'instructor') {
    throw new Error('Access denied: Instructor role required')
  }

  // Get pending reviews using the view we created
  const { data, error } = await supabase
    .from('instructor_review_queue')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch pending reviews')
  }

  return data || []
}

// Assign goal to student and activate conversation
export async function assignGoalToStudentConversation(params: {
  conversationId: string
  goalId: string
  goalTitle: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use service client for database operations that need elevated permissions
  const serviceClient = createServiceClient()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if user is instructor
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'instructor') {
    throw new Error('Access denied: Instructor role required')
  }

  const { conversationId, goalId, goalTitle, notes } = params

  console.log('[GOAL_ASSIGNMENT] Searching for conversation:', conversationId)

  // First, get the conversation to find the student
  const { data: conversation, error: conversationError } = await serviceClient
    .from('goal_conversations')
    .select('student_id, track_type')
    .eq('id', conversationId)
    .single()

  console.log('[GOAL_ASSIGNMENT] Query result:', { conversation, conversationError })

  if (conversationError || !conversation) {
    console.error('[GOAL_ASSIGNMENT] Conversation not found:', { conversationId, conversationError })
    throw new Error('Conversation not found')
  }

  // Find the predefined goal in track_goals table based on goalId
  // Direct 1:1 mapping - goalId matches the goal name in database
  const { data: predefinedGoal, error: goalError } = await serviceClient
    .from('track_goals')
    .select('id, track_id')
    .eq('name', goalId)
    .single()

  console.log('[GOAL_ASSIGNMENT] Found predefined goal:', { predefinedGoal, goalError })

  if (goalError || !predefinedGoal) {
    console.warn('[GOAL_ASSIGNMENT] Could not find predefined goal, proceeding without goal assignment')
  }

  // Update student's profile with track and goal assignment
  if (predefinedGoal) {
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        current_track_id: predefinedGoal.track_id,
        current_goal_id: predefinedGoal.id,
        goal_assigned_at: new Date().toISOString()
      })
      .eq('id', conversation.student_id)

    console.log('[GOAL_ASSIGNMENT] Profile update result:', { profileError })
  }

  // Update conversation status to active and assign instructor
  const { error: updateError } = await serviceClient
    .from('goal_conversations')
    .update({
      status: 'active',
      instructor_id: user.id,
      goal_id: predefinedGoal?.id || null, // Use the predefined goal's UUID
      goal_title: goalTitle // Save the goal title directly
    })
    .eq('id', conversationId)

  console.log('[GOAL_ASSIGNMENT] Conversation update result:', { updateError })

  if (updateError) {
    throw new Error('Failed to activate conversation')
  }

  // Create goal assignment message
  const { error: messageError } = await serviceClient
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: 'instructor_response',
      content: `Goal assigned: ${goalTitle}`,
      metadata: {
        goal_id: goalId,
        goal_title: goalTitle,
        assignment_notes: notes,
        assigned_at: new Date().toISOString()
      }
    })

  if (messageError) {
    throw new Error('Failed to create goal assignment message')
  }

  revalidatePath('/instructor/student-review')
  revalidatePath('/student/goals')

  return { success: true, goalId: predefinedGoal?.id }
}

// Helper function to extract amount from goal ID
function extractAmountFromGoalId(goalId: string): number {
  const match = goalId.match(/(\d+)k?$/)
  if (match) {
    const num = parseInt(match[1])
    return goalId.includes('k') ? num * 1000 : num
  }
  return 1000 // default
}

// Get instructor pending reviews (alias for getPendingStudentReviews)
export async function getInstructorPendingReviews() {
  return getPendingStudentReviews()
}

// Simplified goal assignment function
export async function assignGoalToStudent(studentId: string, goalId: string, trackType: 'agency' | 'saas') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if user is instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'instructor') {
    throw new Error('Access denied: Instructor role required')
  }

  // Find the student's pending conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('goal_conversations')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'pending_instructor_review')
    .single()

  if (conversationError || !conversation) {
    throw new Error('No pending conversation found for student')
  }

  // Get goal title from predefined goals
  const goalTitles: Record<string, string> = {
    'agency-1k': 'Earn $1k total from agency services',
    'agency-5k': 'Earn $5k total from agency services',
    'agency-10k': 'Earn $10k total from agency services',
    'agency-20k': 'Earn $20k total from agency services',
    'agency-50k': 'Earn $50k total from agency services',
    'saas-1k': 'Reach $1k Monthly Recurring Revenue',
    'saas-3k': 'Reach $3k Monthly Recurring Revenue',
    'saas-5k': 'Reach $5k Monthly Recurring Revenue',
    'saas-10k': 'Reach $10k Monthly Recurring Revenue',
    'saas-20k': 'Reach $20k Monthly Recurring Revenue',
  }

  const goalTitle = goalTitles[goalId] || goalId

  // Use the existing function
  return assignGoalToStudentConversation({
    conversationId: conversation.id,
    goalId,
    goalTitle
  })
}