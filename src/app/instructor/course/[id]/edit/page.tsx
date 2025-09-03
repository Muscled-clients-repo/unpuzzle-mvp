"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Plus,
  X,
  Edit2,
  Trash2,
  GripVertical,
  Video
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VideoPreviewModal } from "@/components/ui/video-preview-modal"

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  const {
    courses,
    courseCreation,
    setCourseInfo,
    createChapter,
    updateChapter,
    deleteChapter,
    addVideosToQueue,
    updateVideoName,
    removeVideo,
    moveVideoToChapter,
    saveDraft,
    isAutoSaving,
    loadCourses,
    loadCourseForEdit
  } = useAppStore()

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set())
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string; duration?: string } | null>(null)

  // Load course data on mount
  useEffect(() => {
    // Load the course data for editing
    loadCourseForEdit(courseId)
    
    // Also load instructor courses to get additional metadata if needed
    loadCourses()
  }, [courseId, loadCourseForEdit, loadCourses])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveDraft()
      setHasChanges(false)
      // Show success message - stay on edit page for continued editing
      console.log('Course saved successfully - staying on edit page')
    } catch (error) {
      console.error('Failed to save course:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!courseCreation?.id) {
      console.error('No course ID to delete')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${courseCreation.title}"? This action cannot be undone.`
    )
    
    if (!confirmDelete) return

    setIsSaving(true)
    try {
      // Use the real backend deletion
      const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_COURSE_DELETION === 'true'
      
      if (useRealBackend) {
        const { supabaseCourseService } = await import('@/services/supabase/course-service')
        console.log('[SUPABASE] Deleting course...', courseCreation.id)
        await supabaseCourseService.deleteCourse(courseCreation.id)
        console.log('[SUPABASE] Course deleted successfully')
      } else {
        console.log('[MOCK] Deleting course...', courseCreation.title)
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('[MOCK] Course deleted!')
      }
      
      // Redirect to courses list after successful deletion
      router.push('/instructor/courses')
      
    } catch (error: any) {
      console.error('[ERROR] Failed to delete course:', error)
      alert('Failed to delete course. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setCourseInfo({ [field]: value })
    setHasChanges(true)
  }

  const handleAddChapter = () => {
    const chapterNumber = (courseCreation?.chapters.length || 0) + 1
    createChapter(`Chapter ${chapterNumber}`)
    setHasChanges(true)
  }

  const handleUpdateChapter = (chapterId: string, field: string, value: string) => {
    updateChapter(chapterId, { [field]: value })
    setHasChanges(true)
  }

  const handleDeleteChapter = (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      deleteChapter(chapterId)
      setHasChanges(true)
    }
  }

  const handleVideoUpload = (chapterId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // Ensure the course has an ID set before uploading
      if (!courseCreation?.id && courseId) {
        setCourseInfo({ ...courseCreation, id: courseId })
      }
      
      addVideosToQueue(files)
      // Move uploaded videos to the specific chapter
      Array.from(files).forEach((file, index) => {
        const videoId = `video-${Date.now()}-${index}`
        setTimeout(() => {
          moveVideoToChapter(videoId, chapterId)
        }, 100) // Small delay to ensure video is added first
      })
      setHasChanges(true)
    }
  }

  const handleVideoTitleChange = (videoId: string, newTitle: string) => {
    updateVideoName(videoId, newTitle)
    setHasChanges(true)
  }

  const handleVideoDelete = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      setDeletingVideos(prev => new Set(prev).add(videoId))
      try {
        await removeVideo(videoId)
        setHasChanges(true)
      } finally {
        setDeletingVideos(prev => {
          const next = new Set(prev)
          next.delete(videoId)
          return next
        })
      }
    }
  }

  if (!courseCreation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Course</h1>
            <p className="text-sm text-muted-foreground">
              Update your course information and content
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Auto-saving...
            </div>
          )}
          
          {hasChanges && !isAutoSaving && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          
          {!hasChanges && !isAutoSaving && courseCreation.lastSaved && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Saved
            </Badge>
          )}
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Course
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Basic Info</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Videos</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                Update the basic information about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={courseCreation.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseCreation.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your course"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={courseCreation.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-development">Web Development</SelectItem>
                      <SelectItem value="data-science">Data Science</SelectItem>
                      <SelectItem value="machine-learning">Machine Learning</SelectItem>
                      <SelectItem value="mobile-development">Mobile Development</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={courseCreation.level}
                    onValueChange={(value) => handleInputChange('level', value)}
                  >
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={courseCreation.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chapters & Videos Tab */}
        <TabsContent value="chapters" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Chapters</CardTitle>
                  <CardDescription>
                    Organize your course content into chapters
                  </CardDescription>
                </div>
                <Button onClick={handleAddChapter} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Chapter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseCreation.chapters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chapters yet. Add your first chapter to get started.</p>
                  </div>
                ) : (
                  courseCreation.chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className="flex items-start gap-3 p-4 border rounded-lg"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={chapter.title}
                              onChange={(e) => handleUpdateChapter(chapter.id, 'title', e.target.value)}
                              placeholder={`Chapter ${index + 1} title`}
                              className="font-medium"
                            />
                            <Textarea
                              value={chapter.description || ''}
                              onChange={(e) => handleUpdateChapter(chapter.id, 'description', e.target.value)}
                              placeholder="Chapter description (optional)"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{chapter.videos.length} videos</span>
                            {chapter.duration && <span>{chapter.duration}</span>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="video/*"
                              multiple
                              onChange={(e) => handleVideoUpload(chapter.id, e)}
                              className="hidden"
                              id={`video-upload-${chapter.id}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`video-upload-${chapter.id}`)?.click()}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Videos
                            </Button>
                          </div>
                        </div>

                        {/* Videos in Chapter */}
                        <div className="space-y-2">
                          {chapter.videos.length === 0 ? (
                            <div className="text-center py-6 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                              <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No videos in this chapter yet.</p>
                              <p className="text-xs">Click "Add Videos" to upload content.</p>
                            </div>
                          ) : (
                            chapter.videos.map((video, videoIndex) => (
                              <div
                                key={video.id}
                                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                                
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {videoIndex + 1}.
                                    </span>
                                    <Input
                                      value={video.name}
                                      onChange={(e) => handleVideoTitleChange(video.id, e.target.value)}
                                      placeholder="Video title"
                                      className="text-sm"
                                    />
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {video.duration && <span>{video.duration}</span>}
                                    {video.status === 'uploading' && (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Uploading {video.progress}%</span>
                                        <Progress value={video.progress} className="h-1 flex-1 max-w-[100px]" />
                                      </div>
                                    )}
                                    {video.status === 'complete' && (
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Uploaded
                                      </Badge>
                                    )}
                                    {video.status === 'error' && (
                                      <Badge variant="outline" className="text-red-600 border-red-600">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Failed
                                      </Badge>
                                    )}
                                    {video.status === 'pending' && (
                                      <span className="text-muted-foreground">Waiting...</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-1">
                                  {/* Always show preview button if there's any URL */}
                                  {(video.url || video.cdn_url || video.videoUrl || video.video_url) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const videoUrl = video.url || video.cdn_url || video.videoUrl || video.video_url
                                        console.log('🎥 Preview video clicked:', { 
                                          video, 
                                          videoUrl,
                                          allProperties: Object.keys(video),
                                          allValues: video
                                        })
                                        setPreviewVideo({ 
                                          url: videoUrl!, 
                                          title: video.name || 'Untitled Video',
                                          duration: video.duration
                                        })
                                      }}
                                      className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      title="Preview video"
                                    >
                                      <Video className="h-3 w-3 mr-1" />
                                      Preview
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground px-2">No video URL</span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleVideoDelete(video.id)}
                                    disabled={deletingVideos.has(video.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    {deletingVideos.has(video.id) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                Configure course visibility and publishing options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Course Status</Label>
                <Select
                  value={courseCreation.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Auto-save</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes as you work
                  </p>
                </div>
                <Badge variant={courseCreation.autoSaveEnabled ? "default" : "outline"}>
                  {courseCreation.autoSaveEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              {courseCreation.lastSaved && (
                <div className="text-sm text-muted-foreground">
                  Last saved: {new Date(courseCreation.lastSaved).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          isOpen={!!previewVideo}
          onClose={() => setPreviewVideo(null)}
          videoUrl={previewVideo.url}
          videoTitle={previewVideo.title}
          videoDuration={previewVideo.duration}
        />
      )}
    </div>
  )
}