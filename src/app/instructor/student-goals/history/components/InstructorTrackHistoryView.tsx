'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { History, Target, CheckCircle, ArrowRight, Calendar, User, Search, Filter } from 'lucide-react'
import Link from 'next/link'

interface StudentTrackHistory {
  student_id: string
  student_name: string
  student_email: string
  conversations: Array<{
    id: string
    status: string
    created_at: string
    ended_at: string | null
    end_reason: string | null
    track_name: string
    goal_name: string | null
    goal_description: string | null
    target_amount: number | null
    currency: string
    transition_to_track_name: string | null
  }>
}

export function InstructorTrackHistoryView() {
  const { user } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'track_changed'>('all')

  const { data: studentsHistory, isLoading, error } = useQuery({
    queryKey: ['instructor-students-track-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const supabase = createClient()

      // Get all conversations with student and track details
      const { data: conversations, error } = await supabase
        .from('goal_conversations')
        .select(`
          id,
          student_id,
          status,
          created_at,
          ended_at,
          end_reason,
          profiles!goal_conversations_student_id_fkey (
            id,
            full_name,
            email
          ),
          tracks!goal_conversations_track_id_fkey (
            name
          ),
          track_goals (
            name,
            description,
            target_amount,
            currency
          ),
          transition_to_track:tracks!goal_conversations_transition_to_track_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch students track history:', error)
        throw new Error('Failed to fetch students track history')
      }

      // Group conversations by student
      const studentsMap = new Map<string, StudentTrackHistory>()

      conversations?.forEach(conv => {
        const studentId = conv.student_id
        const student = conv.profiles

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            student_id: studentId,
            student_name: student?.full_name || 'Unknown Student',
            student_email: student?.email || 'No email',
            conversations: []
          })
        }

        studentsMap.get(studentId)!.conversations.push({
          id: conv.id,
          status: conv.status,
          created_at: conv.created_at,
          ended_at: conv.ended_at,
          end_reason: conv.end_reason,
          track_name: conv.tracks?.name || 'Unknown Track',
          goal_name: conv.track_goals?.name,
          goal_description: conv.track_goals?.description,
          target_amount: conv.track_goals?.target_amount,
          currency: conv.track_goals?.currency || 'USD',
          transition_to_track_name: conv.transition_to_track?.name
        })
      })

      return Array.from(studentsMap.values())
    },
    enabled: !!user?.id
  })

  // Filter students based on search and status
  const filteredStudents = (studentsHistory || []).filter(student => {
    const matchesSearch = student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.student_email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
                         student.conversations.some(conv => conv.status === statusFilter)

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'track_changed':
        return <Badge className="bg-yellow-100 text-yellow-800">Track Changed</Badge>
      case 'discontinued':
        return <Badge variant="outline">Discontinued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorFallback error={error} />

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'completed', 'track_changed'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className="capitalize"
            >
              {status === 'track_changed' ? 'Track Changed' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Students History */}
      <div className="space-y-6">
        {filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Track History Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No students have track history yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.student_id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{student.student_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.student_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {student.conversations.length} track{student.conversations.length !== 1 ? 's' : ''}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/instructor/student-goals/${student.student_id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {student.conversations.map((conversation, index) => (
                  <div key={conversation.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      conversation.status === 'active' ? 'bg-green-100 text-green-600' :
                      conversation.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {conversation.status === 'active' ? <Target className="h-4 w-4" /> :
                       conversation.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                       <History className="h-4 w-4" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{conversation.track_name}</span>
                        {getStatusBadge(conversation.status)}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDate(conversation.created_at)}</span>
                        {conversation.ended_at && (
                          <>
                            <span>•</span>
                            <span>{formatDate(conversation.ended_at)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{calculateDuration(conversation.created_at, conversation.ended_at)} days</span>
                      </div>

                      {conversation.goal_name && conversation.target_amount && (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Goal: </span>
                          <span className="font-medium">
                            {conversation.goal_name} - {formatCurrency(conversation.target_amount, conversation.currency)}
                          </span>
                        </div>
                      )}

                      {conversation.status === 'track_changed' && conversation.transition_to_track_name && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300">
                          <ArrowRight className="h-3 w-3" />
                          <span>Switched to {conversation.transition_to_track_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}