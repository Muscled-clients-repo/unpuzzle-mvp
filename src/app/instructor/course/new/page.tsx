"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
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
  const {
    courseCreation,
    currentStep,
    uploadQueue,
    isAutoSaving,
    setCourseInfo,
    addVideosToQueue,
    updateVideoName,
    removeVideo,
    createChapter,
    updateChapter,
    deleteChapter,
    moveVideoToChapter,
    reorderVideosInChapter,
    reorderChapters,
    saveDraft,
    publishCourse,
    setCurrentStep,
    resetCourseCreation,
  } = useAppStore()

  // Use the video preview hook
  const { previewVideo, isPreviewOpen, openPreview, closePreview } = useVideoPreview()

  // Initialize course on mount - but don't save anything until user interacts
  useEffect(() => {
    resetCourseCreation()
  }, [resetCourseCreation])

  // Handle initial course creation when user starts typing
  const initializeCourseIfNeeded = (field: any) => {
    if (!courseCreation) {
      setCourseInfo({
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        chapters: [],
        videos: [],
        status: 'draft',
        autoSaveEnabled: false
      })
      // Create first chapter after a delay
      setTimeout(() => createChapter('Chapter 1'), 100)
    }
    return field
  }

  // Handle video upload for a specific chapter
  const handleVideoUpload = (chapterId: string, files: FileList) => {
    // Initialize course if needed
    if (!courseCreation) {
      alert('Please fill in the course title and description first.')
      return
    }
    
    // Check if course has been saved
    if (!courseCreation.id) {
      if (courseCreation.title && courseCreation.description) {
        // Auto-save before upload
        saveDraft().then(() => {
          addVideosToQueue(files)
          // Move videos to specific chapter after upload starts
          setTimeout(() => {
            Array.from(files).forEach((_, index) => {
              const videoId = uploadQueue[uploadQueue.length - files.length + index]?.id
              if (videoId) {
                moveVideoToChapter(videoId, chapterId)
              }
            })
          }, 100)
        })
      } else {
        alert('Please fill in the course title and description, then save the course first.')
      }
    } else {
      addVideosToQueue(files)
      // Move videos to specific chapter after upload starts
      setTimeout(() => {
        Array.from(files).forEach((_, index) => {
          const videoId = uploadQueue[uploadQueue.length - files.length + index]?.id
          if (videoId) {
            moveVideoToChapter(videoId, chapterId)
          }
        })
      }, 100)
    }
  }

  // Handle moving video between chapters
  const handleMoveVideo = (videoId: string, fromChapterId: string, toChapterId: string) => {
    moveVideoToChapter(videoId, toChapterId)
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
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={saveDraft}
            disabled={!courseCreation?.title || !courseCreation?.description}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button 
            onClick={publishCourse}
            disabled={!courseCreation?.title || (courseCreation?.videos.length || 0) === 0}
          >
            Publish Course
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setCurrentStep('info')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'info' ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <span className="font-medium">1. Course Info</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => courseCreation?.id && setCurrentStep('content')}
          disabled={!courseCreation?.id}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'content' ? "bg-primary text-primary-foreground" : 
            !courseCreation?.id ? "bg-muted opacity-50 cursor-not-allowed" : "bg-muted"
          )}
        >
          <span className="font-medium">2. Content</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => courseCreation?.id && (courseCreation?.videos?.length > 0) && setCurrentStep('review')}
          disabled={!courseCreation?.id || !courseCreation?.videos?.length}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'review' ? "bg-primary text-primary-foreground" : 
            (!courseCreation?.id || !courseCreation?.videos?.length) ? "bg-muted opacity-50 cursor-not-allowed" : "bg-muted"
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
                    setCourseInfo({ title: e.target.value })
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
                    setCourseInfo({ price: parseFloat(e.target.value) || 0 })
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
                  setCourseInfo({ description: e.target.value })
                }}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={courseCreation?.category || undefined}
                  onValueChange={(value) => setCourseInfo({ category: value })}
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
                  onValueChange={(value: any) => setCourseInfo({ level: value })}
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
                onClick={() => {
                  if (courseCreation?.title && courseCreation?.description && courseCreation?.price !== undefined) {
                    saveDraft().then(() => {
                      setCurrentStep('content')
                    })
                  }
                }}
                disabled={!courseCreation?.title || !courseCreation?.description || courseCreation?.price === undefined || courseCreation?.price === null}
              >
                Next: Add Content
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
                if (courseCreation?.chapters?.length) {
                  handleVideoUpload(courseCreation.chapters[0].id, files)
                } else {
                  createChapter('Chapter 1')
                  setTimeout(() => {
                    if (courseCreation?.chapters?.[0]) {
                      handleVideoUpload(courseCreation.chapters[0].id, files)
                    }
                  }, 100)
                }
              }}
              uploadQueue={uploadQueue}
            />
          </div>

          {/* Right: Chapter Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <ChapterManager
                  chapters={courseCreation?.chapters || []}
                  onCreateChapter={createChapter}
                  onUpdateChapter={updateChapter}
                  onDeleteChapter={deleteChapter}
                  onReorderChapters={reorderChapters}
                  onVideoUpload={handleVideoUpload}
                  onVideoRename={updateVideoName}
                  onVideoDelete={removeVideo}
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
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('info')}>
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Total Videos</p>
                  <p className="text-sm text-muted-foreground">
                    {courseCreation?.videos.length || 0} videos across {courseCreation?.chapters.length || 0} chapters
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('content')}>
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
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('info')}>
                  Edit
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={saveDraft}>
                Save as Draft
              </Button>
              <Button onClick={publishCourse}>
                Publish Course
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