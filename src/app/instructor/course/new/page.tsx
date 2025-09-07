"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCourseCreation } from '@/hooks/use-course-queries'
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
import { ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"


export default function CreateCoursePage() {
  const router = useRouter()
  
  // New architecture hooks
  const { createCourse, createCourseAsync, isCreating, error } = useCourseCreation()
  
  // Simple React state for form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    difficulty: 'beginner' as const,
    category: ''
  })

  // Handle course creation and navigation to edit page
  const handleCreateAndEdit = () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description')
      return
    }

    // Use mutation with navigation in onSuccess to ensure cache is set first
    createCourse({
      title: formData.title,
      description: formData.description,
      price: formData.price || 0,
      difficulty: formData.difficulty
    }, {
      onSuccess: (result) => {
        if (result.success && result.data) {
          // Navigate AFTER cache is set by the mutation onSuccess
          router.push(`/instructor/course/${result.data.id}/edit-v3`)
        } else {
          toast.error(result.error || 'Failed to create course')
        }
      },
      onError: (error) => {
        console.error('Course creation failed:', error)
        toast.error('Failed to create course')
      }
    })
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
          {isCreating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating course...
            </div>
          )}
          <Button 
            onClick={handleCreateAndEdit}
            disabled={!formData.title || !formData.description || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create & Edit Course
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>


      {/* Course Information Form */}
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
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="97"
                  value={formData.price}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn in this course?"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category || undefined}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, category: value }))
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
                  value={formData.difficulty}
                  onValueChange={(value: any) => {
                    setFormData(prev => ({ ...prev, difficulty: value }))
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
                onClick={handleCreateAndEdit}
                disabled={!formData.title || !formData.description || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Course & Continue Editing
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}