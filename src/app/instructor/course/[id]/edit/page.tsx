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
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Library,
  Save,
  Eye,
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeaderSkeleton, Skeleton } from "@/components/common/universal-skeleton"

// Junction Table Architecture - Only working hooks
import { useCourseWithMedia } from '@/hooks/use-chapter-media-queries'
import { useQueryClient } from '@tanstack/react-query'
import { chapterMediaKeys } from '@/hooks/use-chapter-media-queries'
import { publishCourseAction, unpublishCourseAction } from '@/app/actions/course-actions'
import { linkMediaToChapterAction } from '@/app/actions/chapter-media-actions'
import { MediaSelector } from '@/components/media/media-selector'
import { ChapterMediaList } from '@/components/course/ChapterMediaList'

export default function CourseEditPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()

  // State for media selector
  const [showMediaSelector, setShowMediaSelector] = React.useState<string | null>(null)

  // State for basic course editing
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [editingDescription, setEditingDescription] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState("")
  const [descriptionValue, setDescriptionValue] = React.useState("")

  // Junction table hooks (working correctly)
  const { courseData, isLoading: isLoadingCourse } = useCourseWithMedia(courseId)
  const queryClient = useQueryClient()

  // Extract data from junction table
  const course = courseData
  const chapters = course?.chapters || []

  // Initialize form values when course loads
  React.useEffect(() => {
    if (course) {
      setTitleValue(course.title || "")
      setDescriptionValue(course.description || "")
    }
  }, [course])

  // Publish/Unpublish handlers
  const handlePublish = async () => {
    try {
      const action = course?.status === 'published' ? unpublishCourseAction : publishCourseAction
      const result = await action(courseId)

      if (result.success) {
        toast.success(`Course ${course?.status === 'published' ? 'unpublished' : 'published'} successfully`)
        // The useCourseWithMedia hook will automatically refresh
      } else {
        toast.error(result.error || 'Failed to update course status')
      }
    } catch (error) {
      toast.error('Failed to update course status')
    }
  }

  // Media selection handler for Browse Library
  const handleMediaSelected = async (mediaFiles: any[], chapterId: string) => {
    console.log('🎬 [MEDIA SELECTOR] Linking media to chapter:', { chapterId, mediaCount: mediaFiles.length })

    try {
      for (const mediaFile of mediaFiles) {
        const result = await linkMediaToChapterAction(mediaFile.id, chapterId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to link media')
        }
      }
      toast.success(`Linked ${mediaFiles.length} media file(s) to chapter`)

      // Invalidate TanStack Query cache to refresh the course data
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
    } catch (error) {
      console.error('❌ [MEDIA SELECTOR] Failed to link media:', error)
      toast.error('Failed to link media to chapter')
    } finally {
      setShowMediaSelector(null)
    }
  }

  // Loading state
  if (isLoadingCourse) {
    return (
      <PageContainer>
        <div className="max-w-6xl mx-auto p-6">
          <PageHeaderSkeleton />
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    )
  }

  // Error state
  if (!course) {
    return (
      <PageContainer>
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold">Course not found</h3>
                <p className="text-muted-foreground">The course you're looking for doesn't exist or you don't have permission to edit it.</p>
                <Button onClick={() => router.push('/instructor/courses')} className="mt-4">
                  Back to Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto p-6">
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
              <h1 className="text-2xl font-bold">Edit Course</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={course.status === 'published' ? 'outline' : 'default'}
              onClick={handlePublish}
            >
              {course.status === 'published' ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Course Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Course Title</Label>
              {editingTitle ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingTitle(false)
                      if (e.key === 'Escape') {
                        setTitleValue(course.title || "")
                        setEditingTitle(false)
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => setEditingTitle(false)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="text-lg font-medium cursor-pointer hover:bg-gray-50 p-2 rounded border mt-1"
                  onClick={() => setEditingTitle(true)}
                >
                  {course.title || 'Click to add title'}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Course Description</Label>
              {editingDescription ? (
                <div className="mt-1">
                  <Textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDescriptionValue(course.description || "")
                        setEditingDescription(false)
                      }
                    }}
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => setEditingDescription(false)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDescriptionValue(course.description || "")
                        setEditingDescription(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-[80px] cursor-pointer hover:bg-gray-50 p-3 rounded border mt-1"
                  onClick={() => setEditingDescription(true)}
                >
                  {course.description || 'Click to add description'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chapters and Media */}
        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            {chapters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No chapters yet. Create your first chapter to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {chapters.map((chapter) => (
                  <Card key={chapter.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{chapter.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {chapter.media?.length || 0} media files
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMediaSelector(chapter.id)}
                          className="h-8 px-2 text-xs"
                        >
                          <Library className="h-3 w-3 mr-1" />
                          Browse Library
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ChapterMediaList
                        chapterId={chapter.id}
                        courseId={courseId}
                        media={chapter.media || []}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Selector Modal */}
        {showMediaSelector && (
          <MediaSelector
            isOpen={!!showMediaSelector}
            onClose={() => setShowMediaSelector(null)}
            onSelect={(mediaFiles) => handleMediaSelected(mediaFiles, showMediaSelector)}
            allowMultiple={true}
            title="Select Media Files for Chapter"
          />
        )}
      </div>
    </PageContainer>
  )
}