"use client"

import { useParams } from "next/navigation"
import { useQuery } from '@tanstack/react-query'
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner, ErrorFallback } from "@/components/common"
import { PageHeaderSkeleton, Skeleton } from "@/components/common/universal-skeleton"
import {
  BookOpen,
  Clock,
  Play,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  List
} from "lucide-react"
import Link from "next/link"
import { useAppStore } from "@/stores/app-store"
import { getCourseWithChaptersAndVideos } from '@/app/actions/student-course-actions'
import { CourseThumbnail } from '@/components/ui/course-thumbnail'
import { useState, useEffect } from 'react'

interface Chapter {
  id: string
  title: string
  order: number
  videos: Video[]
}

interface Video {
  id: string
  title: string
  duration_seconds: number
  order: number
  chapter_id: string
}

interface CourseWithContent {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor_id: string
  chapters: Chapter[]
  total_videos: number
  total_duration_minutes: number
}

export default function StudentCourseContentPage() {
  const params = useParams()
  const courseId = params.id as string
  const { user, profile } = useAppStore()

  // 🎯 ARCHITECTURE-COMPLIANT: TanStack Query for server state
  const { data: courseResult, isLoading, error } = useQuery({
    queryKey: ['course-content', courseId, user?.id],
    queryFn: () => getCourseWithChaptersAndVideos(courseId),
    enabled: !!(courseId && (user?.id || profile?.id)),
    staleTime: 1000 * 60 * 5, // 5 minutes cache for better performance
    retry: 2
  })

  // 🎯 ARCHITECTURE-COMPLIANT: Zustand for UI state
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  const course = courseResult?.success ? courseResult.data : null

  // Expand all chapters by default when course data loads
  useEffect(() => {
    if (course?.chapters) {
      setExpandedChapters(new Set(course.chapters.map(chapter => chapter.id)))
    }
  }, [course?.chapters])

  // Loading state - show skeleton while loading OR while processing data
  if (isLoading || !courseResult) {
    return (
      <ErrorBoundary>
        <div className="flex-1 p-6 max-w-6xl mx-auto">
          <PageHeaderSkeleton />

          {/* Course Content Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg">
                    {/* Chapter Header Skeleton */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>

                    {/* Videos Skeleton */}
                    <div className="border-t bg-muted/20">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center justify-between p-4 border-t first:border-t-0">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-48 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  // Error state
  if (error || (courseResult && !courseResult.success)) {
    return <ErrorFallback error={error || new Error(courseResult?.error)} />
  }

  // Not found state - only show if not loading and course is null
  if (!isLoading && !course) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
              <p className="text-muted-foreground mb-4">
                This course may not be available or you may not have access to it.
              </p>
              <Button asChild>
                <Link href="/student/courses">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
                </Link>
              </Button>
            </div>
          </main>
        </div>
      </ErrorBoundary>
    )
  }

  // 🎯 COMPONENT RESPONSIBILITY: Event handling for UI state
  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId)
    } else {
      newExpanded.add(chapterId)
    }
    setExpandedChapters(newExpanded)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} min`
  }

  const getChapterDuration = (chapter: Chapter) => {
    const totalSeconds = chapter.videos.reduce((sum, video) => sum + (video.duration_seconds || 0), 0)
    return formatDuration(totalSeconds)
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student/courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">{course.description}</p>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.chapters.length} chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.total_videos} videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.total_duration_minutes} min</span>
                </div>
              </div>
            </div>

            {/* Course Thumbnail */}
            <div>
              <CourseThumbnail title={course.title} className="mb-6" />
            </div>
          </div>
        </div>

        {/* Course Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {course.chapters.length > 0 ? (
              <div className="space-y-3">
                {course.chapters
                  .sort((a, b) => a.order - b.order)
                  .map((chapter) => {
                    const isExpanded = expandedChapters.has(chapter.id)
                    const chapterVideos = chapter.videos.sort((a, b) => a.order - b.order)

                    return (
                      <div key={chapter.id} className="border rounded-lg">
                        {/* Chapter Header */}
                        <button
                          onClick={() => toggleChapter(chapter.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold">{chapter.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {chapterVideos.length} videos • {getChapterDuration(chapter)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            Chapter {chapter.order}
                          </Badge>
                        </button>

                        {/* Chapter Videos */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20">
                            {chapterVideos.map((video, index) => (
                              <div
                                key={video.id}
                                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t first:border-t-0"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{video.title}</h4>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatDuration(video.duration_seconds)}</span>
                                    </div>
                                  </div>
                                </div>

                                <Button size="sm" asChild>
                                  <Link href={`/student/course/${courseId}/video/${video.id}`}>
                                    <Play className="h-3 w-3 mr-1" />
                                    Play
                                  </Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Content Available</h3>
                <p className="text-muted-foreground">
                  This course doesn't have any chapters or videos yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}