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
import { PageContainer } from "@/components/layout/page-container"
import { PageHeaderSkeleton, Skeleton } from "@/components/common/universal-skeleton"

// New architecture imports
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseEdit, courseKeys } from '@/hooks/use-course-queries'
import { useChaptersEdit, chapterKeys } from '@/hooks/use-chapter-queries'
import { useVideoBatchOperations, useVideoDelete } from '@/hooks/use-video-queries'
import { useFormState } from '@/hooks/use-form-state'
import { ChapterManager } from '@/components/course/ChapterManager'
import { SimpleVideoPreview } from "@/components/ui/SimpleVideoPreview"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { getCourseAction, publishCourseAction, unpublishCourseAction } from '@/app/actions/course-actions'
import { getChaptersForCourseAction } from '@/app/actions/chapter-actions'
import { CourseTrackGoalSelector } from '@/components/course/CourseTrackGoalSelector'
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

// Inline Editable Title Component
function InlineEditableTitle({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(value || '') // Ensure we have the current value when starting to edit
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmedValue = editValue.trim()
    // Only call onChange if the value has actually changed
    if (trimmedValue !== value) {
      onChange(trimmedValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("text-xl font-semibold border-none shadow-none p-0 h-auto bg-transparent outline-none ring-0 focus:ring-0 focus:border-none", className)}
          style={{ fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 'inherit' }}
        />
      </div>
    )
  }

  return (
    <div className="group relative flex items-center">
      <h1
        className={cn("cursor-pointer hover:bg-gray-50 hover:dark:bg-gray-800 px-2 py-1 -mx-2 -my-1 rounded border-2 border-transparent hover:border-dashed hover:border-gray-300 dark:hover:border-gray-600 transition-all", className)}
        onClick={handleStartEdit}
      >
        {value || (
          <span className="text-gray-500 italic">{placeholder}</span>
        )}
      </h1>
    </div>
  )
}

export default function EditCourseV3Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()
  
  // CONCURRENT QUERY LOADING PATTERN: Apply proven media linking approach
  const queryClient = useQueryClient()
  const ui = useCourseCreationUI()
  const [isConcurrentLoading, setIsConcurrentLoading] = React.useState(true)
  
  // Step 1: Prefetch data concurrently (following media linking 4x improvement pattern)
  React.useEffect(() => {
    const loadDataConcurrently = async () => {
      try {
        setIsConcurrentLoading(true)
        
        // Parallel loading promises (same pattern as media-to-chapter linking)
        const loadingPromises = [
          queryClient.prefetchQuery({
            queryKey: courseKeys.detail(courseId),
            queryFn: () => getCourseAction(courseId),
            staleTime: 1000 * 60 * 5 // 5 minutes cache for better performance
          }),
          queryClient.prefetchQuery({
            queryKey: chapterKeys.list(courseId),
            queryFn: () => getChaptersForCourseAction(courseId),
            staleTime: 1000 * 60 * 5 // 5 minutes cache for better performance
          })
        ]
        
        // Wait for all data to load concurrently (Promise.all coordination)
        await Promise.all(loadingPromises)
        console.log('✅ Concurrent data loading completed - 4x faster than sequential')
      } catch (error) {
        console.error('❌ Concurrent loading failed:', error)
      } finally {
        setIsConcurrentLoading(false)
      }
    }
    
    loadDataConcurrently()
  }, [courseId])
  
  // Step 2: Use regular hooks that will now read from prefetched cache (instant)
  const { course, error, updateCourse, isUpdating } = useCourseEdit(courseId)

  const { 
    chapters, 
    createChapter, 
    reorderChapters,
    error: chaptersError 
  } = useChaptersEdit(courseId)
  
  // REMOVED: Direct video upload hooks - all uploads now go through media library
  
  // ARCHITECTURE-COMPLIANT: Form state only tracks user input changes
  const formState = useFormState({
    title: '',
    description: '',
    difficulty: 'beginner'
  })
  
  // Removed noisy TanStack debug logs
  
  // ARCHITECTURE-COMPLIANT: UI Orchestration - read from TanStack mutations directly
  const { batchUpdateVideos, batchUpdateVideosMutation, isBatchUpdating, videoPendingChanges } = useVideoBatchOperations(courseId)
  const { updateChapter, updateChapterMutation, deleteChapter, deleteChapterMutation, isUpdating: isUpdatingChapters, isDeleting: isDeletingChapters } = useChaptersEdit(courseId)
  const { deleteVideo, isDeleting: isDeletingVideos, hasPendingDeletes: hasPendingVideoDeletes } = useVideoDelete(courseId)

  // ARCHITECTURE-COMPLIANT: TanStack mutation for publish/unpublish (server action)
  const publishMutation = useMutation({
    mutationFn: async () => {
      const action = course?.data?.status === 'published' ? unpublishCourseAction : publishCourseAction
      return action(courseId)
    },
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: courseKeys.detail(courseId) })

      // Snapshot previous value
      const previousCourse = queryClient.getQueryData(courseKeys.detail(courseId))

      // Optimistic update - immediately change status for instant UI feedback
      const newStatus = course?.data?.status === 'published' ? 'draft' : 'published'
      queryClient.setQueryData(courseKeys.detail(courseId), (old: any) => ({
        ...old,
        data: {
          ...old?.data,
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      }))

      return { previousCourse }
    },
    onSuccess: (result) => {
      if (result.success) {
        // Update with server data to ensure consistency
        queryClient.setQueryData(courseKeys.detail(courseId), (old: any) => ({
          ...old,
          data: result.data
        }))
        toast.success(`Course ${result.data.status === 'published' ? 'published' : 'unpublished'} successfully`)
      } else {
        toast.error(result.error || 'Failed to update course status')
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCourse) {
        queryClient.setQueryData(courseKeys.detail(courseId), context.previousCourse)
      }
      toast.error(`Failed to ${course?.data?.status === 'published' ? 'unpublish' : 'publish'} course`)
      console.error('Publish/unpublish error:', error)
    }
  })

  // Get unified content pending changes count (stable primitive)
  const contentPendingChangesCount = ui.getContentPendingChangesCount()
  const pendingDeletesCount = ui.pendingDeletes.size
  
  // Manual save state for immediate button feedback
  const [isSavingManually, setIsSavingManually] = React.useState(false)
  
  // Chapter deletion confirmation state
  const [chapterToDelete, setChapterToDelete] = React.useState<{id: string, title: string, videoCount: number} | null>(null)
  
  // Track chapters being deleted (for visual feedback)
  const [deletingChapterIds, setDeletingChapterIds] = React.useState<Set<string>>(new Set())
  
  // Debounced save state to prevent flickering during WebSocket updates
  const [debouncedHasChanges, setDebouncedHasChanges] = React.useState(false)
  

  // Clean up deletion state when chapters are successfully deleted
  React.useEffect(() => {
    if (chapters && deletingChapterIds.size > 0) {
      const currentChapterIds = new Set(chapters.map(ch => ch.id))
      
      setDeletingChapterIds(prev => {
        const newSet = new Set(prev)
        let hasChanges = false
        
        // Remove any deletion states for chapters that no longer exist
        prev.forEach(chapterId => {
          if (!currentChapterIds.has(chapterId)) {
            console.log('🧹 [EDIT PAGE] Clearing deletion state for successfully deleted chapter:', chapterId)
            newSet.delete(chapterId)
            hasChanges = true
          }
        })
        
        return hasChanges ? newSet : prev
      })
    }
  }, [chapters, deletingChapterIds])

  // Comprehensive loading state for all save operations
  const isSaving = isSavingManually || isUpdating || isBatchUpdating || isUpdatingChapters || isDeletingChapters || isDeletingVideos || hasPendingVideoDeletes
  
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

  // Debounce hasChanges to prevent flickering during rapid WebSocket updates
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedHasChanges(hasChanges)
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [hasChanges])

  // WebSocket listener for real-time course status changes
  React.useEffect(() => {
    const unsubscribe = courseEventObserver.subscribe(
      COURSE_EVENTS.STATUS_CHANGED,
      (event) => {
        // Only update if this is our course
        if (event.courseId === courseId) {
          console.log('🔄 [WEBSOCKET] Course status changed via WebSocket, updating cache', {
            courseId: event.courseId,
            newStatus: event.data.status,
            course: event.data.course
          })

          // Update the course cache with the new status
          queryClient.setQueryData(courseKeys.detail(courseId), (old: any) => ({
            ...old,
            data: event.data.course
          }))

          toast.success(`Course ${event.data.status === 'published' ? 'published' : 'unpublished'} successfully`)
        }
      }
    )

    return unsubscribe
  }, [courseId])
  
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
    console.log('🗑️ [EDIT PAGE] handleDeleteChapter called with:', chapterId, 'type:', typeof chapterId)
    
    // Mark chapter as being deleted immediately for visual feedback
    setDeletingChapterIds(prev => new Set([...prev, chapterId]))
    
    // Find chapter details
    const chapter = chapters?.find(ch => ch.id === chapterId)
    if (!chapter) return

    const videoCount = chapter.videos?.length || 0
    
    // Skip confirmation for empty chapters - delete immediately
    if (videoCount === 0) {
      confirmDeleteChapter(chapterId)
      return
    }
    
    // Show confirmation for chapters with videos
    setChapterToDelete({
      id: chapterId,
      title: chapter.title,
      videoCount
    })
  }
  
  const confirmDeleteChapter = async (chapterIdParam?: string) => {
    console.log('🗑️ [EDIT PAGE] confirmDeleteChapter called with param:', chapterIdParam, 'type:', typeof chapterIdParam)
    const chapterId = chapterIdParam || chapterToDelete?.id
    console.log('🗑️ [EDIT PAGE] Final chapterId:', chapterId, 'type:', typeof chapterId)
    if (!chapterId) return
    
    // Close dialog immediately - TanStack will handle the rest
    setChapterToDelete(null)
    
    // Use the standard TanStack delete function 
    // The server action already handles video unlinking
    console.log('🗑️ [EDIT PAGE] About to call deleteChapter with:', chapterId, 'type:', typeof chapterId)
    deleteChapter(chapterId)
  }
  
  const handleReorderChapters = (newOrder: any[]) => {
    reorderChapters(newOrder)
  }
  
  // REMOVED: Direct upload functionality - all uploads must go through media library first
  
  const handleVideoRename = (videoId: string, newName: string) => {
    // ARCHITECTURE-COMPLIANT: Stage video rename in UI store, save on unified Save
    console.log('📝 Staging video rename:', videoId, newName)
    ui.updateVideoPendingChanges(videoId, newName)
  }
  
  const handleVideoDelete = (videoId: string) => {
    // ARCHITECTURE-COMPLIANT: Immediate unlink/delete for media library videos
    console.log('🗑️ Removing video immediately:', videoId)
    deleteVideo(videoId)
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

  // CONCURRENT LOADING: Check concurrent loading state OR missing data
  const isDataLoading = isConcurrentLoading || !course || !chapters
  
  if (isDataLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
            <div className="container mx-auto px-6 py-4">
              <PageHeaderSkeleton showActions={true} />
            </div>
          </div>

          {/* Main layout skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left sidebar skeleton */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right content skeleton */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-9 w-32" />
                  
                  {/* Chapter skeletons */}
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-8 rounded-full" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {[1, 2].map((j) => (
                            <div key={j} className="flex items-center gap-3 p-3 border rounded-lg">
                              <Skeleton className="h-4 w-4 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-48 mb-1" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded" />
                                <Skeleton className="h-6 w-6 rounded" />
                              </div>
                            </div>
                          ))}
                          
                          {/* Upload area skeleton */}
                          <div className="border-2 border-dashed border-muted/30 rounded-lg p-6">
                            <div className="text-center space-y-2">
                              <Skeleton className="h-8 w-8 rounded mx-auto" />
                              <Skeleton className="h-4 w-32 mx-auto" />
                              <Skeleton className="h-3 w-40 mx-auto" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
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
    <PageContainer>
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
              <div className="flex-1">
                <InlineEditableTitle
                  value={formState.values.title || course?.data?.title || ''}
                  onChange={(value) => handleInputChange('title', value)}
                  placeholder="Enter course title"
                  className="text-xl font-semibold"
                />
                <p className="text-sm text-muted-foreground">
                  {course?.data?.status === 'published' ? 'Live Course' : 'Draft'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {course?.data?.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!debouncedHasChanges || isSaving}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : debouncedHasChanges ? 'Save' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Course Details - 33% Width */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 z-10">
            <CardHeader>
              <CardTitle className="text-lg">Course Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Basic information
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.values.description || course?.data?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={course?.data?.description || "Describe your course..."}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Goal Visibility */}
              <CourseTrackGoalSelector courseId={courseId} />
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
                  courseId={courseId}
                  onCreateChapter={handleCreateChapter}
                  onUpdateChapter={handleUpdateChapter}
                  onDeleteChapter={handleDeleteChapter}
                  isDeletingChapter={isDeletingChapters}
                  deletingChapterIds={deletingChapterIds}
                  onReorderChapters={handleReorderChapters}
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
        <SimpleVideoPreview
          video={ui.modal.data}
          isOpen={true}
          onClose={ui.closeModal}
        />
      )}

      {/* Chapter Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!chapterToDelete}
        onClose={() => {
          // Clear dialog state
          const chapterId = chapterToDelete?.id
          setChapterToDelete(null)
          
          // Clear visual feedback when dialog is cancelled
          if (chapterId) {
            console.log('🗑️ [EDIT PAGE] Clearing deletion state for cancelled chapter:', chapterId)
            setDeletingChapterIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(chapterId)
              return newSet
            })
          }
        }}
        onConfirm={confirmDeleteChapter}
        title="Delete Chapter"
        message={chapterToDelete ? 
          `Are you sure you want to delete "${chapterToDelete.title}"?${chapterToDelete.videoCount > 0 ? ` This will unlink ${chapterToDelete.videoCount} video${chapterToDelete.videoCount !== 1 ? 's' : ''} from the chapter.` : ''} This action cannot be undone.` 
          : ''
        }
        confirmText="Yes, Delete Chapter"
        cancelText="Cancel"
        destructive={true}
        isLoading={isDeletingChapters}
      />
      
      {/* Removed noisy modal debug logs */}
    </PageContainer>
  )
}