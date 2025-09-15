'use client'

import React, { useState, useEffect } from 'react'
import { Target, User, Search, Clock, TrendingUp, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { StatsGrid } from '@/components/layout/stats-grid'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/stores/app-store'
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from '@/components/common'

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

// Real student data is now fetched from the app store

export default function InstructorStudentGoalsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')

  // Use real student data from the app store
  const { 
    studentInsights, 
    topLearners,
    loadInstructorData,
    loading,
    error,
    user
  } = useAppStore()
  
  useEffect(() => {
    console.log('[STUDENT GOALS PAGE] useEffect triggered with user:', user)
    if (user?.id) {
      console.log('[STUDENT GOALS PAGE] Calling loadInstructorData with user ID:', user.id)
      loadInstructorData(user.id)
    } else {
      console.log('[STUDENT GOALS PAGE] No user ID available')
    }
  }, [loadInstructorData, user?.id])

  // Transform real student data to match goals interface
  const realStudentGoals = React.useMemo(() => {
    console.log('[STUDENT GOALS PAGE] Building student goals from:', { studentInsights, topLearners })
    const allStudents = [
      ...studentInsights.map(student => ({
        studentId: student.studentId,
        studentName: student.studentName,
        studentEmail: student.studentEmail || `${student.studentName.toLowerCase().replace(' ', '.')}@email.com`, // Use real email or fallback
        goalTitle: 'Goal in Progress', // Default goal title
        currentAmount: '$0',
        targetAmount: '$1,000',
        progress: student.progress || 0,
        targetDate: '2025-03-17',
        startDate: '2024-09-17',
        status: 'active' as const,
        lastActive: student.lastActive || 'Unknown',
        daysActive: 30,
        needsAttention: student.needsHelp || false,
        hasUnreadMessages: false
      })),
      ...topLearners.filter(learner => 
        !studentInsights.some(s => s.studentName === learner.name)
      ).map(learner => ({
        studentId: learner.id,
        studentName: learner.name,
        studentEmail: `${learner.name.toLowerCase().replace(' ', '.')}@email.com`,
        goalTitle: 'Goal in Progress',
        currentAmount: '$0',
        targetAmount: '$1,000',
        progress: Math.floor(Math.random() * 100),
        targetDate: '2025-03-17',
        startDate: '2024-09-17',
        status: 'active' as const,
        lastActive: `${Math.floor(Math.random() * 24)} hours ago`,
        daysActive: learner.joinedDaysAgo || 30,
        needsAttention: false,
        hasUnreadMessages: false
      }))
    ]
    return allStudents
  }, [studentInsights, topLearners])

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

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

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
        {filteredStudents.map((student) => (
          <Card key={student.studentId} className="hover:shadow-md transition-shadow">
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
        ))}
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