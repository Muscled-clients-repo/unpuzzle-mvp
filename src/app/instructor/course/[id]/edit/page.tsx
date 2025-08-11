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
  Loader2,
  Plus,
  X,
  Edit2,
  Trash2,
  GripVertical,
  Video
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    saveDraft,
    isAutoSaving,
    loadCourses,
    loadCourseForEdit
  } = useAppStore()

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("info")

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
      // Show success message
      setTimeout(() => {
        router.push('/instructor')
      }, 1000)
    } catch (error) {
      console.error('Failed to save course:', error)
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