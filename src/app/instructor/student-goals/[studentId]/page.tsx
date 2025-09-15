'use client'

import React, { use, useEffect } from 'react'
import { InstructorStudentGoalTracker } from '../components/InstructorStudentGoalTracker'
import { ArrowLeft, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAppStore } from '@/stores/app-store'

interface PageProps {
  params: Promise<{
    studentId: string
  }>
}

// Mock student data - in real implementation, fetch this based on studentId
const getStudentInfo = (studentId: string) => {
  const students = {
    '1': { name: 'Sarah Mitchell', email: '12@123.com' },
    '2': { name: 'Michael Chen', email: 'michael.chen@email.com' },
    '3': { name: 'Emma Rodriguez', email: 'emma.r@email.com' },
    '4': { name: 'David Park', email: 'david.park@email.com' },
    '5': { name: 'Lisa Thompson', email: 'lisa.t@email.com' }
  }
  return students[studentId as keyof typeof students] || { name: 'Unknown Student', email: 'unknown@email.com' }
}

export default function InstructorStudentGoalsPage({ params }: PageProps) {
  const { studentId } = use(params)
  
  // Get real student data from app store
  const { 
    studentInsights, 
    topLearners,
    loadInstructorData,
    user
  } = useAppStore()
  
  useEffect(() => {
    if (user?.id) {
      loadInstructorData(user.id)
    }
  }, [loadInstructorData, user?.id])
  
  // Find the real student data
  const student = React.useMemo(() => {
    const studentInsight = studentInsights.find(s => s.studentId === studentId)
    if (studentInsight) {
      return {
        name: studentInsight.studentName,
        email: studentInsight.studentEmail // Use real email
      }
    }
    
    const topLearner = topLearners.find(l => l.id === studentId)
    if (topLearner) {
      return {
        name: topLearner.name,
        email: `${topLearner.name.toLowerCase().replace(' ', '.')}@email.com` // Fallback for top learners
      }
    }
    
    return getStudentInfo(studentId) // Fallback to mock data
  }, [studentId, studentInsights, topLearners])
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Instructor Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/instructor/student-goals">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Student Goals
                </Button>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {student.name}'s Goals
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student.email}</p>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Instructor View
            </div>
          </div>
        </div>
      </div>
      
      {/* Use new InstructorStudentGoalTracker wrapper */}
      <InstructorStudentGoalTracker 
        studentId={studentId}
        instructorId={user?.id || "current-instructor-id"} // Use real instructor ID
      />
    </div>
  )
}