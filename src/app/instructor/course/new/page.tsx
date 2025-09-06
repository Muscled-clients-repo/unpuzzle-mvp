"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCourseMutations } from "@/hooks/use-course-mutations"
import { useVideoMutations } from "@/hooks/use-video-mutations"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Import our new reusable components
import { VideoUploader } from "@/components/course/VideoUploader"
import { ChapterManager } from "@/components/course/ChapterManager"
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"
import { useVideoPreview } from "@/hooks/useVideoPreview"

export default function CreateCoursePage() {
  const router = useRouter()
  
  // New architecture hooks
  const { createCourse, saveDraft, publishCourse } = useCourseMutations()
  const { uploadVideos, updateVideo, deleteVideo } = useVideoMutations()
  
  // UI state from new minimal store
  const wizard = useWizardState()
  const form = useFormState()
  const preferences = usePreferences()
  const uploadProgress = useUploadProgress()
  const modal = useModalState()
  
  // Local state for the creation flow
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  
  // Computed values from form state
  const courseCreation = form.courseData
  const currentStep = wizard.currentStep
  const uploadQueue = uploadProgress.queue

  // Use the video preview hook
  const { previewVideo, isPreviewOpen, openPreview, closePreview } = useVideoPreview()

  // Initialize wizard step on mount
  useEffect(() => {
    wizard.reset()
    wizard.setWizardStep('info')
    form.clearAllFormErrors()
  }, [wizard, form])

  // Handle initial course creation when user starts typing
  const initializeCourseIfNeeded = (field: any) => {
    if (!courseCreation) {
      form.setCourseData({
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        status: 'draft'
      })
    }
    return field
  }

  // Handle video upload for a specific chapter
  const handleVideoUpload = async (chapterId: string, files: FileList) => {
    // Initialize course if needed
    if (!courseCreation) {
      toast.error('Please fill in the course title and description first.')
      return
    }
    
    // Check if course has been saved
    if (!currentCourseId) {
      if (courseCreation.title && courseCreation.description) {
        try {
          // Auto-save before upload
          const result = await createCourse.mutateAsync(courseCreation)
          setCurrentCourseId(result.id)
          
          // Upload videos to the created course
          const fileArray = Array.from(files)
          await uploadVideos.mutateAsync({
            courseId: result.id,
            chapterId,
            files: fileArray
          })
        } catch (error) {
          console.error('Course creation or video upload failed:', error)
          toast.error('Failed to create course and upload videos')
        }
      } else {
        toast.error('Please fill in the course title and description, then save the course first.')
      }
    } else {
      try {
        const fileArray = Array.from(files)
        await uploadVideos.mutateAsync({
          courseId: currentCourseId,
          chapterId,
          files: fileArray
        })
      } catch (error) {
        console.error('Video upload failed:', error)
        toast.error('Failed to upload videos')
      }
    }
  }

  // Handle moving video between chapters
  const handleMoveVideo = async (videoId: string, fromChapterId: string, toChapterId: string) => {
    try {
      await updateVideo.mutateAsync({
        videoId,
        updates: { chapter_id: toChapterId }
      })
    } catch (error) {
      console.error('Move video failed:', error)
      toast.error('Failed to move video')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground">
            Add your course details and upload video content
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(isAutoSaving || createCourse.isPending || saveDraft.isPending) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={async () => {
              if (!courseCreation?.title || !courseCreation?.description) {
                toast.error('Please fill in title and description')
                return
              }
              
              try {
                if (currentCourseId) {
                  await saveDraft.mutateAsync({ 
                    courseId: currentCourseId, 
                    data: courseCreation 
                  })
                } else {
                  const result = await createCourse.mutateAsync(courseCreation)
                  setCurrentCourseId(result.id)
                }
                toast.success('Course saved as draft')
              } catch (error) {
                console.error('Save failed:', error)
                toast.error('Failed to save course')
              }
            }}
            disabled={!courseCreation?.title || !courseCreation?.description || createCourse.isPending || saveDraft.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button 
            onClick={async () => {
              if (!currentCourseId) {
                toast.error('Please save the course first')
                return
              }
              
              try {
                await publishCourse.mutateAsync(currentCourseId)
                toast.success('Course published successfully!')
                router.push('/instructor/courses')
              } catch (error) {
                console.error('Publish failed:', error)
                toast.error('Failed to publish course')
              }
            }}
            disabled={!courseCreation?.title || !currentCourseId || publishCourse.isPending}
          >
            {publishCourse.isPending ? 'Publishing...' : 'Publish Course'}
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => wizard.setWizardStep('info')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'info' ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <span className="font-medium">1. Course Info</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => currentCourseId && wizard.setWizardStep('content')}
          disabled={!currentCourseId}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'content' ? "bg-primary text-primary-foreground" : 
            !currentCourseId ? "bg-muted opacity-50 cursor-not-allowed" : "bg-muted"
          )}
        >
          <span className="font-medium">2. Content</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => currentCourseId && wizard.setWizardStep('review')}
          disabled={!currentCourseId}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'review' ? "bg-primary text-primary-foreground" : 
            !currentCourseId ? "bg-muted opacity-50 cursor-not-allowed" : "bg-muted"
          )}
        >
          <span className="font-medium">3. Review</span>
        </button>
      </div>

      {/* Step Content */}
      {currentStep === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Provide basic details about your course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., React Masterclass"
                  value={courseCreation?.title || ''}
                  onChange={(e) => {
                    initializeCourseIfNeeded(e.target.value)
                    form.setCourseData({ title: e.target.value })
                    form.setFormDirty()
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="97"
                  value={courseCreation?.price || 0}
                  onChange={(e) => {
                    initializeCourseIfNeeded(e.target.value)
                    form.setCourseData({ price: parseFloat(e.target.value) || 0 })
                    form.setFormDirty()
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn in this course?"
                value={courseCreation?.description || ''}
                onChange={(e) => {
                  initializeCourseIfNeeded(e.target.value)
                  form.setCourseData({ description: e.target.value })
                  form.setFormDirty()
                }}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={courseCreation?.category || undefined}
                  onValueChange={(value) => {
                    form.setCourseData({ category: value })
                    form.setFormDirty()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programming">Programming</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select 
                  value={courseCreation?.level || 'beginner'}
                  onValueChange={(value: any) => {
                    form.setCourseData({ level: value })
                    form.setFormDirty()
                  }}
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
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={async () => {
                  if (courseCreation?.title && courseCreation?.description && courseCreation?.price !== undefined) {
                    try {
                      let courseId = currentCourseId
                      if (!courseId) {
                        const result = await createCourse.mutateAsync(courseCreation)
                        courseId = result.id
                        setCurrentCourseId(courseId)
                      } else {
                        await saveDraft.mutateAsync({ 
                          courseId, 
                          data: courseCreation 
                        })
                      }
                      wizard.setWizardStep('content')
                    } catch (error) {
                      console.error('Save failed:', error)
                      toast.error('Failed to save course')
                    }
                  }
                }}
                disabled={!courseCreation?.title || !courseCreation?.description || courseCreation?.price === undefined || courseCreation?.price === null || createCourse.isPending || saveDraft.isPending}
              >
                {(createCourse.isPending || saveDraft.isPending) ? 'Saving...' : 'Next: Add Content'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'content' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Video Upload Area */}
          <div className="lg:col-span-1">
            <VideoUploader
              onFilesSelected={(files) => {
                // For now, we'll use a default chapter ID
                // TODO: Implement chapter management in new architecture
                const defaultChapterId = 'default-chapter'
                handleVideoUpload(defaultChapterId, files)
              }}
              uploadQueue={uploadQueue}
            />
          </div>

          {/* Right: Chapter Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <ChapterManager
                  chapters={[]} // TODO: Implement chapters in new architecture
                  onCreateChapter={(title) => {
                    console.log('Create chapter:', title)
                    // TODO: Implement chapter creation
                  }}
                  onUpdateChapter={(id, updates) => {
                    console.log('Update chapter:', id, updates)
                    // TODO: Implement chapter updates
                  }}
                  onDeleteChapter={(id) => {
                    console.log('Delete chapter:', id)
                    // TODO: Implement chapter deletion
                  }}
                  onReorderChapters={(chapters) => {
                    console.log('Reorder chapters:', chapters)
                    // TODO: Implement chapter reordering
                  }}
                  onVideoUpload={handleVideoUpload}
                  onVideoRename={async (id, name) => {
                    try {
                      await updateVideo.mutateAsync({
                        videoId: id,
                        updates: { title: name }
                      })
                    } catch (error) {
                      console.error('Video rename failed:', error)
                      toast.error('Failed to rename video')
                    }
                  }}
                  onVideoDelete={async (id) => {
                    try {
                      await deleteVideo.mutateAsync(id)
                    } catch (error) {
                      console.error('Video delete failed:', error)
                      toast.error('Failed to delete video')
                    }
                  }}
                  onVideoPreview={openPreview}
                  onMoveVideo={handleMoveVideo}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentStep === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Publish</CardTitle>
            <CardDescription>
              Review your course before publishing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Course Title</p>
                  <p className="text-sm text-muted-foreground">{courseCreation?.title || 'Not set'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => wizard.setWizardStep('info')}>
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Total Videos</p>
                  <p className="text-sm text-muted-foreground">
                    {0} videos across {0} chapters
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => wizard.setWizardStep('content')}>
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Price</p>
                  <p className="text-sm text-muted-foreground">
                    ${courseCreation?.price || 0}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => wizard.setWizardStep('info')}>
                  Edit
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (!currentCourseId) {
                    toast.error('Course not found')
                    return
                  }
                  try {
                    await saveDraft.mutateAsync({ 
                      courseId: currentCourseId, 
                      data: courseCreation 
                    })
                    toast.success('Course saved as draft')
                  } catch (error) {
                    console.error('Save failed:', error)
                    toast.error('Failed to save course')
                  }
                }}
                disabled={!currentCourseId || saveDraft.isPending}
              >
                {saveDraft.isPending ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button 
                onClick={async () => {
                  if (!currentCourseId) {
                    toast.error('Course not found')
                    return
                  }
                  try {
                    await publishCourse.mutateAsync(currentCourseId)
                    toast.success('Course published successfully!')
                    router.push('/instructor/courses')
                  } catch (error) {
                    console.error('Publish failed:', error)
                    toast.error('Failed to publish course')
                  }
                }}
                disabled={!currentCourseId || publishCourse.isPending}
              >
                {publishCourse.isPending ? 'Publishing...' : 'Publish Course'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Preview Modal */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={isPreviewOpen}
        onClose={closePreview}
      />
    </div>
  )
}