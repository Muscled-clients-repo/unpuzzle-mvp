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
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

// New architecture imports
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseEdit } from '@/hooks/use-course-queries'
import { EnhancedChapterManager } from '@/components/course/EnhancedChapterManager'
import { VideoPreviewModal } from "@/components/course/VideoPreviewModal"

export default function EditCourseV3Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()
  
  // New architecture hooks
  const ui = useCourseCreationUI()
  const { course, isLoading, error, updateCourse, isUpdating } = useCourseEdit(courseId)
  
  // Track video save function from EnhancedChapterManager
  const videoSaveFunctionRef = React.useRef<(() => void) | null>(null)
  
  // Track if we have pending changes for save button (memoized to prevent infinite loops)
  const hasChanges = React.useMemo(() => {
    return ui.hasUnsavedChanges() || Object.keys(ui.formData).length > 0
  }, [ui.formData.title, ui.formData.description, ui.formData.price, ui.formData.difficulty, ui.uploads])
  
  // Initialize form data when course loads (only run once per course)
  const [initialized, setInitialized] = React.useState(false)
  
  React.useEffect(() => {
    if (course && !initialized) {
      ui.updateFormData('title', course.title || '')
      ui.updateFormData('description', course.description || '')
      ui.updateFormData('price', course.price || null)
      ui.updateFormData('difficulty', course.difficulty || 'beginner')
      setInitialized(true)
    }
  }, [course, initialized, ui])
  
  const handleSave = async () => {
    if (!course) return
    
    // First, save any pending video changes
    if (videoSaveFunctionRef.current) {
      console.log('🎬 Saving video changes first...')
      videoSaveFunctionRef.current()
    }
    
    // Get form data from UI store
    const formData = ui.formData
    
    // Update course with form data
    const updates: Partial<typeof course> = {}
    
    if (formData.title !== course.title) {
      updates.title = formData.title
    }
    if (formData.description !== (course.description || '')) {
      updates.description = formData.description
    }
    if (formData.price !== course.price) {
      updates.price = formData.price
    }
    if (formData.difficulty !== course.difficulty) {
      updates.difficulty = formData.difficulty
    }
    
    if (Object.keys(updates).length > 0) {
      updateCourse(updates)
      
      // Clear form data after successful update
      ui.clearForm()
    }
  }
  
  const handleInputChange = (field: string, value: any) => {
    ui.updateFormData(field as keyof typeof ui.formData, value)
  }

  if (isLoading && !course) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Loading skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 animate-pulse rounded" />
          <div className="h-32 bg-gray-200 animate-pulse rounded" />
          <div className="h-64 bg-gray-200 animate-pulse rounded" />
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/instructor/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {ui.formData.title || course.title}
            </h1>
            <p className="text-muted-foreground">
              Edit course content and settings
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant={course.status === 'published' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {course.status}
          </Badge>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="course-info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="course-info">Course Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Course Info Tab */}
        <TabsContent value="course-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={ui.formData.title || course.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={ui.formData.description || course.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your course"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={ui.formData.price ?? course.price ?? ''}
                    onChange={(e) => handleInputChange('price', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={ui.formData.difficulty || course.difficulty} 
                    onValueChange={(value) => handleInputChange('difficulty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
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

        {/* Content Tab - Enhanced Chapter Manager */}
        <TabsContent value="content" className="space-y-6">
          <EnhancedChapterManager 
            courseId={courseId}
            className="space-y-4"
            onVideoSaveFunctionReady={(saveFunction) => {
              videoSaveFunctionRef.current = saveFunction
            }}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant={course.status === 'published' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {course.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {course.status === 'published' 
                      ? 'Course is live and visible to students' 
                      : 'Course is in draft mode'
                    }
                  </span>
                </div>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  {course.status === 'published' ? 'Unpublish Course' : 'Publish Course'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal */}
      {ui.modal.type === 'video-preview' && ui.modal.data && (
        <VideoPreviewModal
          video={ui.modal.data}
          isOpen={true}
          onClose={ui.closeModal}
        />
      )}
    </div>
  )
}