'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Target, User, Search, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { StatsGrid } from '@/components/layout/stats-grid'
import Link from 'next/link'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'

interface StudentGoal {
  studentId: string
  studentName: string
  studentEmail: string
  goalTitle: string
  currentAmount: string
  targetAmount: string
  progress: number
  targetDate: string
  startDate: string
  status: 'active' | 'completed' | 'paused'
  lastActive: string
  daysActive: number
  needsAttention: boolean
  hasUnreadMessages: boolean
}

// Real student data is now fetched from database via TanStack Query

function InstructorStudentGoalsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')
  const { user } = useAppStore()
  const searchParams = useSearchParams()

  // Handle deep linking to specific student
  useEffect(() => {
    const studentParam = searchParams.get('student')
    const emailParam = searchParams.get('email')

    if (emailParam) {
      setSearchQuery(decodeURIComponent(emailParam))
    } else if (studentParam) {
      // If we only have student ID, we could set a flag to highlight that student
      // For now, let's focus on the email since it's more user-friendly
    }
  }, [searchParams])

  // Fetch real student goal assignments from database (TanStack Query layer)
  const { data: studentGoals, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ['instructor-student-goals', user?.id],
    queryFn: async () => {
      console.log('🔍 [STEP 1] Query starting', { userId: user?.id, timestamp: new Date().toISOString() });

      if (!user?.id) {
        console.log('🔍 [STEP 1] No user ID - aborting');
        return []
      }

      console.log('🔍 [STEP 2] Creating Supabase client');
      const supabase = createClient()

      console.log('🔍 [STEP 3] Getting auth session');
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      console.log('🔍 [STEP 3] Session result:', {
        hasSession: !!session?.session,
        userId: session?.session?.user?.id,
        userEmail: session?.session?.user?.email,
        sessionError: sessionError?.message
      });

      console.log('🔍 [STEP 4] Getting current user');
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      console.log('🔍 [STEP 4] Current user:', {
        hasUser: !!currentUser,
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userError: userError?.message
      });

      console.log('🔍 [STEP 5] Testing what profiles exist in the database');
      // First, let's see ALL profiles to understand the data structure
      const { data: studentsWithGoals, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          current_goal_id,
          goal_assigned_at,
          role
        `)
        .not('full_name', 'is', null) // Get profiles that have names (not instructor with null name)
        .order('email', { ascending: true })

      console.log('🔍 [STEP 5.5] All active assignments data:', studentsWithGoals);

      console.log('🔍 [STEP 6] Query result:', {
        dataLength: studentsWithGoals?.length,
        hasError: !!error,
        errorDetails: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        } : null
      });

      if (error) {
        console.error('🔍 [ERROR] Full error object:', error);
        console.error('🔍 [ERROR] Error keys:', Object.keys(error));
        console.error('🔍 [ERROR] Error constructor:', error.constructor.name);
        throw new Error('Failed to fetch student goals')
      }

      if (!studentsWithGoals) return []

      console.log('🔍 [STEP 7] Students found:', studentsWithGoals.length);
      // We already have profile data, now get goal details
      const goalIds = studentsWithGoals.filter(student => student.current_goal_id).map(student => student.current_goal_id)
      console.log('🔍 [STEP 7.5] Fetching goal details for IDs:', goalIds);

      // Get goal data for students with current_goal_id
      const { data: goals, error: goalError } = await supabase
        .from('track_goals')
        .select(`
          id,
          name,
          description,
          target_amount,
          currency,
          goal_type,
          tracks (
            name
          )
        `)
        .in('id', goalIds)

      if (goalError) {
        console.error('Failed to fetch goals:', goalError)
        // Continue without goal data
      }

      // Create goal lookup map
      const goalMap = new Map(goals?.map(g => [g.id, g]) || [])

      // Transform database data to component interface
      return studentsWithGoals.map(student => {
        const goal = goalMap.get(student.current_goal_id)
        const startDate = student.goal_assigned_at || new Date().toISOString()

        // Format target amount from structured data
        const formatTargetAmount = (amount: number, currency: string = 'USD') => {
          const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })
          return formatter.format(amount)
        }

        // Calculate days since goal assigned
        const daysActive = Math.max(1, Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))

        return {
          studentId: student.id || '',
          studentName: student.full_name || 'Unknown Student',
          studentEmail: student.email || 'No email',
          goalTitle: goal?.description || 'No goal assigned',
          currentAmount: '$0', // TODO: This should come from actual progress tracking
          targetAmount: formatTargetAmount(goal?.target_amount || 1000, goal?.currency || 'USD'),
          progress: 0, // TODO: Calculate from actual progress data
          targetDate: new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from start
          startDate: startDate.split('T')[0],
          status: 'active' as const,
          lastActive: daysActive === 1 ? 'Today' : `${daysActive} days ago`,
          daysActive,
          needsAttention: false, // TODO: Calculate based on actual metrics
          hasUnreadMessages: false // TODO: Calculate based on conversation data
        }
      })
    },
    enabled: !!user?.id
  })

  const realStudentGoals = studentGoals || []

  // Filter students based on search and status
  const filteredStudents = realStudentGoals.filter(student => {
    const matchesSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.goalTitle.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string, progress: number) => {
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (status === 'paused') {
      return <Badge variant="outline">Paused</Badge>
    }
    if (progress >= 80) {
      return <Badge className="bg-blue-100 text-blue-800">Near Goal</Badge>
    }
    if (progress >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-800">On Track</Badge>
    }
    return <Badge variant="outline">Getting Started</Badge>
  }

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'bg-green-500'
    if (progress >= 80) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // Calculate stats from real data
  const activeGoals = realStudentGoals.filter(s => s.status === 'active').length
  const completedGoals = realStudentGoals.filter(s => s.status === 'completed').length
  const needsAttention = realStudentGoals.filter(s => s.needsAttention).length
  const avgProgress = realStudentGoals.length > 0 ? Math.round(realStudentGoals.reduce((sum, s) => sum + s.progress, 0) / realStudentGoals.length) : 0

  if (goalsLoading) return <LoadingSpinner />
  if (goalsError) return <ErrorFallback error={goalsError} />

  return (
    <PageContainer>
      <PageContentHeader
        title="Student Goals Management"
        description="Monitor and guide your students' progress toward their goals"
      />

      {/* Summary Stats */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals}</div>
            <p className="text-xs text-muted-foreground">Students working toward goals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
            <p className="text-xs text-muted-foreground">Goals achieved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{needsAttention}</div>
            <p className="text-xs text-muted-foreground">Students requiring support</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <p className="text-xs text-muted-foreground">Across all goals</p>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students or goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'active', 'completed', 'paused'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Student Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => {
          const isHighlighted = searchParams.get('student') === student.studentId
          return (
          <Card
            key={student.studentId}
            className={`hover:shadow-md transition-shadow ${isHighlighted ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{student.studentName}</h3>
                    <p className="text-xs text-muted-foreground">{student.studentEmail}</p>
                  </div>
                </div>
                {student.hasUnreadMessages && (
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Goal Title */}
              <div>
                <h4 className="font-medium text-sm mb-1">{student.goalTitle}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{student.currentAmount} / {student.targetAmount}</span>
                  <span>•</span>
                  <span>Due {new Date(student.targetDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{student.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor(student.progress, student.status)}`}
                    style={{ width: `${student.progress}%` }}
                  />
                </div>
              </div>

              {/* Status and Activity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(student.status, student.progress)}
                  {student.needsAttention && (
                    <Badge variant="destructive" className="text-xs">Attention</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{student.lastActive}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{student.daysActive}</div>
                  <div className="text-muted-foreground">Days Active</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">
                    {new Date(student.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-muted-foreground">Started</div>
                </div>
              </div>

              {/* Action Button */}
              <Button asChild className="w-full" size="sm">
                <Link href={`/instructor/student-goals/${student.studentId}`}>
                  <Target className="h-4 w-4 mr-2" />
                  Manage Goals
                </Link>
              </Button>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No students found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No students have set up goals yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

export default function InstructorStudentGoalsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InstructorStudentGoalsContent />
    </Suspense>
  )
}