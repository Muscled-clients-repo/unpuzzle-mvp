"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Clock,
  CheckCircle2,
  BookOpen,
  Award,
  Brain,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Lock
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { StudentCourseOverviewSkeleton, ChapterVideosSkeleton } from "@/components/common/CourseCardSkeleton"
import { ErrorFallback } from "@/components/common"
import { apiClient } from "@/lib/api-client"

export default function StudentCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  
  // State for lazy loading videos
  const [sectionVideos, setSectionVideos] = useState<{[sectionId: string]: any[]}>({})
  const [loadingSections, setLoadingSections] = useState<{[sectionId: string]: boolean}>({})
  const loadedSectionsRef = useRef<Set<string>>(new Set())
  
  const { 
    currentCourse,
    courseProgress,
    loadCourseById,
    loadCourseProgress,
    loading,
    error
  } = useAppStore()

  // Get sections and manage video loading state
  const sections = useMemo(() => currentCourse?.sections || [], [currentCourse?.sections])
  
  // Load course data and progress
  useEffect(() => {
    loadCourseById(courseId)
    loadCourseProgress(courseId)  // Backend extracts userId from auth token
  }, [courseId, loadCourseById, loadCourseProgress])

  // Reset loaded sections when course changes
  useEffect(() => {
    loadedSectionsRef.current.clear()
    setSectionVideos({})
    setLoadingSections({})
  }, [courseId])

  // Load section videos lazily in background
  useEffect(() => {
    if (!currentCourse || !sections.length) return

    const loadSectionVideos = async () => {
      for (const section of sections) {
        // Skip if already loaded or loading
        if (loadedSectionsRef.current.has(section.id)) continue

        loadedSectionsRef.current.add(section.id)
        setLoadingSections(prev => ({ ...prev, [section.id]: true }))

        try {
          const response = await apiClient.get(`/api/v1/sections/${section.id}/media/`)
          
          // Check for successful response
          if (response.status === 200 && response.data) {
            const responseData = response.data as any
            let videos: any[] = []
            
            // Handle nested response structure {success: true, data: {...}}
            const data = responseData.data || responseData
            
            // Handle different response formats
            if (Array.isArray(data)) {
              videos = data
            } else if (data.results && Array.isArray(data.results)) {
              videos = data.results
            } else if (data.mediaFiles && Array.isArray(data.mediaFiles)) {
              videos = data.mediaFiles
            } else if (data.videos && Array.isArray(data.videos)) {
              videos = data.videos
            } else if (data.media && Array.isArray(data.media)) {
              videos = data.media
            } else {
              // Try to find any array in the data as fallback
              for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) {
                  videos = data[key]
                  break
                }
              }
            }
            
            // Log first video to see CDN URL structure
            if (videos.length > 0) {
              console.log(`📹 Sample video for section ${section.id}:`, videos[0])
            }
            
            setSectionVideos(prev => ({
              ...prev, 
              [section.id]: videos
            }))
          } else if (response.error) {
            console.error(`API Error for section ${section.id}:`, response.error)
          }
        } catch (error) {
          console.error(`Failed to load videos for section ${section.id}:`, error)
          // Remove from loaded set on error so it can be retried
          loadedSectionsRef.current.delete(section.id)
        } finally {
          setLoadingSections(prev => ({ ...prev, [section.id]: false }))
        }
      }
    }

    loadSectionVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse?.id, sections.length])
  
  // Show skeleton while loading
  if (loading || !currentCourse) {
    return <StudentCourseOverviewSkeleton />
  }
  
  // Show error only after loading is complete
  if (error && !loading) {
    return <ErrorFallback error={error} />
  }
  
  // Get progress for this specific course
  const currentCourseProgress = courseProgress?.[courseId]
  
  
  // Calculate total videos from loaded sections
  const totalVideos = Object.values(sectionVideos).reduce((total, videos) => total + videos.length, 0)
  
  const progressPercent = currentCourseProgress?.percentComplete || 0
  const completedVideos = currentCourseProgress?.videosCompleted || 0
  
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Course Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/student/courses" className="hover:text-foreground">
            My Courses
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{currentCourse.title}</span>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="mb-4 text-3xl font-bold">{currentCourse.title}</h1>
            <p className="mb-6 text-lg text-muted-foreground">
              {currentCourse.description}
            </p>
            
            {/* Progress Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{completedVideos} of {totalVideos} lessons completed</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                
                {progressPercent === 100 ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Award className="h-5 w-5" />
                    <span className="font-medium">Course Completed!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Estimated time remaining: {Math.ceil((totalVideos - completedVideos) * 0.5)} hours
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Continue Learning Button */}
            <Button size="lg" className="w-full lg:w-auto" asChild>
              <Link href={`/student/courses/learn/${courseId}`}>
                <Play className="mr-2 h-5 w-5" />
                Continue Learning
              </Link>
            </Button>
          </div>
          
          {/* Course Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">AI-Powered Learning</div>
                    <div className="text-sm text-muted-foreground">Get hints and assistance</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">Interactive Quizzes</div>
                    <div className="text-sm text-muted-foreground">Test your knowledge</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                    <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Reflections</div>
                    <div className="text-sm text-muted-foreground">Deepen understanding</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
                    <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium">Certificate</div>
                    <div className="text-sm text-muted-foreground">On completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <div>
        <h2 className="mb-6 text-2xl font-bold">Course Content</h2>
        
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-lg">
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-0">
                  {loadingSections[section.id] ? (
                    <ChapterVideosSkeleton count={3} />
                  ) : sectionVideos[section.id] && Array.isArray(sectionVideos[section.id]) ? (
                    sectionVideos[section.id].map((media, mediaIndex: number) => {
                      // Calculate global video index for progress tracking
                      const globalIndex = sections.slice(0, sectionIndex).reduce((total, sec) => 
                        total + (sectionVideos[sec.id]?.length || 0), 0) + mediaIndex
                      
                      const isCompleted = completedVideos > globalIndex
                      const isLocked = globalIndex > 0 && completedVideos < globalIndex
                      const isCurrent = completedVideos === globalIndex
                      
                      return (
                        <div key={media.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                              isCompleted ? 'bg-green-100 dark:bg-green-950' : 
                              isCurrent ? 'bg-primary text-primary-foreground' : 
                              'bg-muted'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : isLocked ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <span className="font-medium">{mediaIndex + 1}</span>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-medium">
                                {media.title || media.filename || 'Untitled Video'}
                                {(media.cdn_url || media.url) && (
                                  <Play className="inline ml-2 h-3 w-3 text-green-600 dark:text-green-400" />
                                )}
                              </h4>
                              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {media.duration ? Math.floor(media.duration / 60) : '~10'} min
                                </span>
                                {(media.cdn_url || media.url) && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    Available
                                  </span>
                                )}
                                {isCompleted && (
                                  <Badge variant="secondary" className="text-xs">
                                    Completed
                                  </Badge>
                                )}
                                {isCurrent && (
                                  <Badge className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant={isCurrent ? "default" : "outline"}
                            size="sm"
                            disabled={isLocked}
                            asChild
                          >
                            <Link href={`/student/courses/learn/${courseId}?video=${media.id}`}>
                              {isCompleted ? 'Review' : isCurrent ? 'Continue' : 'Start'}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No videos in this section
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}