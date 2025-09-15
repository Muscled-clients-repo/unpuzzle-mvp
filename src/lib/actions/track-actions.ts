'use server'

import { createClient } from '@/lib/supabase/server'
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
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })

  if (error) {
    throw new Error('Failed to get student track assignments')
  }

  return data || []
}

// Assign track to student
export async function assignTrackToStudent({
  trackId,
  assignmentType = 'primary',
  confidenceScore = 100,
  source = 'manual',
  reasoning
}: {
  trackId: string
  assignmentType?: 'primary' | 'secondary'
  confidenceScore?: number
  source?: 'manual' | 'questionnaire' | 'recommendation'
  reasoning?: string
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
    .eq('assignment_type', assignmentType)
    .single()

  if (existing) {
    // Update existing assignment
    const { data, error } = await supabase
      .from('student_track_assignments')
      .update({
        confidence_score: confidenceScore,
        assignment_source: source,
        assignment_reasoning: reasoning,
        is_active: true,
        assigned_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update track assignment')
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
        assignment_type: assignmentType,
        confidence_score: confidenceScore,
        assignment_source: source,
        assignment_reasoning: reasoning
      })
      .select()
      .single()

    if (error) {
      throw new Error('Failed to assign track to student')
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
    .update({ is_active: false })
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

// Update student preferences
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
      throw new Error('Failed to update student preferences')
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
      throw new Error('Failed to create student preferences')
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