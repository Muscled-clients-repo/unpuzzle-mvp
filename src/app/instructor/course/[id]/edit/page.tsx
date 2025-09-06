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
import { ChapterManager } from "@/components/course/ChapterManager"
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"
import { useVideoPreview } from "@/hooks/useVideoPreview"

// Import the normalized reorder hook (THE FIX!)
import { useNormalizedVideoReorder, useMigrateCourseToNormalized } from "@/hooks/useNormalizedVideoReorder"

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  const {
    user,
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
    reorderChapters,
    reorderVideosInChapter: oldReorderVideosInChapter, // Keep old function as backup
    saveDraft,
    publishCourse,
    loadCourseForEdit,
    uploadQueue,
    isAutoSaving,
    authLoading
  } = useAppStore()

  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState("course-info")
  
  // Use the video preview hook
  const { previewVideo, isPreviewOpen, openPreview, closePreview } = useVideoPreview()
  
  // Use the NORMALIZED video reorder hook (THE FIX!)
  const { reorderVideosInChapter, isUsingNormalized } = useNormalizedVideoReorder()
  const { migrateCourse } = useMigrateCourseToNormalized()

  // Load course for editing on mount - but only after user is loaded
  useEffect(() => {
    if (courseId && user?.id && !authLoading) {
      loadCourseForEdit(courseId)
    }
  }, [courseId, user?.id, authLoading, loadCourseForEdit])
  
  // Migrate course data to normalized state when it loads
  useEffect(() => {
    if (courseCreation && courseId) {
      migrateCourse(courseCreation)
    }
  }, [courseCreation, courseId, migrateCourse])

  // Get current course from courseCreation or courses list
  const currentCourse = courseCreation || courses?.find(c => c.id === courseId)

  // Handle video upload for a specific chapter
  const handleVideoUpload = (chapterId: string, files: FileList) => {
    if (!courseCreation?.id) {
      // Ensure course ID is set
      setCourseInfo({ ...courseCreation, id: courseId })
    }
    
    addVideosToQueue(files)
    setHasChanges(true)
    
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

  // Handle moving video between chapters
  const handleMoveVideo = (videoId: string, fromChapterId: string, toChapterId: string) => {
    moveVideoToChapter(videoId, toChapterId)
    setHasChanges(true)
  }

  // Handle save
  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await saveDraft()
      setSaveStatus('saved')
      setHasChanges(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('[COURSE EDIT] Save error:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setCourseInfo({ [field]: value })
    setHasChanges(true)
  }

  if (authLoading || !currentCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          {saveStatus === 'saving' && (
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
            disabled={!hasChanges || saveStatus === 'saving'}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
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
                    value={courseCreation?.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={courseCreation?.price || 0}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseCreation?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={courseCreation?.category || undefined}
                    onValueChange={(value) => handleInputChange('category', value)}
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
                    onCreateChapter={(title) => {
                      createChapter(title)
                      setHasChanges(true)
                    }}
                    onUpdateChapter={(id, updates) => {
                      updateChapter(id, updates)
                      setHasChanges(true)
                    }}
                    onDeleteChapter={(id) => {
                      deleteChapter(id)
                      setHasChanges(true)
                    }}
                    onReorderChapters={(chapters) => {
                      reorderChapters(chapters)
                      setHasChanges(true)
                    }}
                    onVideoUpload={handleVideoUpload}
                    onVideoRename={(id, name) => {
                      updateVideoName(id, name)
                      setHasChanges(true)
                    }}
                    onVideoDelete={(id) => {
                      removeVideo(id)
                      setHasChanges(true)
                    }}
                    onVideoPreview={openPreview}
                    onMoveVideo={handleMoveVideo}
                    onReorderVideosInChapter={(chapterId, videos) => {
                      reorderVideosInChapter(chapterId, videos)
                      setHasChanges(true)
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
                    Current status: {courseCreation?.status || 'draft'}
                  </p>
                </div>
                <div className="space-x-2">
                  {courseCreation?.status === 'draft' && (
                    <Button 
                      onClick={async () => {
                        await publishCourse()
                        router.push('/instructor/courses')
                      }}
                    >
                      Publish Course
                    </Button>
                  )}
                  {courseCreation?.status === 'published' && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCourseInfo({ status: 'draft' })
                        setHasChanges(true)
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
                    {courseCreation?.videos?.length || 0} videos across {courseCreation?.chapters?.length || 0} chapters
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {courseCreation?.createdAt ? new Date(courseCreation.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {courseCreation?.lastSaved ? new Date(courseCreation.lastSaved).toLocaleDateString() : 'Unknown'}
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