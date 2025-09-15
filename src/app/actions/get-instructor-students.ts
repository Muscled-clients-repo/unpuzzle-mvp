'use server'

import { createClient } from '@/lib/supabase/server'

export interface InstructorStudent {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  lastActive?: string
  // Mock data fields for compatibility with existing UI
  learnRate: number
  progress: number
  needsHelp: boolean
  courseId?: string
  strugglingAt?: string
}

export async function getInstructorStudents(instructorId: string): Promise<InstructorStudent[]> {
  const supabase = await createClient()
  
  try {
    console.log('[Server Action] Starting to fetch students for instructor:', instructorId)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Server Action] Error fetching students:', error)
      throw error
    }
    
    console.log('[Server Action] Successfully fetched', data?.length || 0, 'students')
    
    // Transform to match the expected interface with mock learning data
    const students: InstructorStudent[] = (data || []).map(student => ({
      id: student.id,
      name: student.full_name || 'Unknown Student',
      email: student.email, // Use real email from database
      role: student.role,
      createdAt: student.created_at,
      lastActive: `${Math.floor(Math.random() * 24)} hours ago`, // Mock data
      learnRate: 30 + Math.floor(Math.random() * 30), // Mock: 30-60 min/hr
      progress: Math.floor(Math.random() * 100), // Mock: 0-100%
      needsHelp: Math.random() < 0.2, // Mock: 20% chance
      courseId: '1', // Mock: default course
      strugglingAt: Math.random() < 0.3 ? 'React Hooks' : undefined // Mock: 30% struggling
    }))
    
    console.log('[Server Action] Returning students with real emails:', students.map(s => ({ name: s.name, email: s.email })))
    
    return students
  } catch (error) {
    console.error('[Server Action] Failed to fetch students:', error)
    return []
  }
}