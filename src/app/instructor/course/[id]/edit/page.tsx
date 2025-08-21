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
  Edit2,
  Trash2,
  GripVertical,
  Video,
  Upload,
  FileVideo,
  RefreshCcw,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    removeVideo
  } = useAppStore()

  const [activeTab, setActiveTab] = useState("info")
  const [initialLoad, setInitialLoad] = useState(true)
  
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
  }, [courseId, initialLoad]) // Removed function dependencies to avoid the error

  // Check if we're in edit mode
  const isEditMode = getEditModeStatus()

  const handleSave = async () => {
    // saveDraft now handles both create and edit automatically
    await saveDraft()
    
    // Stay on the edit page after saving
    // The success indicator in the header will show the save status
  }

  const handleInputChange = (field: string, value: any) => {
    // Use existing setCourseInfo - it already handles change tracking
    setCourseInfo({ [field]: value })
  }

  const handleAddChapter = () => {
    const chapterNumber = (courseCreation?.chapters.length || 0) + 1
    createChapter(`Chapter ${chapterNumber}`)
  }

  const handleUpdateChapter = (chapterId: string, field: string, value: string) => {
    updateChapter(chapterId, { [field]: value })
  }

  const handleDeleteChapter = (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      deleteChapter(chapterId)
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
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{chapter.videos.length} videos</span>
                          {chapter.duration && <span>{chapter.duration}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Video Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Videos
              </CardTitle>
              <CardDescription>
                Drag and drop video files or click to browse. Supported formats: MP4, WebM, AVI, MOV (max 500MB each)
              </CardDescription>
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
              {uploadQueue.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Upload Queue ({uploadQueue.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        uploadQueue
                          .filter(v => v.status === 'error')
                          .forEach(v => retryFailedUpload(v.id))
                      }}
                      disabled={!uploadQueue.some(v => v.status === 'error')}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Retry Failed
                    </Button>
                  </div>
                  
                  {uploadQueue.map((video) => (
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
                            ✅ Upload complete! Video is ready to use.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
    </div>
  )
}