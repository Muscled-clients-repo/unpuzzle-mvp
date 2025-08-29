"use client"

import { useState, useEffect, useRef } from "react"
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
  Loader2,
  Plus,
  X,
  Trash2,
  GripVertical,
  Video,
  Upload,
  FileVideo,
  RefreshCcw,
  Clock,
  FolderOpen,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaLibraryModal } from "./components/MediaLibraryModal"
import { MediaFile } from "@/services/video-upload-service"

// Define types for video data that can come from different sources
interface VideoData {
  id?: string
  title?: string
  name?: string
  originalFilename?: string
  filename?: string
  mediaFile?: {
    id: string
    title?: string
    originalFilename?: string
    duration?: string
    durationFormatted?: string
  }
  durationFormatted?: string
  duration?: string
  mediaFileId?: string
}

// Define types for unassigned media
interface UnassignedMedia {
  id: string
  filename?: string
  original_filename?: string
  title?: string
  file_size?: number
  duration?: string
  processing_status?: string
}

// Define types for chapter data
interface ChapterUpdate {
  title?: string
  description?: string
  order?: number
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  const {
    courseCreation,
    setCourseInfo,
    createChapter,
    updateChapter,
    deleteChapter,
    saveDraft,
    isAutoSaving,
    saveError,
    loadCourseForEdit,
    getEditModeStatus,
    initiateVideoUpload,
    uploadQueue,
    retryFailedUpload,
    removeVideo,
    moveVideoToChapter,
    reorderVideosInChapter,
    assignMediaToSection,
    unassignMediaFromSection,
    completeVideoUpload,
    openMediaLibrary,
    closeMediaLibrary,
    mediaLibrary,
    loadChapterMedia,
    chapterMediaState
  } = useAppStore()

  const [activeTab, setActiveTab] = useState("info")
  const [initialLoad, setInitialLoad] = useState(true)
  const [isCreatingChapter, setIsCreatingChapter] = useState(false)
  const [updatingChapterId, setUpdatingChapterId] = useState<string | null>(null)
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null)
  const [editedChapters, setEditedChapters] = useState<Record<string, ChapterUpdate>>({})
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({})
  const [assigningMediaId, setAssigningMediaId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  
  // Video upload refs and handlers
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      initiateVideoUpload(files)
    }
    // Clear input to allow same file selection again
    if (event.target) {
      event.target.value = ''
    }
  }
  
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      initiateVideoUpload(files)
    }
  }
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Handle completed upload - auto-assign to selected chapter
  const handleUploadComplete = async (videoId: string, mediaFile: MediaFile) => {
    // Complete the upload first
    completeVideoUpload(videoId, mediaFile)
    
    // Auto-assign to selected or first chapter
    const targetChapterId = selectedChapterId || courseCreation?.chapters?.[0]?.id
    if (targetChapterId && mediaFile.id) {
      setAssigningMediaId(videoId)
      try {
        await assignMediaToSection(mediaFile.id, targetChapterId, {
          title: mediaFile.title || mediaFile.originalFilename,
          isPublished: true
        })
      } catch (error) {
        console.error('Failed to assign media to chapter:', error)
      } finally {
        setAssigningMediaId(null)
      }
    }
  }
  
  // Handle removing media from chapter
  const handleUnassignMedia = async (mediaId: string) => {
    if (confirm('Remove this video from the chapter?')) {
      try {
        await unassignMediaFromSection(mediaId)
      } catch (error) {
        console.error('Failed to unassign media:', error)
      }
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileVideo className="h-4 w-4 text-gray-500" />
    }
  }

  // Load course data on mount
  useEffect(() => {
    const loadData = async () => {
      if (courseId && initialLoad) {
        // Just load the specific course for editing
        await loadCourseForEdit(courseId)
        setInitialLoad(false)
      }
    }
    
    loadData()
  }, [courseId, initialLoad, loadCourseForEdit])

  // Check if we're in edit mode
  const isEditMode = getEditModeStatus()

  const handleSave = async () => {
    // saveDraft now handles both create and edit automatically
    await saveDraft()
    
    // Stay on the edit page after saving
    // The success indicator in the header will show the save status
  }

  const handleInputChange = (field: string, value: string | number) => {
    // Use existing setCourseInfo - it already handles change tracking
    setCourseInfo({ [field]: value })
  }

  const handleAddChapter = async () => {
    setIsCreatingChapter(true)
    try {
      const chapterNumber = (courseCreation?.chapters?.length || 0) + 1
      await createChapter(`Chapter ${chapterNumber}`)
    } finally {
      setIsCreatingChapter(false)
    }
  }

  const handleChapterChange = (chapterId: string, field: string, value: string) => {
    // Track changes locally without API call
    setEditedChapters(prev => ({
      ...prev,
      [chapterId]: {
        ...prev[chapterId],
        [field]: value
      }
    }))
    setHasChanges(prev => ({
      ...prev,
      [chapterId]: true
    }))
  }

  const handleChapterBlur = async (chapterId: string) => {
    // Only save if there are changes
    if (!hasChanges[chapterId] || !editedChapters[chapterId]) return
    
    setUpdatingChapterId(chapterId)
    try {
      await updateChapter(chapterId, editedChapters[chapterId])
      // Clear the changes after successful save
      setEditedChapters(prev => {
        const newState = { ...prev }
        delete newState[chapterId]
        return newState
      })
      setHasChanges(prev => {
        const newState = { ...prev }
        delete newState[chapterId]
        return newState
      })
    } finally {
      setUpdatingChapterId(null)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      setDeletingChapterId(chapterId)
      try {
        await deleteChapter(chapterId)
      } finally {
        setDeletingChapterId(null)
      }
    }
  }
  
  const handleToggleChapter = async (chapterId: string) => {
    console.log('🔄 Toggling chapter:', chapterId)
    const newExpanded = new Set(expandedChapters)
    
    if (expandedChapters.has(chapterId)) {
      // Collapse chapter
      console.log('📦 Collapsing chapter:', chapterId)
      newExpanded.delete(chapterId)
    } else {
      // Expand chapter and lazy load media if not loaded
      console.log('📂 Expanding chapter:', chapterId)
      newExpanded.add(chapterId)
      
      // Trigger lazy load if not loaded yet
      if (!chapterMediaState?.[chapterId]?.loaded && !chapterMediaState?.[chapterId]?.loading) {
        console.log('🎬 Loading media for chapter:', chapterId)
        await loadChapterMedia(courseId, chapterId)
      } else {
        console.log('✅ Media already loaded for chapter:', chapterId)
      }
    }
    
    setExpandedChapters(newExpanded)
    console.log('📊 Expanded chapters:', Array.from(newExpanded))
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
      {/* Header with edit mode indicator */}
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
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Course' : 'Create Course'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {courseCreation.title || 'Untitled Course'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isEditMode ? 'Updating...' : 'Saving...'}
            </div>
          )}
          
          {saveError && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </Badge>
          )}
          
          {!isAutoSaving && !saveError && courseCreation.lastSaved && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Saved
            </Badge>
          )}
          
          <Button
            onClick={handleSave}
            disabled={isAutoSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? 'Update Course' : 'Save Draft'}
          </Button>
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
                {isEditMode ? 'Update your course information' : 'Enter your course information'}
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
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="web-development">Web Development</SelectItem>
                      <SelectItem value="data-science">Data Science</SelectItem>
                      <SelectItem value="machine-learning">Machine Learning</SelectItem>
                      <SelectItem value="mobile-development">Mobile Development</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="health">Health & Fitness</SelectItem>
                      <SelectItem value="personal-development">Personal Development</SelectItem>
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
                <Button 
                  onClick={handleAddChapter} 
                  size="sm"
                  disabled={isCreatingChapter}
                >
                  {isCreatingChapter ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Chapter
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!courseCreation.chapters || courseCreation.chapters.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chapters yet. Add your first chapter to get started.</p>
                  </div>
                ) : (
                  courseCreation.chapters.map((chapter, index) => {
                    // Skip if chapter is null or undefined
                    if (!chapter) return null;
                    
                    const isExpanded = expandedChapters.has(chapter.id)
                    const isLoading = chapterMediaState?.[chapter.id]?.loading
                    const hasError = chapterMediaState?.[chapter.id]?.error
                    
                    return (
                    <div
                      key={chapter.id || `chapter-${index}`}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Chapter Header */}
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                          
                          {/* Expand/Collapse Button - More prominent */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleChapter(chapter.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {isExpanded ? 'Hide' : 'Show'} Videos
                            </span>
                            {!isExpanded && chapter.videos && chapter.videos.length > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {chapter.videos.length}
                              </Badge>
                            )}
                          </Button>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="relative">
                              {updatingChapterId === chapter.id && (
                                <div className="absolute -left-8 top-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                </div>
                              )}
                              {hasChanges[chapter.id] && updatingChapterId !== chapter.id && (
                                <div className="absolute -left-8 top-2">
                                  <div className="h-2 w-2 rounded-full bg-yellow-500" title="Unsaved changes" />
                                </div>
                              )}
                            <Input
                              value={editedChapters[chapter.id]?.title ?? chapter?.title ?? ''}
                              onChange={(e) => handleChapterChange(chapter.id, 'title', e.target.value)}
                              onBlur={() => handleChapterBlur(chapter.id)}
                              placeholder={`Chapter ${index + 1} title`}
                              className={cn(
                                "font-medium",
                                hasChanges[chapter.id] && "border-blue-500"
                              )}
                            />
                            </div>
                            <Textarea
                              value={editedChapters[chapter.id]?.description ?? chapter?.description ?? ''}
                              onChange={(e) => handleChapterChange(chapter.id, 'description', e.target.value)}
                              onBlur={() => handleChapterBlur(chapter.id)}
                              placeholder="Chapter description (optional)"
                              rows={2}
                              className={cn(
                                "text-sm",
                                hasChanges[chapter.id] && "border-blue-500"
                              )}
                            />
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={deletingChapterId === chapter.id}
                          >
                            {deletingChapterId === chapter.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{chapter.videos?.length || 0} videos</span>
                            {chapter.duration && <span>{chapter.duration}</span>}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMediaLibrary(chapter.id)}
                            className="flex items-center gap-2"
                          >
                            <FolderOpen className="h-3 w-3" />
                            Add Media
                          </Button>
                        </div>
                      </div>
                      </div>
                      
                      {/* Collapsible section for videos */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t">
                          {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mr-2" />
                              <span className="text-sm text-gray-500">Loading videos...</span>
                            </div>
                          ) : hasError ? (
                            <div className="flex items-center justify-center py-4 text-red-500">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              <span className="text-sm">Failed to load videos</span>
                            </div>
                          ) : (
                            <>
                        {/* Display videos in this chapter */}
                        {chapter.videos && chapter.videos.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Videos in this chapter:</h5>
                            <div className="space-y-2">
                              {chapter.videos?.map((video: VideoData, videoIndex: number) => {
                                // Skip if video is null or undefined
                                if (!video) return null;
                                
                                // Log video structure for debugging
                                console.log('Video data:', video);
                                
                                // Extract video details based on possible data structures
                                const videoTitle = video?.title || 
                                                 video?.name || 
                                                 video?.originalFilename || 
                                                 video?.filename ||
                                                 video?.mediaFile?.title ||
                                                 video?.mediaFile?.originalFilename ||
                                                 'Untitled Video';
                                
                                const videoDuration = video?.durationFormatted || 
                                                     video?.duration ||
                                                     video?.mediaFile?.durationFormatted ||
                                                     video?.mediaFile?.duration;
                                
                                const videoId = video?.id || 
                                              video?.mediaFileId || 
                                              video?.mediaFile?.id;
                                
                                return (
                                  <div key={videoId || `video-${videoIndex}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-500">{videoIndex + 1}.</span>
                                      <FileVideo className="h-4 w-4 text-blue-500" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{videoTitle}</span>
                                        {videoDuration && (
                                          <span className="text-xs text-gray-500">Duration: {videoDuration}</span>
                                        )}
                                      </div>
                                    </div>
                                    {videoId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnassignMedia(videoId)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                            </>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Video Upload Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Videos
                  </CardTitle>
                  <CardDescription>
                    Drag and drop video files or click to browse. Supported formats: MP4, WebM, AVI, MOV (max 500MB each)
                  </CardDescription>
                </div>
                {courseCreation?.chapters && courseCreation.chapters.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="chapter-select" className="text-sm">Auto-assign to:</Label>
                      <Select
                        value={selectedChapterId || courseCreation.chapters?.[0]?.id}
                        onValueChange={setSelectedChapterId}
                      >
                        <SelectTrigger id="chapter-select" className="w-[200px]">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courseCreation.chapters?.map((chapter) => (
                          <SelectItem key={chapter.id} value={chapter.id}>
                            {chapter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => openMediaLibrary(selectedChapterId || courseCreation.chapters?.[0]?.id)}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Add from Library
                  </Button>
                </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Drop video files here</p>
                <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Select Videos
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              {/* Upload Queue */}
              {uploadQueue && uploadQueue.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Upload Queue ({uploadQueue.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        uploadQueue
                          ?.filter(v => v.status === 'error')
                          ?.forEach(v => retryFailedUpload(v.id))
                      }}
                      disabled={!uploadQueue?.some(v => v.status === 'error')}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Retry Failed
                    </Button>
                  </div>
                  
                  {uploadQueue?.map((video) => (
                    <div key={video.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(video.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(video.size)}
                              {video.duration && ` • ${video.duration}`}
                            </p>
                            {video.uploadError && (
                              <p className="text-sm text-red-600 mt-1">
                                Error: {video.uploadError}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {video.status === 'error' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryFailedUpload(video.id)}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeVideo(video.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {(video.status === 'uploading' || video.status === 'processing') && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize">{video.status}...</span>
                            <span>{video.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                video.status === 'uploading' 
                                  ? "bg-blue-500" 
                                  : "bg-purple-500"
                              )}
                              style={{ width: `${video.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Success State */}
                      {video.status === 'complete' && (
                        <div className="mt-3 p-2 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700">
                            ✅ Upload complete! 
                            {assigningMediaId === video.id && ' Assigning to chapter...'}
                            {!assigningMediaId && ' Video is ready to use.'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Unassigned Media Section */}
          {courseCreation?.unassignedMedia && courseCreation.unassignedMedia.filter(Boolean).length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileVideo className="h-5 w-5" />
                      Unassigned Media
                    </CardTitle>
                    <CardDescription>
                      These videos are uploaded but not assigned to any chapter. Drag them to a chapter or use the assign button.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{courseCreation.unassignedMedia.filter(Boolean).length} videos</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {courseCreation.unassignedMedia.filter(Boolean).map((media: UnassignedMedia, index: number) => {
                    // Skip if media is null or undefined
                    if (!media) {
                      console.warn(`Unassigned media at index ${index} is null/undefined`)
                      return null
                    }
                    
                    return (
                    <div
                      key={media.id || `unassigned-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileVideo className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">
                            {media?.filename || media?.original_filename || media?.title || `Video ${index + 1}`}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {media?.file_size && <span>{formatFileSize(media.file_size)}</span>}
                            {media?.duration && <span>{media.duration}</span>}
                            {media?.processing_status && (
                              <Badge variant="outline" className="text-xs">
                                {media.processing_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {courseCreation?.chapters && courseCreation.chapters.length > 0 && (
                          <Select
                            onValueChange={(chapterId) => {
                              assignMediaToSection(media.id, chapterId, {
                                title: media.filename || media.original_filename || media.title,
                                isPublished: true
                              })
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assign to chapter..." />
                            </SelectTrigger>
                            <SelectContent>
                              {courseCreation.chapters.map((chapter) => (
                                <SelectItem key={chapter.id} value={chapter.id}>
                                  {chapter.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVideo(media.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Show a message when no unassigned media exists
            courseCreation?.chapters && courseCreation.chapters.some(ch => ch.videos && ch.videos.length > 0) && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center text-green-700">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">All media files are assigned!</p>
                    <p className="text-sm text-green-600">Your videos have been assigned to chapters.</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
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
      
      {/* Media Library Modal */}
      <MediaLibraryModal />
    </div>
  )
}