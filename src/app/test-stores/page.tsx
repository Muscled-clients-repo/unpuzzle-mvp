"use client"

import { useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function TestStoresPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  
  // Test new student stores
  const { 
    // Student Course Slice
    enrolledCourses,
    loadEnrolledCourses,
    calculateProgress,
    
    // Student Video Slice  
    currentVideo,
    selectedSegment,
    reflections,
    loadStudentVideo,
    setVideoSegment,
    clearVideoSegment,
    addReflection,
    
    // Instructor Course Slice
    instructorCourses,
    currentCourseAnalytics,
    loadInstructorCourses,
    loadCourseAnalytics,
    
    // Instructor Video Slice
    currentVideoData,
    selectedStudent,
    studentActivities,
    loadInstructorVideo,
    selectStudent,
    navigateToReflection,
  } = useAppStore()
  
  const runStudentCourseTests = async () => {
    const results: string[] = []
    
    try {
      // Test loading enrolled courses
      await loadEnrolledCourses('student-1')
      results.push('✅ loadEnrolledCourses executed')
      
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get fresh state
      const currentState = useAppStore.getState()
      
      if (currentState.enrolledCourses.length > 0) {
        results.push(`✅ Loaded ${currentState.enrolledCourses.length} enrolled courses`)
        
        // Test progress calculation
        const progress = calculateProgress(currentState.enrolledCourses[0].id)
        results.push(`✅ calculateProgress returned ${progress}%`)
      } else {
        results.push('⚠️ No enrolled courses loaded (mock data expected)')
      }
    } catch (error) {
      results.push(`❌ Error: ${error}`)
    }
    
    setTestResults(prev => [...prev, ...results])
  }
  
  const runStudentVideoTests = async () => {
    const results: string[] = []
    
    try {
      // Test loading student video
      await loadStudentVideo('video-1')
      results.push('✅ loadStudentVideo executed')
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      const currentState = useAppStore.getState()
      
      if (currentState.currentVideo) {
        results.push(`✅ Video loaded: ${currentState.currentVideo.title}`)
        
        // Test video segment selection
        setVideoSegment(10, 30)
        results.push('✅ setVideoSegment(10, 30) executed')
        
        await new Promise(resolve => setTimeout(resolve, 50))
        const segmentState = useAppStore.getState()
        
        if (segmentState.selectedSegment) {
          results.push(`✅ Segment set: ${segmentState.selectedSegment.inPoint}s to ${segmentState.selectedSegment.outPoint}s`)
        }
        
        // Test adding reflection
        await addReflection({
          content: 'Test reflection',
          timestamp: 15,
          timeInSeconds: 15,
          type: 'text'
        })
        results.push('✅ addReflection executed')
        
        await new Promise(resolve => setTimeout(resolve, 50))
        const reflectionState = useAppStore.getState()
        
        if (reflectionState.reflections.length > 0) {
          results.push(`✅ ${reflectionState.reflections.length} reflection(s) added`)
        }
        
        // Clear segment
        clearVideoSegment()
        results.push('✅ clearVideoSegment executed')
      } else {
        results.push('⚠️ No video loaded (mock data expected)')
      }
    } catch (error) {
      results.push(`❌ Error: ${error}`)
    }
    
    setTestResults(prev => [...prev, ...results])
  }
  
  const runInstructorCourseTests = async () => {
    const results: string[] = []
    
    try {
      // Test loading instructor courses
      await loadInstructorCourses('instructor-1')
      results.push('✅ loadInstructorCourses executed')
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      const currentState = useAppStore.getState()
      
      if (currentState.instructorCourses.length > 0) {
        results.push(`✅ Loaded ${currentState.instructorCourses.length} instructor courses`)
        
        // Test loading course analytics
        await loadCourseAnalytics(currentState.instructorCourses[0].id)
        results.push('✅ loadCourseAnalytics executed')
        
        await new Promise(resolve => setTimeout(resolve, 100))
        const analyticsState = useAppStore.getState()
        
        if (analyticsState.currentCourseAnalytics) {
          results.push(`✅ Analytics loaded: ${analyticsState.currentCourseAnalytics.totalStudents} students`)
        }
      } else {
        results.push('⚠️ No instructor courses loaded (mock data expected)')
      }
    } catch (error) {
      results.push(`❌ Error: ${error}`)
    }
    
    setTestResults(prev => [...prev, ...results])
  }
  
  const runInstructorVideoTests = async () => {
    const results: string[] = []
    
    try {
      // Test loading instructor video
      await loadInstructorVideo('video-1')
      results.push('✅ loadInstructorVideo executed')
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      const currentState = useAppStore.getState()
      
      if (currentState.currentVideoData) {
        results.push(`✅ Video data loaded: ${currentState.currentVideoData.title}`)
        results.push(`✅ ${currentState.studentActivities.length} student activities found`)
        
        // Test student selection
        selectStudent('student-1')
        results.push('✅ selectStudent("student-1") executed')
        
        await new Promise(resolve => setTimeout(resolve, 50))
        const selectState = useAppStore.getState()
        results.push(`✅ Selected student: ${selectState.selectedStudent}`)
        
        // Test navigation
        if (currentState.studentActivities.length > 0) {
          navigateToReflection(0)
          results.push('✅ navigateToReflection(0) executed')
        }
        
        // Test all students view
        selectStudent('all')
        results.push('✅ selectStudent("all") executed')
      } else {
        results.push('⚠️ No video data loaded (mock data expected)')
      }
    } catch (error) {
      results.push(`❌ Error: ${error}`)
    }
    
    setTestResults(prev => [...prev, ...results])
  }
  
  const clearResults = () => {
    setTestResults([])
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Store Testing Dashboard</h1>
      
      <div className="grid gap-6">
        {/* Student Store Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Student Stores
              <Badge variant="secondary">New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={runStudentCourseTests}>
                Test Student Course Store
              </Button>
              <Button onClick={runStudentVideoTests}>
                Test Student Video Store
              </Button>
            </div>
            
            {enrolledCourses.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Enrolled Courses: {enrolledCourses.length}
              </div>
            )}
            
            {currentVideo && (
              <div className="text-sm text-muted-foreground">
                Current Video: {currentVideo.title}
              </div>
            )}
            
            {selectedSegment && (
              <div className="text-sm text-muted-foreground">
                Segment: {selectedSegment.inPoint}s - {selectedSegment.outPoint}s
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Instructor Store Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Instructor Stores
              <Badge variant="secondary">New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={runInstructorCourseTests}>
                Test Instructor Course Store
              </Button>
              <Button onClick={runInstructorVideoTests}>
                Test Instructor Video Store
              </Button>
            </div>
            
            {instructorCourses.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Instructor Courses: {instructorCourses.length}
              </div>
            )}
            
            {currentVideoData && (
              <div className="text-sm text-muted-foreground">
                Video Analytics: {studentActivities.length} activities
              </div>
            )}
            
            {selectedStudent && (
              <div className="text-sm text-muted-foreground">
                Selected Student: {selectedStudent}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Component Testing:</p>
              <div className="flex gap-2">
                <a 
                  href="/test-instructor-video" 
                  className="text-sm text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🎬 Test InstructorVideoView ↗
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Test Results
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No tests run yet. Click the buttons above to test stores.</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`text-sm ${
                      result.startsWith('✅') ? 'text-green-600' :
                      result.startsWith('❌') ? 'text-red-600' :
                      result.startsWith('⚠️') ? 'text-yellow-600' :
                      ''
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}