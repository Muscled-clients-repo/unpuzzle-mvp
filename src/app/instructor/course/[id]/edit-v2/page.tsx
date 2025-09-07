"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useCourse } from "@/hooks/use-course-queries"
import { useCourseMutations } from "@/hooks/use-course-mutations"
import { useVideoMutations } from "@/hooks/use-video-mutations"
import { useChapterMutations } from "@/hooks/use-chapter-mutations"
import { useChapters } from "@/hooks/use-course-queries"
import { 
  useWizardState, 
  useFormState, 
  usePreferences,
  useUploadProgress,
  useModalState
} from '@/stores/app-store-new'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

// Import our new reusable components  
import { VideoUploader } from "@/components/course/VideoUploader"
import { ChapterManagerPOC } from "@/components/course/ChapterManagerPOC" // POC version
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"
import { useVideoPreview } from "@/hooks/useVideoPreview"
import { useChapterMutationsPOC } from "@/hooks/use-chapter-mutations-poc" // POC chapter mutations

// Video preview hook (keeping existing functionality)
// import { useNormalizedVideoReorder, useMigrateCourseToNormalized } from "@/hooks/useNormalizedVideoReorder"

export default function EditCoursePage(props: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const params = use(props.params)
  const courseId = params.id
  
  // New architecture hooks
  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseId)
  const { data: chapters, isLoading: chaptersLoading } = useChapters(courseId)
  
  // Debug logging for performance investigation
  useEffect(() => {
    console.log('[EDIT PAGE] Performance Debug:', {
      courseId,
      courseLoading,
      chaptersLoading,
      hasError: !!courseError,
      hasCourse: !!course,
      timestamp: new Date().toISOString()
    })
  }, [courseId, courseLoading, chaptersLoading, courseError, course])
  const { updateCourse, saveDraft, publishCourse } = useCourseMutations()
  const { uploadVideo, updateVideo, deleteVideo, moveVideoToChapter, batchUpdateVideoOrders, batchUpdateVideoOrdersSilent, updateVideoProgressByFilename } = useVideoMutations(courseId)
  const { createChapter, updateChapter, deleteChapter, reorderChapters } = useChapterMutations()
  
  // POC: Add chapter mutations using proven pattern
  const { batchUpdateChaptersSilent } = useChapterMutationsPOC(courseId)
  
  // UI state from new minimal store
  const wizard = useWizardState()
  const form = useFormState()
  
  const preferences = usePreferences()
  const uploadProgress = useUploadProgress()
  const modal = useModalState()

  // Current course data from TanStack Query
  const currentCourse = course
  
  // Loading and error states
  const isLoading = courseLoading || chaptersLoading
  const error = courseError

  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState("course-info")
  
  // Video filename change state
  const [hasPendingVideoChanges, setHasPendingVideoChanges] = useState(false)
  const [pendingVideoChangeCount, setPendingVideoChangeCount] = useState(0)
  const [videoSaveFunction, setVideoSaveFunction] = useState<(() => void) | null>(null)
  
  // Chapter change state (POC)
  const [hasPendingChapterChanges, setHasPendingChapterChanges] = useState(false)
  const [pendingChapterChangeCount, setPendingChapterChangeCount] = useState(0)
  const [chapterSaveFunction, setChapterSaveFunction] = useState<(() => void) | null>(null)
  
  // Local form state for course data (since we're not persisting this)
  const [courseData, setCourseData] = useState<any>(null)
  
  // Use the video preview hook
  const { previewVideo, isPreviewOpen, openPreview, closePreview } = useVideoPreview()
  
  // Initialize form data when course loads
  useEffect(() => {
    if (currentCourse && !courseData) {
      setCourseData({
        title: currentCourse.title,
        description: currentCourse.description,
        price: currentCourse.price,
        // Map database 'difficulty' field to form 'level' field
        level: currentCourse.difficulty || 'beginner',
        status: currentCourse.status
        // Note: category field doesn't exist in database, so we don't include it
      })
    }
  }, [currentCourse, courseData])

  // Handle video upload for a specific chapter
  const handleVideoUpload = async (chapterId: string, files: FileList) => {
    console.log('🎥 Starting video upload:', { chapterId, fileCount: files.length, courseId })
    setHasChanges(true)
    const fileArray = Array.from(files)
    
    // Upload files one by one with progress tracking
    const uploadPromises = fileArray.map(async (file) => {
      try {
        console.log('📤 Uploading file:', file.name, 'to chapter:', chapterId)
        
        const result = await uploadVideo.mutateAsync({ 
          file, 
          chapterId,
          onProgress: (progress) => {
            // Update progress for this file by filename
            updateVideoProgressByFilename(file.name, progress)
          }
        })
        
        console.log('✅ Upload successful:', file.name, result)
        return result
      } catch (error) {
        console.error(`❌ Upload failed for ${file.name}:`, error)
        toast.error(`Failed to upload ${file.name}`)
        throw error
      }
    })
    
    try {
      const results = await Promise.all(uploadPromises)
      console.log('🎉 All uploads completed:', results)
      toast.success(`${fileArray.length} video(s) uploaded successfully`)
    } catch (error) {
      // Some uploads failed, but some might have succeeded
      console.error('❌ Some video uploads failed:', error)
    }
  }

  // Handle moving video between chapters
  const handleMoveVideo = async (videoId: string, fromChapterId: string, toChapterId: string) => {
    setHasChanges(true)
    try {
      await moveVideoToChapter.mutateAsync({ videoId, newChapterId: toChapterId, newOrder: 0 })
    } catch (error) {
      console.error('Move video failed:', error)
      toast.error('Failed to move video')
    }
  }

  // Handle save
  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      // Save video changes first if there are any
      if (hasPendingVideoChanges && videoSaveFunction) {
        console.log('[COURSE EDIT] Saving video filename changes...')
        await videoSaveFunction()
        setHasPendingVideoChanges(false)
        setPendingVideoChangeCount(0)
        setVideoSaveFunction(null)
      }
      
      // Save chapter changes if there are any (POC)
      if (hasPendingChapterChanges && chapterSaveFunction) {
        console.log('[COURSE EDIT] Saving chapter name changes...')
        await chapterSaveFunction()
        setHasPendingChapterChanges(false)
        setPendingChapterChangeCount(0)
        setChapterSaveFunction(null)
      }
      
      // Then save course changes if there are any
      if (hasChanges && courseData) {
        console.log('[COURSE EDIT] Saving course data changes...')
        await saveDraft.mutateAsync({
          courseId,
          data: courseData
        })
        setHasChanges(false)
        form.reset() // Use reset instead of clearFormDirty
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
      toast.success('Changes saved successfully')
    } catch (error) {
      console.error('[COURSE EDIT] Save error:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
      toast.error('Failed to save changes')
    }
  }

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setCourseData({ ...courseData, [field]: value })
    form.setFormDirty()
    setHasChanges(true)
  }

  // Show skeleton loading instead of full spinner for better UX
  if (isLoading && !course) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-72 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-10 w-32 bg-muted rounded animate-pulse" />)}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
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

  if (!currentCourse) {
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
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Course</h1>
            <p className="text-muted-foreground">
              Update your course information and content
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Save Status Indicator */}
          {(saveStatus === 'saving' || saveDraft.isPending) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </div>
          )}
          
          {/* Status Badge */}
          <Badge variant={
            currentCourse.status === 'published' ? 'default' : 
            currentCourse.status === 'draft' ? 'secondary' : 
            'outline'
          }>
            {currentCourse.status}
          </Badge>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={(!hasChanges && !form.isDirty && !hasPendingVideoChanges && !hasPendingChapterChanges) || saveStatus === 'saving' || saveDraft.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveDraft.isPending || saveStatus === 'saving' ? 'Saving...' : 
             hasPendingVideoChanges && hasPendingChapterChanges ? `Save ${pendingVideoChangeCount + pendingChapterChangeCount} changes` :
             hasPendingVideoChanges ? `Save ${pendingVideoChangeCount} filename change${pendingVideoChangeCount !== 1 ? 's' : ''}` :
             hasPendingChapterChanges ? `Save ${pendingChapterChangeCount} chapter change${pendingChapterChangeCount !== 1 ? 's' : ''}` :
             'Save Changes'}
          </Button>
        </div>
      </div>


      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="course-info">Course Info</TabsTrigger>
          <TabsTrigger value="chapters-videos">Chapters & Videos</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Course Info Tab */}
        <TabsContent value="course-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your course title, description, and other details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={courseData?.title || currentCourse?.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={courseData?.price || currentCourse?.price || 0}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseData?.description || currentCourse?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select 
                  value={courseData?.level || currentCourse?.difficulty || 'beginner'}
                  onValueChange={(value) => handleInputChange('level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chapters & Videos Tab */}
        <TabsContent value="chapters-videos" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Video Upload Area */}
            <div className="lg:col-span-1">
              <VideoUploader
                onFilesSelected={(files) => {
                  if (chapters && chapters.length > 0) {
                    handleVideoUpload(chapters[0].id, files)
                  } else {
                    // Create first chapter if none exist
                    // TODO: Implement createChapter mutation
                    console.log('Need to create first chapter')
                  }
                }}
                uploadQueue={uploadProgress.queue}
              />
            </div>

            {/* Right: Chapter Management */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <ChapterManagerPOC
                    chapters={chapters || []}
                    onCreateChapter={async (title) => {
                      try {
                        await createChapter.mutateAsync({ courseId, title })
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Create chapter failed:', error)
                      }
                    }}
                    onUpdateChapter={async (id, updates) => {
                      try {
                        await updateChapter.mutateAsync({ courseId, chapterId: id, updates })
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Update chapter failed:', error)
                      }
                    }}
                    onDeleteChapter={async (id) => {
                      try {
                        await deleteChapter.mutateAsync({ courseId, chapterId: id })
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Delete chapter failed:', error)
                      }
                    }}
                    onReorderChapters={async (chapters) => {
                      try {
                        await reorderChapters.mutateAsync({ courseId, chapters })
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Reorder chapters failed:', error)
                      }
                    }}
                    onVideoUpload={handleVideoUpload}
                    onVideoRename={async (id, name) => {
                      try {
                        await updateVideo.mutateAsync({
                          videoId: id,
                          updates: { title: name }
                        })
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Video rename failed:', error)
                        toast.error('Failed to rename video')
                      }
                    }}
                    batchRenameMutation={batchUpdateVideoOrdersSilent}
                    batchChapterUpdateMutation={batchUpdateChaptersSilent}
                    onVideoDelete={async (id) => {
                      try {
                        await deleteVideo.mutateAsync(id)
                        setHasChanges(true)
                      } catch (error) {
                        console.error('Video delete failed:', error)
                        toast.error('Failed to delete video')
                      }
                    }}
                    onVideoPreview={openPreview}
                    onMoveVideo={handleMoveVideo}
                    onReorderVideosInChapter={(chapterId, videos) => {
                      // TODO: Implement reorderVideosInChapter mutation
                      console.log('Reorder videos:', chapterId, videos)
                      setHasChanges(true)
                    }}
                    onPendingChangesUpdate={(hasChanges, count, saveFunction, isSaving) => {
                      // Handle video filename changes
                      if (hasChanges !== hasPendingVideoChanges) {
                        setHasPendingVideoChanges(hasChanges)
                        setPendingVideoChangeCount(count)
                        if (saveFunction) {
                          setVideoSaveFunction(() => saveFunction)
                        }
                        console.log('Video pending changes update:', { hasChanges, count, isSaving })
                      }
                    }}
                    onPendingChapterChangesUpdate={(hasChanges, count, saveFunction, isSaving) => {
                      // Handle chapter name changes (POC)
                      if (hasChanges !== hasPendingChapterChanges) {
                        setHasPendingChapterChanges(hasChanges)
                        setPendingChapterChangeCount(count)
                        if (saveFunction) {
                          setChapterSaveFunction(() => saveFunction)
                        }
                        console.log('Chapter pending changes update:', { hasChanges, count, isSaving })
                      }
                    }}
                    onTabNavigation={(currentId, currentType, direction) => {
                      // Handle Tab navigation between video titles only (skip broken chapter editing)
                      if (currentType === 'video') {
                        // Get all video IDs from all chapters in order
                        const allVideoIds: string[] = []
                        chapters.forEach(chapter => {
                          chapter.videos.forEach(video => {
                            allVideoIds.push(video.id)
                          })
                        })
                        
                        const currentIndex = allVideoIds.indexOf(currentId)
                        if (currentIndex === -1) return
                        
                        let nextIndex = currentIndex
                        if (direction === 'next') {
                          nextIndex = (currentIndex + 1) % allVideoIds.length
                        } else {
                          nextIndex = currentIndex === 0 ? allVideoIds.length - 1 : currentIndex - 1
                        }
                        
                        const nextVideoId = allVideoIds[nextIndex]
                        if (nextVideoId) {
                          // Find the element and trigger edit mode
                          const nextElement = document.querySelector(`[data-video-edit="${nextVideoId}"]`)
                          if (nextElement) {
                            (nextElement as HTMLElement).click()
                            // Set cursor to end for tab navigation
                            setTimeout(() => {
                              const input = document.querySelector('input:focus') as HTMLInputElement
                              if (input) {
                                const length = input.value.length
                                input.setSelectionRange(length, length)
                              }
                            }, 0)
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                Manage course visibility and publishing options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Course Status</p>
                  <p className="text-sm text-muted-foreground">
                    Current status: {currentCourse?.status || 'draft'}
                  </p>
                </div>
                <div className="space-x-2">
                  {currentCourse?.status === 'draft' && (
                    <Button 
                      onClick={async () => {
                        try {
                          await publishCourse.mutateAsync(courseId)
                          router.push('/instructor/courses')
                        } catch (error) {
                          console.error('Publish failed:', error)
                          toast.error('Failed to publish course')
                        }
                      }}
                    >
                      Publish Course
                    </Button>
                  )}
                  {currentCourse?.status === 'published' && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        handleInputChange('status', 'draft')
                      }}
                    >
                      Unpublish
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Total Videos</p>
                  <p className="text-sm text-muted-foreground">
                    {currentCourse?.videos?.length || 0} videos across {chapters?.length || 0} chapters
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {currentCourse?.created_at ? new Date(currentCourse.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {currentCourse?.updated_at ? new Date(currentCourse.updated_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={isPreviewOpen}
        onClose={closePreview}
      />
    </div>
  )
}