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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const { chapters } = useChaptersEdit(courseId)
  
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
  const { batchUpdateVideos, isBatchUpdating, hasPendingVideoChanges, videoPendingCount, videoPendingChanges } = useVideoBatchOperations(courseId)
  
  // Get video pending changes by reading TanStack mutation state (UI orchestration)
  const getVideoPendingChanges = React.useCallback(() => {
    return { 
      hasChanges: hasPendingVideoChanges, 
      isSaving: isBatchUpdating,
      changeCount: videoPendingCount 
    }
  }, [hasPendingVideoChanges, isBatchUpdating, videoPendingCount])
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from appropriate stores without mixing data
  const hasChanges = React.useMemo(() => {
    if (!course) return false // No server data yet
    
    // Course info changes (Professional form state pattern - use isDirty for immediate feedback)
    const courseInfoChanged = formState.isDirty
    
    // Video changes (TanStack mutation state) - UI orchestration, not data mixing
    const videoPendingState = getVideoPendingChanges()
    const videoChanges = videoPendingState.hasChanges
    
    // Chapter changes (future TanStack mutation state)
    const chapterChanges = false // Not implemented yet
    
    return courseInfoChanged || videoChanges || chapterChanges
  }, [
    course,
    formState.isDirty, // Use isDirty for immediate response to optimistic reset
    getVideoPendingChanges // This is stable due to useCallback
  ])
  
  // ARCHITECTURE-COMPLIANT: No data copying or synchronization
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - coordinate multiple TanStack mutations
  const handleSave = async () => {
    if (!hasChanges || isUpdating) return

    console.log('🚀 ARCHITECTURE-COMPLIANT SAVE: UI orchestration of multiple domains...', {
      courseInfoChanges: formState.hasChanges(course),
      videoChanges: getVideoPendingChanges().hasChanges
    })

    try {
      // UI Orchestration: Coordinate TanStack mutations without data mixing
      
      // 1. Save video changes via TanStack mutation
      const videoPendingState = getVideoPendingChanges()
      if (videoPendingState.hasChanges) {
        console.log('🎬 Orchestrating video save via TanStack...', {
          pendingCount: videoPendingState.changeCount,
          isSaving: videoPendingState.isSaving,
          pendingChanges: videoPendingChanges
        })
        
        // Convert Zustand pending changes to TanStack mutation format
        const videoUpdates = Object.entries(videoPendingChanges).map(([videoId, newTitle]) => ({
          id: videoId,
          title: newTitle
        }))
        
        if (videoUpdates.length > 0) {
          console.log('🎬 Executing video batch update...', videoUpdates)
          batchUpdateVideos({ courseId, updates: videoUpdates })
          
          // Show success toast for video filename changes
          const videoCount = videoUpdates.length
          toast.success(`📹 ${videoCount} video filename${videoCount > 1 ? 's' : ''} updated successfully!`)
          
          // Clear pending changes from Zustand after initiating save
          ui.clearAllVideoPendingChanges()
        }
      }

      // 2. Save course info changes via TanStack mutation - ONLY CHANGED FIELDS
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load course</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/instructor/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {formState.values.title || course?.title}
            </h1>
            <p className="text-muted-foreground">
              Edit course content and settings
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant={course.status === 'published' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {course.status}
          </Badge>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="course-info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="course-info">Course Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Course Info Tab */}
        <TabsContent value="course-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formState.values.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.values.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your course"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={formState.values.difficulty} 
                    onValueChange={(value) => handleInputChange('difficulty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab - Enhanced Chapter Manager */}
        <TabsContent value="content" className="space-y-6">
          <EnhancedChapterManager 
            courseId={courseId}
            className="space-y-4"
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant={course.status === 'published' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {course.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {course.status === 'published' 
                      ? 'Course is live and visible to students' 
                      : 'Course is in draft mode'
                    }
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  {course.status === 'published' ? 'Unpublish Course' : 'Publish Course'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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