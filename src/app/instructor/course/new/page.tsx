"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Upload,
  Plus,
  GripVertical,
  X,
  Save,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileVideo,
  ChevronDown,
  Edit2,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function CreateCoursePage() {
  const router = useRouter()
  const {
    courseCreation,
    currentStep,
    uploadQueue,
    isAutoSaving,
    saveError,
    setCourseInfo,
    addVideosToQueue,
    updateVideoName,
    removeVideo,
    updateChapter,
    deleteChapter,
    moveVideoToChapter,
    reorderVideosInChapter,
    reorderChapters,
    saveDraft,
    publishCourse,
    setCurrentStep,
    toggleAutoSave,
    clearSaveError,
    retryAutoSave
  } = useAppStore()

  const [draggedVideo, setDraggedVideo] = useState<string | null>(null)
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null)
  const [dragOverChapter, setDragOverChapter] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [editingVideo, setEditingVideo] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Auto-expand first chapter when it has videos
  useEffect(() => {
    const firstChapter = courseCreation?.chapters?.[0]
    if (firstChapter?.id && firstChapter.videos.length > 0) {
      setExpandedChapters(prev => {
        const next = new Set(prev)
        next.add(firstChapter.id)
        return next
      })
    }
  }, [courseCreation?.chapters])

  // Initialize course if not exists
  useEffect(() => {
    if (!courseCreation) {
      // Create initial chapter locally without API call
      const initialChapter = {
        id: `temp-chapter-${Date.now()}`,
        title: 'Chapter 1',
        description: '',
        order: 1,
        videos: []
      }
      
      setCourseInfo({
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        chapters: [initialChapter],
        videos: [],
        status: 'draft',
        autoSaveEnabled: false
      })
    }
  }, [courseCreation, setCourseInfo])

  // Create local chapter (before course is saved)
  const createLocalChapter = useCallback((title: string) => {
    if (!courseCreation) return
    
    const newChapter = {
      id: `temp-chapter-${Date.now()}`,
      title,
      description: '',
      order: courseCreation.chapters.length + 1,
      videos: []
    }
    
    setCourseInfo({
      ...courseCreation,
      chapters: [...courseCreation.chapters, newChapter]
    })
  }, [courseCreation, setCourseInfo])

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      addVideosToQueue(files)
    }
  }, [addVideosToQueue])

  // Handle file input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addVideosToQueue(files)
    }
  }

  // Toggle chapter expansion
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  // Handle video drag start
  const handleVideoDragStart = (videoId: string) => {
    setDraggedVideo(videoId)
  }

  // Handle video drop on chapter
  const handleVideoDropOnChapter = (chapterId: string) => {
    if (draggedVideo) {
      moveVideoToChapter(draggedVideo, chapterId)
      setDraggedVideo(null)
    }
  }

  // Handle chapter reordering
  const handleChapterDragStart = (chapterId: string) => {
    setDraggedChapter(chapterId)
  }

  const handleChapterDrop = (targetChapterId: string) => {
    if (draggedChapter && draggedChapter !== targetChapterId && courseCreation) {
      const chapters = [...courseCreation.chapters]
      const draggedIndex = chapters.findIndex(c => c.id === draggedChapter)
      const targetIndex = chapters.findIndex(c => c.id === targetChapterId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = chapters.splice(draggedIndex, 1)
        chapters.splice(targetIndex, 0, removed)
        reorderChapters(chapters)
      }
    }
    setDraggedChapter(null)
  }

  // Unassigned videos (not in any chapter)
  const unassignedVideos = courseCreation?.videos.filter(v => !v.chapterId) || []

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Success Message */}
      {saveMessage && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 border border-green-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <p>{saveMessage}</p>
          </div>
          <button 
            onClick={() => setSaveMessage(null)}
            className="text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Failed to save course</p>
          </div>
          <p className="text-sm mb-3">{saveError}</p>
          <div className="flex gap-3">
            <button 
              onClick={retryAutoSave}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
              disabled={isAutoSaving}
            >
              {isAutoSaving ? 'Retrying...' : 'Retry'}
            </button>
            <button 
              onClick={clearSaveError}
              className="text-sm border border-red-300 px-3 py-1 rounded hover:bg-red-100"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs mt-2 text-red-600">
            Auto-save is paused until this error is resolved. Make changes to retry automatically.
          </p>
        </div>
      )}
      
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
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </div>
          )}
          {courseCreation?.lastSaved && !isAutoSaving && !saveError && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved {new Date(courseCreation.lastSaved).toLocaleTimeString()}
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={async () => {
              // Clear any existing error before manual save
              clearSaveError()
              await saveDraft()
              
              // Check if save was successful (no error after attempting)
              const currentState = useAppStore.getState()
              if (!currentState.saveError) {
                setSaveMessage('Course draft saved successfully!')
                setTimeout(() => setSaveMessage(null), 3000)
              }
            }}
            disabled={isAutoSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={courseCreation?.autoSaveEnabled || false}
                onChange={toggleAutoSave}
                className="rounded"
              />
              Auto-save
            </label>
          </div>
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
          onClick={() => setCurrentStep('content')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'content' ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <span className="font-medium">2. Content</span>
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setCurrentStep('review')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            currentStep === 'review' ? "bg-primary text-primary-foreground" : "bg-muted"
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
                  onChange={(e) => setCourseInfo({ title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="97"
                  value={courseCreation?.price || 0}
                  onChange={(e) => setCourseInfo({ price: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn in this course?"
                value={courseCreation?.description || ''}
                onChange={(e) => setCourseInfo({ description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={courseCreation?.category || ''}
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
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setCourseInfo({ level: value })}
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
              <Button onClick={() => setCurrentStep('content')}>
                Next: Add Content
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'content' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Video Upload & Unassigned Videos */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    Drag & drop video files here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => document.getElementById('video-upload')?.click()}
                  >
                    Select Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Uploading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uploadQueue.map((video) => (
                    <div key={video.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{video.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {video.progress}%
                        </span>
                      </div>
                      <Progress value={video.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right: Chapter Organization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Course Structure</CardTitle>
                    <CardDescription>
                      Organize your videos into chapters
                    </CardDescription>
                  </div>
                  <Button onClick={() => createLocalChapter(`Chapter ${(courseCreation?.chapters.length || 0) + 1}`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chapter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    {courseCreation?.chapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        draggable
                        onDragStart={() => handleChapterDragStart(chapter.id)}
                        onDrop={() => handleChapterDrop(chapter.id)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOverChapter(chapter.id)
                        }}
                        onDragLeave={() => setDragOverChapter(null)}
                        className={cn(
                          "border rounded-lg transition-colors",
                          dragOverChapter === chapter.id && "border-primary bg-primary/5"
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="flex items-center gap-2"
                              >
                                {expandedChapters.has(chapter.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {editingChapter === chapter.id ? (
                                  <Input
                                    value={chapterTitle}
                                    onChange={(e) => setChapterTitle(e.target.value)}
                                    onBlur={() => {
                                      updateChapter(chapter.id, { title: chapterTitle })
                                      setEditingChapter(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateChapter(chapter.id, { title: chapterTitle })
                                        setEditingChapter(null)
                                      }
                                    }}
                                    className="h-8 w-48"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <h3 className="font-medium">
                                    {index + 1}. {chapter.title}
                                  </h3>
                                )}
                              </button>
                              <Badge variant="secondary">
                                {chapter.videos.length} videos
                              </Badge>
                              {chapter.duration && (
                                <span className="text-sm text-muted-foreground">
                                  {chapter.duration}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingChapter(chapter.id)
                                  setChapterTitle(chapter.title)
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (chapter.videos.length > 0) {
                                    const remainingChapters = courseCreation?.chapters.filter(ch => ch.id !== chapter.id) || []
                                    const targetChapter = remainingChapters[0]?.title || 'New Chapter 1'
                                    if (confirm(`Delete "${chapter.title}"? ${chapter.videos.length} video(s) will be moved to "${targetChapter}".`)) {
                                      deleteChapter(chapter.id)
                                    }
                                  } else {
                                    deleteChapter(chapter.id)
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Chapter Videos */}
                          {expandedChapters.has(chapter.id) && (
                            <div
                              className="mt-4 space-y-2 min-h-[100px] p-3 bg-muted/50 rounded-lg"
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleVideoDropOnChapter(chapter.id)
                              }}
                              onDragOver={(e) => e.preventDefault()}
                            >
                              {chapter.videos.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Drag videos here to add them to this chapter
                                </p>
                              ) : (
                                chapter.videos.map((video, videoIndex) => (
                                  <div
                                    key={video.id}
                                    draggable
                                    onDragStart={() => handleVideoDragStart(video.id)}
                                    className="flex items-center gap-3 p-2 bg-background rounded cursor-move hover:bg-muted/50 group"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {videoIndex + 1}.
                                    </span>
                                    <FileVideo className="h-4 w-4" />
                                    <div className="flex-1">
                                      {editingVideo === video.id ? (
                                        <Input
                                          value={videoTitle}
                                          onChange={(e) => setVideoTitle(e.target.value)}
                                          onBlur={() => {
                                            updateVideoName(video.id, videoTitle)
                                            setEditingVideo(null)
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              updateVideoName(video.id, videoTitle)
                                              setEditingVideo(null)
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingVideo(null)
                                            }
                                          }}
                                          className="h-7 text-sm"
                                          autoFocus
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingVideo(video.id)
                                            setVideoTitle(video.name)
                                          }}
                                          className="cursor-text hover:bg-muted px-2 py-0.5 -mx-2 rounded"
                                        >
                                          <p className="text-sm">{video.name}</p>
                                          {video.duration && (
                                            <p className="text-xs text-muted-foreground">
                                              {video.duration}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingVideo(video.id)
                                          setVideoTitle(video.name)
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => removeVideo(video.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
    </div>
  )
}