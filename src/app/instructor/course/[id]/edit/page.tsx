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
import { useQueryClient } from '@tanstack/react-query'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseEdit } from '@/hooks/use-course-queries'
import { useChaptersEdit } from '@/hooks/use-chapter-queries'
import { useVideoBatchOperations, useVideoDelete, useVideoUpload } from '@/hooks/use-video-queries'
import { useFormState } from '@/hooks/use-form-state'
import { ChapterManager } from '@/components/course/ChapterManager'
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"

export default function EditCourseV3Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()
  
  // New architecture hooks
  const queryClient = useQueryClient()
  const ui = useCourseCreationUI()
  const { course, isLoading, error, updateCourse, isUpdating } = useCourseEdit(courseId)
  
  // Preload chapters data to avoid separate loading states
  const { 
    chapters, 
    createChapter, 
    reorderChapters,
    isLoading: chaptersLoading,
    error: chaptersError 
  } = useChaptersEdit(courseId)
  
  // Video operations hooks
  const { uploadVideoAsync } = useVideoUpload(courseId)
  
  // PROFESSIONAL FORM STATE PATTERN: Form state as source of truth for inputs
  const formState = useFormState({
    title: course?.title || '',
    description: course?.description || '',
    price: course?.price || null,
    difficulty: course?.difficulty || 'beginner'
  })
  
  // Update form state when server data changes (after fetch or optimistic update)
  // Use primitive values to avoid infinite loops
  React.useEffect(() => {
    if (course) {
      formState.updateInitialValues({
        title: course.title || '',
        description: course.description || '',
        price: course.price || null,
        difficulty: course.difficulty || 'beginner'
      })
    }
  }, [course?.title, course?.description, course?.price, course?.difficulty, course?.id])
  
  // Removed noisy TanStack debug logs
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from TanStack mutations directly
  const { batchUpdateVideos, batchUpdateVideosMutation, isBatchUpdating, videoPendingChanges } = useVideoBatchOperations(courseId)
  const { updateChapter, updateChapterMutation, deleteChapter, deleteChapterMutation, isUpdating: isUpdatingChapters, isDeleting: isDeletingChapters } = useChaptersEdit(courseId)
  const { deleteVideo, isDeleting: isDeletingVideos } = useVideoDelete(courseId)
  
  // Get unified content pending changes count (stable primitive)
  const contentPendingChangesCount = ui.getContentPendingChangesCount()
  const pendingDeletesCount = ui.pendingDeletes.size
  
  // Manual save state for immediate button feedback
  const [isSavingManually, setIsSavingManually] = React.useState(false)
  
  // Comprehensive loading state for all save operations
  const isSaving = isSavingManually || isUpdating || isBatchUpdating || isUpdatingChapters || isDeletingChapters || isDeletingVideos
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from appropriate stores without mixing data
  const hasChanges = React.useMemo(() => {
    if (!course) return false // No server data yet
    
    // Course info changes (Professional form state pattern - use isDirty for immediate feedback)
    const courseInfoChanged = formState.isDirty
    
    // Content changes (UI orchestration, not data mixing) - Videos + Chapters unified
    const contentChanges = contentPendingChangesCount > 0
    
    // Pending deletions (UI state from Zustand)
    const pendingDeletions = pendingDeletesCount > 0
    
    // Pending chapter creations (TanStack cache with pending flag)
    const pendingChapterCreations = chapters?.some((ch: any) => ch._isPendingCreation) || false
    
    return courseInfoChanged || contentChanges || pendingDeletions || pendingChapterCreations
  }, [
    course,
    formState.isDirty, // Use isDirty for immediate response to optimistic reset
    contentPendingChangesCount, // Stable primitive value - includes both video and chapter changes
    pendingDeletesCount, // Pending deletions count from Zustand
    chapters // Pending chapter creations in TanStack
  ])
  
  // ARCHITECTURE-COMPLIANT: No data copying or synchronization
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - coordinate multiple TanStack mutations
  // Chapter Manager handler functions (inlined from EnhancedChapterManager)
  const handleCreateChapter = (title: string) => {
    createChapter(title)
  }
  
  const handleUpdateChapter = (chapterId: string, updates: Partial<any>) => {
    updateChapter({ chapterId, updates })
  }
  
  const handleDeleteChapter = (chapterId: string) => {
    // ARCHITECTURE-COMPLIANT: Only mark for deletion in UI store (Zustand)
    // Actual deletion happens on Save via TanStack mutations
    if (ui.pendingDeletes.has(chapterId)) {
      ui.unmarkForDeletion(chapterId)
    } else {
      ui.markForDeletion(chapterId)
      // Also mark all videos in this chapter for deletion
      const chapter = chapters?.find(ch => ch.id === chapterId)
      if (chapter?.videos) {
        chapter.videos.forEach(video => {
          ui.markForDeletion(video.id)
        })
      }
    }
  }
  
  const handleReorderChapters = (newOrder: any[]) => {
    reorderChapters(newOrder)
  }
  
  const handleVideoUpload = async (chapterId: string, files: FileList) => {
    const fileArray = Array.from(files)
    
    console.log('🚀 [UPLOAD PROGRESS] Starting video upload:', {
      chapterId,
      fileCount: fileArray.length,
      fileNames: fileArray.map(f => f.name),
      fileSizes: fileArray.map(f => `${(f.size / 1024 / 1024).toFixed(2)}MB`)
    })
    
    // ARCHITECTURE-COMPLIANT: Upload progress managed by TanStack Query
    fileArray.forEach((file) => {
      const tempVideoId = `temp-video-${Date.now()}-${Math.random()}`
      console.log(`📤 [UPLOAD PROGRESS] Starting upload for ${file.name} with tempId: ${tempVideoId}`)
      
      uploadVideoAsync({
        file,
        chapterId,
        tempVideoId
      }).then((result) => {
        console.log(`✅ [UPLOAD PROGRESS] Upload completed for ${file.name}:`, result)
      }).catch((error) => {
        console.error(`❌ [UPLOAD PROGRESS] Upload failed for ${file.name}:`, error)
      })
    })
  }
  
  const handleVideoRename = (videoId: string, newName: string) => {
    // ARCHITECTURE-COMPLIANT: Stage video rename in UI store, save on unified Save
    console.log('📝 Staging video rename:', videoId, newName)
    ui.updateVideoPendingChanges(videoId, newName)
  }
  
  const handleVideoDelete = (videoId: string) => {
    // ARCHITECTURE-COMPLIANT: Mark for deletion in UI store, delete on unified Save
    console.log('🗑️ Marking video for deletion:', videoId)
    if (ui.pendingDeletes.has(videoId)) {
      // If already marked, unmark it (toggle behavior)
      ui.unmarkForDeletion(videoId)
    } else {
      // Mark for deletion
      ui.markForDeletion(videoId)
    }
  }
  
  const handleMoveVideo = (videoId: string, fromChapterId: string, toChapterId: string) => {
    batchUpdateVideos({ 
      courseId, 
      updates: [{ id: videoId, chapter_id: toChapterId, order: 0 }] 
    })
  }
  
  const handleVideoPreview = (video: any) => {
    ui.openModal('video-preview', video)
  }
  
  const handlePendingChangesUpdate = (
    hasChanges: boolean, 
    changeCount: number, 
    saveFunction: () => void, 
    isSaving?: boolean
  ) => {
    // Parent component uses UI orchestration to read TanStack state
  }
  
  const handleTabNavigation = (
    currentId: string, 
    currentType: 'chapter' | 'video', 
    direction: 'next' | 'previous'
  ) => {
    console.log('Tab navigation:', { currentId, currentType, direction })
  }

  const handleSave = async () => {
    if (!hasChanges || isSaving) return

    // Immediately disable save button for better UX
    setIsSavingManually(true)

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
      // UI Orchestration: Wait for ALL server confirmations before showing success
      const savePromises: Promise<any>[] = []
      let chapterDeletes: string[] = [] // Declare at function scope
      
      // 1. Save video changes via TanStack mutation - AWAIT COMPLETION
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
          console.log('🎬 Executing WebSocket video batch update...', videoUpdates)
          // Use WebSocket-enabled batch update (no need to wait - WebSocket handles confirmation)
          batchUpdateVideos(videoUpdates)
          
          // Clear video pending changes from unified system
          ui.clearAllVideoPendingChanges()
        }
      }

      // 2. Save chapter name changes via TanStack mutation - AWAIT COMPLETION
      const chapterPendingChanges = ui.getChapterPendingChanges()
      if (Object.keys(chapterPendingChanges).length > 0) {
        console.log('📚 Orchestrating chapter name save via TanStack...', {
          pendingCount: Object.keys(chapterPendingChanges).length,
          pendingChanges: chapterPendingChanges
        })
        
        // Save each chapter name change using WebSocket-enabled mutations
        for (const [chapterId, newTitle] of Object.entries(chapterPendingChanges)) {
          console.log('📝 Updating chapter title with WebSocket:', chapterId, newTitle)
          updateChapter(chapterId, { title: newTitle })
        }
        
        // Clear chapter pending changes from unified system
        ui.clearAllChapterPendingChanges()
      }

      // 2.5. Save pending chapter creations to database (Architecture-Compliant Consolidated UX)
      const pendingChaptersToCreate = chapters?.filter((ch: any) => ch._isPendingCreation) || []
      if (pendingChaptersToCreate.length > 0) {
        console.log('📑 Saving pending chapters to database...', {
          pendingCount: pendingChaptersToCreate.length,
          pendingChapters: pendingChaptersToCreate.map(ch => ({ id: ch.id, title: ch.title }))
        })
        
        for (const pendingChapter of pendingChaptersToCreate) {
          try {
            const { saveChapterToDatabaseAction } = await import('@/app/actions/chapter-actions')
            
            const result = await saveChapterToDatabaseAction(
              courseId,
              pendingChapter.id, 
              pendingChapter.title
            )
            
            if (result.success) {
              // Update chapter in cache to remove pending flag and add server data - USE CORRECT CACHE KEY
              const { chapterKeys } = await import('@/hooks/use-chapter-queries')
              queryClient.setQueryData(chapterKeys.list(courseId), (old: any[] = []) =>
                old.map(ch => 
                  ch.id === pendingChapter.id 
                    ? { ...ch, _isPendingCreation: undefined, ...result.data }
                    : ch
                )
              )
              console.log('✅ Chapter saved to database:', pendingChapter.title)
            } else {
              console.error('❌ Chapter save failed:', result.error)
            }
          } catch (error) {
            console.error('Failed to save pending chapter:', pendingChapter, error)
          }
        }
      }

      // 3. Process pending deletions via TanStack mutations
      const pendingDeletesArray = Array.from(ui.pendingDeletes)
      if (pendingDeletesArray.length > 0) {
        console.log('🗑️ Orchestrating deletions via TanStack...', {
          pendingCount: pendingDeletesArray.length,
          pendingDeletes: pendingDeletesArray
        })
        
        // Separate videos and chapters for different deletion handlers
        const videoDeletes = []
        chapterDeletes = [] // Use the function-scoped variable
        
        pendingDeletesArray.forEach(id => {
          if (id.startsWith('chapter-')) {
            chapterDeletes.push(id)
          } else {
            videoDeletes.push(id)
          }
        })
        
        // Process deletions - AWAIT COMPLETION
        videoDeletes.forEach(videoId => {
          if (!chapterDeletes.some(chapterId => chapters?.find(ch => ch.id === chapterId)?.videos.some(v => v.id === videoId))) {
            console.log('🗑️ Deleting video:', videoId)
            const deletionPromise = new Promise((resolve, reject) => {
              deleteVideo(videoId, {
                onSuccess: (result) => {
                  console.log('✅ Video deletion confirmed by server:', videoId)
                  resolve(result)
                },
                onError: (error) => {
                  console.error('❌ Video deletion failed on server:', videoId, error)
                  reject(error)
                }
              })
            })
            savePromises.push(deletionPromise)
          }
        })
        
        // Process chapter deletions using WebSocket-enabled mutations
        chapterDeletes.forEach(chapterId => {
          console.log('🗑️ Deleting chapter with WebSocket:', chapterId)
          deleteChapter(chapterId)
        })
        
        // Clear pending deletes - TanStack will handle UI updates
        ui.clearPendingDeletes()
      }

      // 4. Save course info changes via TanStack mutation - AWAIT COMPLETION
      const courseUpdates = formState.getChangedFieldsFromServer(course)

      if (Object.keys(courseUpdates).length > 0) {
        console.log('📝 Orchestrating course info save via TanStack (only changed fields)...', {
          courseUpdates
        })
        
        // PROFESSIONAL UX: Optimistic form reset for immediate UI feedback
        const optimisticData = { ...course, ...courseUpdates }
        formState.updateInitialValues(optimisticData as typeof course)
        
        // Wait for course update completion
        const courseUpdatePromise = new Promise((resolve, reject) => {
          updateCourse(courseUpdates, {
            onSuccess: (result) => {
              console.log('✅ Course update confirmed by server')
              resolve(result)
            },
            onError: (error) => {
              console.error('❌ Course update failed on server:', error)
              reject(error)
            }
          })
        })
        savePromises.push(courseUpdatePromise)
      } else {
        console.log('✅ No course info changes to save!')
      }

      // WEBSOCKET COORDINATION: Track all operations for coordinated completion
      const operationCount = [
        Object.keys(videoPendingChangesFromUI).length > 0 ? 1 : 0,
        Object.keys(chapterPendingChanges).length > 0 ? 1 : 0,
        chapterDeletes.length > 0 ? 1 : 0,
        Object.keys(courseUpdates).length > 0 ? 1 : 0
      ].filter(Boolean).length
      
      // Wait for legacy operations (course updates, pending chapter saves)
      if (savePromises.length > 0) {
        console.log(`⏳ Waiting for ${savePromises.length} legacy operations to complete...`)
        await Promise.all(savePromises)
        console.log('✅ Legacy operations confirmed')
      }
      
      // Show immediate success for WebSocket operations (they have real-time confirmation)
      // WebSocket operations will show their own individual toasts when server confirms
      if (operationCount > 0 && savePromises.length === 0) {
        // All operations are WebSocket-enabled, show immediate toast
        toast.success('Changes saved - confirmations will appear shortly')
      } else if (operationCount === 0) {
        // No changes detected
        toast.success('Course updated')
      } else {
        // Mixed operations - some legacy waited for, show general success
        toast.success('Course updated')
      }

    } catch (error) {
      console.error('❌ Error in UI orchestration:', error)
      toast.error('Failed to update course')
    } finally {
      // Re-enable save button after all operations complete
      setIsSavingManually(false)
    }
  }
  
  // PROFESSIONAL PATTERN: Form state handles all input changes
  const handleInputChange = (field: keyof typeof formState.values, value: any) => {
    formState.setValue(field, value)
  }

  if (isLoading || chaptersLoading || !course || !chapters) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Enhanced skeleton that matches the actual layout */}
        <div className="space-y-6">
          {/* Sticky Header Skeleton */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 skeleton-shimmer rounded" />
                  <div className="space-y-2">
                    <div className="h-6 w-48 skeleton-shimmer rounded" />
                    <div className="h-4 w-20 skeleton-shimmer rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-20 skeleton-shimmer rounded" />
                  <div className="h-8 w-16 skeleton-shimmer rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Course Details Skeleton - 33% Width */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <div className="h-6 w-32 skeleton-shimmer rounded" />
                  <div className="h-4 w-40 skeleton-shimmer rounded" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Course Title Skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 w-20 skeleton-shimmer rounded" />
                    <div className="h-10 w-full skeleton-shimmer rounded" />
                  </div>
                  
                  {/* Price Skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 w-16 skeleton-shimmer rounded" />
                    <div className="h-10 w-full skeleton-shimmer rounded" />
                  </div>

                  {/* Description Skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 w-24 skeleton-shimmer rounded" />
                    <div className="h-24 w-full skeleton-shimmer rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Course Content Skeleton - 67% Width */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="h-6 w-36 skeleton-shimmer rounded" />
                  <div className="h-4 w-64 skeleton-shimmer rounded" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-6 pb-6 space-y-4">
                    {/* Chapter Manager Skeleton */}
                    <div className="space-y-4">
                      {/* Add Chapter Button Skeleton */}
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-32 skeleton-shimmer rounded" />
                      </div>
                      
                      {/* Chapter Skeletons */}
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-5 w-5 skeleton-shimmer rounded" />
                                <div className="h-5 w-40 skeleton-shimmer rounded" />
                                <div className="h-5 w-8 skeleton-shimmer rounded-full" />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 skeleton-shimmer rounded" />
                                <div className="h-8 w-8 skeleton-shimmer rounded" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {/* Video Skeletons */}
                              {[1, 2].map((j) => (
                                <div key={j} className="flex items-center gap-3 p-3 border rounded-lg">
                                  <div className="h-4 w-4 bg-muted/30 animate-pulse rounded" />
                                  <div className="h-8 w-8 bg-muted/20 animate-pulse rounded" />
                                  <div className="flex-1">
                                    <div className="h-4 w-48 bg-muted/20 animate-pulse rounded mb-1" />
                                    <div className="h-3 w-24 bg-muted/10 animate-pulse rounded" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-muted/20 animate-pulse rounded" />
                                    <div className="h-6 w-6 bg-muted/20 animate-pulse rounded" />
                                  </div>
                                </div>
                              ))}
                              
                              {/* Upload Button Skeleton */}
                              <div className="border-2 border-dashed border-muted/30 rounded-lg p-6">
                                <div className="text-center space-y-2">
                                  <div className="h-8 w-8 bg-muted/20 animate-pulse rounded mx-auto" />
                                  <div className="h-4 w-32 bg-muted/20 animate-pulse rounded mx-auto" />
                                  <div className="h-3 w-40 bg-muted/10 animate-pulse rounded mx-auto" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                disabled={!hasChanges || isSaving}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
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
                <ChapterManager
                  chapters={chapters || []}
                  onCreateChapter={handleCreateChapter}
                  onUpdateChapter={handleUpdateChapter}
                  onDeleteChapter={handleDeleteChapter}
                  onReorderChapters={handleReorderChapters}
                  onVideoUpload={handleVideoUpload}
                  onVideoRename={handleVideoRename}
                  batchRenameMutation={{
                    mutate: (updates: Array<{ id: string, title?: string }>) => 
                      batchUpdateVideos({ courseId, updates }),
                    isPending: isBatchUpdating
                  }}
                  onVideoDelete={handleVideoDelete}
                  onVideoPreview={handleVideoPreview}
                  onMoveVideo={handleMoveVideo}
                  onPendingChangesUpdate={handlePendingChangesUpdate}
                  onTabNavigation={handleTabNavigation}
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
      
      {/* Removed noisy modal debug logs */}
    </div>
  )
}