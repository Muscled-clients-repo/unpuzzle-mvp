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
  Library,
  Save,
  Eye,
  EyeOff,
  Edit2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeaderSkeleton, Skeleton } from "@/components/common/universal-skeleton"

// Junction Table Architecture - Only working hooks
import { useCourseWithMedia } from '@/hooks/use-chapter-media-queries'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { chapterMediaKeys } from '@/hooks/use-chapter-media-queries'
import { useCourseWebSocket } from '@/hooks/use-course-websocket'
import { publishCourseAction, unpublishCourseAction } from '@/app/actions/course-actions'
import { linkMediaToChapterAction, unlinkMediaFromChapterAction } from '@/app/actions/chapter-media-actions'
import { updateChapterAction } from '@/app/actions/chapter-crud-actions'
import { MediaSelector } from '@/components/media/media-selector'
import { ChapterMediaList } from '@/components/course/ChapterMediaList'
import { CourseTrackGoalSelector } from '@/components/course/CourseTrackGoalSelector'
import { SimpleVideoPreview } from '@/components/ui/SimpleVideoPreview'
import { TranscriptUploadModal } from '@/components/course/TranscriptUploadModal'

export default function CourseEditPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  const router = useRouter()

  // State for media selector
  const [showMediaSelector, setShowMediaSelector] = React.useState<string | null>(null)

  // State for video preview
  const [previewVideo, setPreviewVideo] = React.useState<any>(null)

  // State for transcript upload modal
  const [transcriptUploadVideo, setTranscriptUploadVideo] = React.useState<any>(null)

  // State for basic course editing
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [editingDescription, setEditingDescription] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState("")
  const [descriptionValue, setDescriptionValue] = React.useState("")

  // State for chapter editing
  const [editingChapter, setEditingChapter] = React.useState<string | null>(null)
  const [chapterTitleValue, setChapterTitleValue] = React.useState("")

  // Junction table hooks (working correctly)
  const { courseData, isLoading: isLoadingCourse } = useCourseWithMedia(courseId)

  // WebSocket for real-time updates (temporarily disabled to fix infinite loop)
  // const websocket = useCourseWebSocket(courseId)
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

  // Optimistic media linking mutation
  const linkMediaMutation = useMutation({
    mutationFn: async ({ mediaFiles, chapterId }: { mediaFiles: any[], chapterId: string }) => {
      const results = []
      for (const mediaFile of mediaFiles) {
        const result = await linkMediaToChapterAction(mediaFile.id, chapterId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to link media')
        }
        results.push(result)
      }
      return results
    },
    onMutate: async ({ mediaFiles, chapterId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: chapterMediaKeys.course(courseId) })

      // Snapshot the previous value
      const previousCourse = queryClient.getQueryData(chapterMediaKeys.course(courseId))

      // Optimistically update the cache
      queryClient.setQueryData(chapterMediaKeys.course(courseId), (old: any) => {
        if (!old) return old

        const updatedChapters = old.chapters?.map((chapter: any) => {
          if (chapter.id === chapterId) {
            const newMedia = mediaFiles.map((mediaFile, index) => ({
              junctionId: `temp-${Date.now()}-${index}`,
              id: mediaFile.id,
              name: mediaFile.name,
              customTitle: null,
              file_type: mediaFile.file_type,
              file_size: mediaFile.file_size,
              duration_seconds: mediaFile.duration_seconds,
              cdn_url: mediaFile.cdn_url,
              order: (chapter.media?.length || 0) + index + 1,
              transcript_text: null,
              transcript_file_path: null
            }))

            return {
              ...chapter,
              media: [...(chapter.media || []), ...newMedia]
            }
          }
          return chapter
        })

        return { ...old, chapters: updatedChapters }
      })

      return { previousCourse }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCourse) {
        queryClient.setQueryData(chapterMediaKeys.course(courseId), context.previousCourse)
      }
      console.error('❌ [MEDIA SELECTOR] Failed to link media:', err)
      toast.error('Failed to link media to chapter')
    },
    onSuccess: (data, { mediaFiles }) => {
      toast.success(`Linked ${mediaFiles.length} media file(s) to chapter`)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
      setShowMediaSelector(null)
    }
  })

  // Media selection handler for Browse Library
  const handleMediaSelected = (mediaFiles: any[], chapterId: string) => {
    console.log('🎬 [MEDIA SELECTOR] Linking media to chapter:', { chapterId, mediaCount: mediaFiles.length })
    linkMediaMutation.mutate({ mediaFiles, chapterId })
  }

  // Optimistic media unlinking mutation
  const unlinkMediaMutation = useMutation({
    mutationFn: async (junctionId: string) => {
      const result = await unlinkMediaFromChapterAction(junctionId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to unlink media')
      }
      return result
    },
    onMutate: async (junctionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: chapterMediaKeys.course(courseId) })

      // Snapshot the previous value
      const previousCourse = queryClient.getQueryData(chapterMediaKeys.course(courseId))

      // Optimistically remove the media from cache
      queryClient.setQueryData(chapterMediaKeys.course(courseId), (old: any) => {
        if (!old) return old

        const updatedChapters = old.chapters?.map((chapter: any) => ({
          ...chapter,
          media: chapter.media?.filter((media: any) => media.junctionId !== junctionId) || []
        }))

        return { ...old, chapters: updatedChapters }
      })

      return { previousCourse }
    },
    onError: (err, junctionId, context) => {
      // Rollback on error
      if (context?.previousCourse) {
        queryClient.setQueryData(chapterMediaKeys.course(courseId), context.previousCourse)
      }
      console.error('❌ [COURSE EDIT] Failed to unlink media:', err)
      toast.error('Failed to unlink media from chapter')
    },
    onSuccess: () => {
      toast.success('Media unlinked from chapter')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
    }
  })

  // Media unlink handler
  const handleMediaUnlink = (junctionId: string) => {
    console.log('🔓 [COURSE EDIT] Unlinking media from chapter:', junctionId)
    unlinkMediaMutation.mutate(junctionId)
  }

  // Handle media preview
  const handleMediaPreview = (media: any) => {
    // Convert ChapterMedia to format expected by SimpleVideoPreview
    const videoData = {
      id: media.id, // This is the media file ID
      name: media.customTitle || media.name,
      title: media.customTitle || media.name,
      video_url: media.cdn_url,
      url: media.cdn_url
    }
    setPreviewVideo(videoData)
  }

  // Handle transcript upload
  const handleTranscriptUpload = (media: any) => {
    // Open dedicated transcript upload modal
    setTranscriptUploadVideo(media)
  }

  // Chapter editing handlers
  const handleStartChapterEdit = (chapter: any) => {
    setEditingChapter(chapter.id)
    setChapterTitleValue(chapter.title || "")
  }

  const handleSaveChapterEdit = async (chapterId: string) => {
    if (!chapterTitleValue.trim()) {
      toast.error('Chapter title cannot be empty')
      return
    }

    // Find the original chapter to compare titles
    const originalChapter = chapters.find(ch => ch.id === chapterId)
    const originalTitle = originalChapter?.title || ""
    const newTitle = chapterTitleValue.trim()

    // If no changes, just exit editing mode without showing toast
    if (newTitle === originalTitle) {
      setEditingChapter(null)
      setChapterTitleValue("")
      return
    }

    try {
      const result = await updateChapterAction(chapterId, {
        title: newTitle
      })

      if (result.success) {
        toast.success('Chapter title updated')
        // Refresh the course data
        queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
      } else {
        toast.error(result.error || 'Failed to update chapter title')
      }
    } catch (error) {
      console.error('Chapter update error:', error)
      toast.error('Failed to update chapter title')
    } finally {
      setEditingChapter(null)
      setChapterTitleValue("")
    }
  }

  const handleCancelChapterEdit = () => {
    setEditingChapter(null)
    setChapterTitleValue("")
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
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b mb-6">
          <div className="flex items-center justify-between py-4">
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
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Details - 33% Width */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 z-10">
              <CardHeader>
                <CardTitle className="text-lg">Course Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Basic information
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Title */}
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
                        className="font-medium"
                      />
                      <Button size="sm" onClick={() => setEditingTitle(false)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="font-medium cursor-pointer hover:bg-gray-50 p-2 rounded border mt-1"
                      onClick={() => setEditingTitle(true)}
                    >
                      {course.title || 'Click to add title'}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
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
                        className="resize-none"
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

                {/* Goal Visibility */}
                <CourseTrackGoalSelector courseId={courseId} />
              </CardContent>
            </Card>
          </div>

          {/* Course Content - 67% Width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Content</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organize your course into chapters and lessons
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-6 pb-6">
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
                              <div className="flex-1 min-w-0 mr-4">
                                {editingChapter === chapter.id ? (
                                  <input
                                    value={chapterTitleValue}
                                    onChange={(e) => setChapterTitleValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleSaveChapterEdit(chapter.id)
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault()
                                        handleCancelChapterEdit()
                                      }
                                    }}
                                    onBlur={() => handleSaveChapterEdit(chapter.id)}
                                    className="font-semibold text-base bg-transparent border-none outline-none p-0 w-full focus:ring-0"
                                    autoFocus
                                  />
                                ) : (
                                  <div className="group flex items-center gap-1">
                                    <h3
                                      className="font-semibold cursor-pointer hover:bg-gray-50/50 p-1 rounded transition-colors"
                                      onClick={() => handleStartChapterEdit(chapter)}
                                      title="Click to edit"
                                    >
                                      {chapter.title}
                                    </h3>
                                    <Edit2
                                      className="h-3 w-3 text-muted-foreground/60 cursor-pointer"
                                      onClick={() => handleStartChapterEdit(chapter)}
                                      title="Edit chapter title"
                                    />
                                  </div>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
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
                              media={chapter.media || []}
                              onMediaUnlink={handleMediaUnlink}
                              onMediaPreview={handleMediaPreview}
                              onTranscriptUpload={handleTranscriptUpload}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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

        {/* Video Preview Modal */}
        {previewVideo && (
          <SimpleVideoPreview
            video={previewVideo}
            isOpen={!!previewVideo}
            onClose={() => setPreviewVideo(null)}
            title={previewVideo.name || previewVideo.title}
            autoPlay={false}
          />
        )}

        {/* Transcript Upload Modal */}
        {transcriptUploadVideo && (
          <TranscriptUploadModal
            isOpen={!!transcriptUploadVideo}
            onClose={() => setTranscriptUploadVideo(null)}
            videoId={transcriptUploadVideo.id}
            videoTitle={transcriptUploadVideo.customTitle || transcriptUploadVideo.name}
            onUploadComplete={() => {
              // Refresh course data to update any transcript status
              queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
            }}
          />
        )}
      </div>
    </PageContainer>
  )
}