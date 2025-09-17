'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { debugCourseVisibility } from '@/app/actions/debug-course-visibility'

export default function DebugCourseVisibilityPage() {
  const [studentEmail, setStudentEmail] = useState('12@123.com')
  const [courseId, setCourseId] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDebug = async () => {
    if (!studentEmail || !courseId) return

    setIsLoading(true)
    try {
      const result = await debugCourseVisibility(studentEmail, courseId)
      setResult(result)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Debug Course Visibility</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student Email</label>
            <Input
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Course ID</label>
            <Input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="course-uuid"
            />
          </div>
          <Button onClick={handleDebug} disabled={isLoading || !studentEmail || !courseId}>
            {isLoading ? 'Debugging...' : 'Debug Visibility'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}