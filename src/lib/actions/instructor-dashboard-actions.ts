'use server'

import { createClient } from '@/lib/supabase/server'

export interface InstructorDashboardStats {
  totalRevenue: number
  totalStudents: number
  totalRequests: number
  revenueChange: number
  studentsChange: number
  requestsChange: number
}

/**
 * Get instructor dashboard stats for a date range
 */
export async function getInstructorDashboardStats(
  fromDate: Date,
  toDate: Date
): Promise<InstructorDashboardStats> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  // Verify user is an instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'instructor') {
    throw new Error('Only instructors can access dashboard stats')
  }

  // Calculate previous period dates for comparison
  const timeRange = toDate.getTime() - fromDate.getTime()
  const prevFromDate = new Date(fromDate.getTime() - timeRange)
  const prevToDate = new Date(toDate.getTime() - timeRange)

  // Get total students created in current period
  const { count: currentStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())

  // Get total students created in previous period
  const { count: previousStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .gte('created_at', prevFromDate.toISOString())
    .lte('created_at', prevToDate.toISOString())

  // Get total requests created in current period
  const { count: currentRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())

  // Get total requests created in previous period
  const { count: previousRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', prevFromDate.toISOString())
    .lte('created_at', prevToDate.toISOString())

  // Mock revenue (for now, based on students - $100 per student)
  const currentRevenue = (currentStudents || 0) * 100
  const previousRevenue = (previousStudents || 0) * 100

  // Calculate percentage changes
  const studentsChange = previousStudents && previousStudents > 0
    ? Math.round(((currentStudents || 0) - previousStudents) / previousStudents * 100)
    : currentStudents && currentStudents > 0 ? 100 : 0

  const requestsChange = previousRequests && previousRequests > 0
    ? Math.round(((currentRequests || 0) - previousRequests) / previousRequests * 100)
    : currentRequests && currentRequests > 0 ? 100 : 0

  const revenueChange = previousRevenue && previousRevenue > 0
    ? Math.round((currentRevenue - previousRevenue) / previousRevenue * 100)
    : currentRevenue > 0 ? 100 : 0

  return {
    totalRevenue: currentRevenue,
    totalStudents: currentStudents || 0,
    totalRequests: currentRequests || 0,
    revenueChange,
    studentsChange,
    requestsChange
  }
}
