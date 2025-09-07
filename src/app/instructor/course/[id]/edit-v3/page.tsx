"use client"

import React, { use } from "react"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

// New architecture imports
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseEdit } from '@/hooks/use-course-queries'
import { useChaptersEdit } from '@/hooks/use-chapter-queries'
import { useVideoBatchOperations } from '@/hooks/use-video-queries'
import { useFormState } from '@/hooks/use-form-state'
import { EnhancedChapterManager } from '@/components/course/EnhancedChapterManager'
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"

export default function EditCourseV3Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()
  
  // New architecture hooks
  const ui = useCourseCreationUI()
  const { course, isLoading, error, updateCourse, isUpdating } = useCourseEdit(courseId)
  
  // Preload chapters data to avoid separate loading states
  const { chapters, error: chaptersError } = useChaptersEdit(courseId)
  
  // PROFESSIONAL FORM STATE PATTERN: Form state as source of truth for inputs
  const formState = useFormState({
    title: course?.title || '',
    description: course?.description || '',
    price: course?.price || null,
    difficulty: course?.difficulty || 'beginner'
  })
  
  // Update form state when server data changes (after fetch or optimistic update)
  React.useEffect(() => {
    if (course) {
      formState.updateInitialValues({
        title: course.title || '',
        description: course.description || '',
        price: course.price || null,
        difficulty: course.difficulty || 'beginner'
      })
    }
  }, [course])
  
  // Debug TanStack Query state
  React.useEffect(() => {
    console.log('🔍 [TANSTACK DEBUG] Course query state:', {
      courseId,
      course: !!course,
      courseData: course,
      isLoading,
      error: error?.message,
      hasUpdateFunction: !!updateCourse
    })
  }, [courseId, course, isLoading, error])
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from TanStack mutations directly
  const { batchUpdateVideos, isBatchUpdating, videoPendingChanges } = useVideoBatchOperations(courseId)
  const { updateChapter } = useChaptersEdit(courseId)
  
  // Get unified content pending changes count (stable primitive)
  const contentPendingChangesCount = ui.getContentPendingChangesCount()
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from appropriate stores without mixing data
  const hasChanges = React.useMemo(() => {
    if (!course) return false // No server data yet
    
    // Course info changes (Professional form state pattern - use isDirty for immediate feedback)
    const courseInfoChanged = formState.isDirty
    
    // Content changes (UI orchestration, not data mixing) - Videos + Chapters unified
    const contentChanges = contentPendingChangesCount > 0
    
    return courseInfoChanged || contentChanges
  }, [
    course,
    formState.isDirty, // Use isDirty for immediate response to optimistic reset
    contentPendingChangesCount // Stable primitive value - includes both video and chapter changes
  ])
  
  // ARCHITECTURE-COMPLIANT: No data copying or synchronization
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - coordinate multiple TanStack mutations
  const handleSave = async () => {
    if (!hasChanges || isUpdating) return

    console.log('🚀 UNIFIED SAVE: UI orchestration of multiple domains...', {
      courseInfoChanges: formState.hasChanges(course),
      contentChanges: contentPendingChangesCount > 0,
      contentBreakdown: {
        videos: Object.keys(ui.getVideoPendingChanges()).length,
        chapters: Object.keys(ui.getChapterPendingChanges()).length,
        total: contentPendingChangesCount
      }
    })

    try {
      // UI Orchestration: Coordinate TanStack mutations without data mixing
      
      // 1. Save video changes via TanStack mutation
      const videoPendingChangesFromUI = ui.getVideoPendingChanges()
      if (Object.keys(videoPendingChangesFromUI).length > 0) {
        console.log('🎬 Orchestrating video save via TanStack...', {
          pendingCount: Object.keys(videoPendingChangesFromUI).length,
          pendingChanges: videoPendingChangesFromUI
        })
        
        // Convert Zustand pending changes to TanStack mutation format
        const videoUpdates = Object.entries(videoPendingChangesFromUI).map(([videoId, newTitle]) => ({
          id: videoId,
          title: newTitle
        }))
        
        if (videoUpdates.length > 0) {
          console.log('🎬 Executing video batch update...', videoUpdates)
          batchUpdateVideos({ courseId, updates: videoUpdates })
          
          // Clear video pending changes from unified system
          ui.clearAllVideoPendingChanges()
        }
      }

      // 2. Save chapter name changes via TanStack mutation  
      const chapterPendingChanges = ui.getChapterPendingChanges()
      if (Object.keys(chapterPendingChanges).length > 0) {
        console.log('📚 Orchestrating chapter name save via TanStack...', {
          pendingCount: Object.keys(chapterPendingChanges).length,
          pendingChanges: chapterPendingChanges
        })
        
        // Save each chapter name change  
        for (const [chapterId, newTitle] of Object.entries(chapterPendingChanges)) {
          updateChapter({ chapterId, updates: { title: newTitle } })
        }
        
        // Clear chapter pending changes from unified system
        ui.clearAllChapterPendingChanges()
      }

      // 3. Save course info changes via TanStack mutation - ONLY CHANGED FIELDS
      const courseUpdates = formState.getChangedFieldsFromServer(course)

      if (Object.keys(courseUpdates).length > 0) {
        console.log('📝 Orchestrating course info save via TanStack (only changed fields)...', {
          courseUpdates,
          currentServerData: { title: course?.title, description: course?.description, price: course?.price, difficulty: course?.difficulty },
          formData: formState.values
        })
        
        // PROFESSIONAL UX: Optimistic form reset for immediate UI feedback
        const optimisticData = { ...course, ...courseUpdates }
        formState.updateInitialValues(optimisticData as typeof course)
        
        updateCourse(courseUpdates, {
          onSuccess: (result) => {
            console.log('✅ Course save successful, optimistic reset was correct...', result)
            // Form state already reset optimistically
          },
          onError: (error) => {
            console.error('❌ Course save failed, reverting form state...', error)
            // Revert to original server data on error
            formState.updateInitialValues({
              title: course.title || '',
              description: course.description || '',
              price: course.price || null,
              difficulty: course.difficulty || 'beginner'
            })
          }
        })
      } else {
        console.log('✅ ARCHITECTURE-COMPLIANT SAVE: No course info changes to save!')
      }

      // Show single consolidated success toast
      const savedItems = []
      if (videoPendingChangesFromUI && Object.keys(videoPendingChangesFromUI).length > 0) {
        const count = Object.keys(videoPendingChangesFromUI).length
        savedItems.push(`${count} video filename${count > 1 ? 's' : ''}`)
      }
      if (chapterPendingChanges && Object.keys(chapterPendingChanges).length > 0) {
        const count = Object.keys(chapterPendingChanges).length  
        savedItems.push(`${count} chapter name${count > 1 ? 's' : ''}`)
      }
      if (courseUpdates && Object.keys(courseUpdates).length > 0) {
        savedItems.push('course details')
      }
      
      if (savedItems.length > 0) {
        toast.success(`✅ Successfully saved ${savedItems.join(', ')}!`)
      }

    } catch (error) {
      console.error('❌ ARCHITECTURE-COMPLIANT SAVE: Error in UI orchestration:', error)
    }
  }
  
  // PROFESSIONAL PATTERN: Form state handles all input changes
  const handleInputChange = (field: keyof typeof formState.values, value: any) => {
    formState.setValue(field, value)
  }

  if ((isLoading && !course) || !chapters) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Subtle loading skeleton */}
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-muted/30 animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-muted/30 animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted/20 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 w-16 bg-muted/20 animate-pulse rounded-full" />
              <div className="h-9 w-32 bg-muted/30 animate-pulse rounded" />
            </div>
          </div>
          
          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="flex space-x-1 bg-muted/10 p-1 rounded-lg w-fit">
              <div className="h-8 w-24 bg-muted/20 animate-pulse rounded" />
              <div className="h-8 w-20 bg-muted/20 animate-pulse rounded" />
              <div className="h-8 w-20 bg-muted/20 animate-pulse rounded" />
            </div>
            
            {/* Content skeleton */}
            <div className="border border-muted/20 rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted/30 animate-pulse rounded" />
                <div className="h-4 w-full max-w-md bg-muted/20 animate-pulse rounded" />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted/20 animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted/20 animate-pulse rounded" />
                  <div className="h-24 w-full bg-muted/20 animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-muted/20 animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted/20 animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted/20 animate-pulse rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || chaptersError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load course data</p>
          <p className="text-sm text-muted-foreground">
            {error?.message || chaptersError?.message || 'Unknown error'}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p>Course not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/instructor/courses')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {formState.values.title || course?.title || 'Course Editor'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {course?.status === 'published' ? 'Live Course' : 'Draft'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
              >
                {course.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isUpdating}
                size="sm"
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isUpdating ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Course Details - 33% Width */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Course Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Basic information
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Course Title */}
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formState.values.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                  className="font-medium"
                />
              </div>
              
              {/* Price */}
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formState.values.price ?? ''}
                  onChange={(e) => handleInputChange('price', e.target.value ? Number(e.target.value) : null)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.values.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your course..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Content - 67% Width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Content</CardTitle>
              <p className="text-sm text-muted-foreground">
                Organize your course into chapters and lessons
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pb-6">
                <EnhancedChapterManager 
                  courseId={courseId}
                  className="space-y-4"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Preview Modal */}
      {ui.modal.type === 'video-preview' && ui.modal.data && (
        <VideoPreviewModal
          video={ui.modal.data}
          isOpen={true}
          onClose={ui.closeModal}
        />
      )}
    </div>
  )
}