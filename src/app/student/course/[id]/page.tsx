"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Clock, 
  Star, 
  Users, 
  BookOpen,
  CheckCircle2,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id as string
  
  const {
    currentCourse,
    loadCourseById,
    courseProgress,
    loadCourseProgress
  } = useAppStore()
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Load course data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      console.log('📚 Loading course data for:', courseId)
      await Promise.all([
        loadCourseById(courseId),
        loadCourseProgress(courseId)
      ])
      setTimeout(() => setIsLoading(false), 100)
    }
    loadData()
  }, [courseId, loadCourseById, loadCourseProgress])
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }
  
  // Show not found state
  if (!currentCourse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Button asChild>
            <Link href="/student">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }
  
  const progress = courseProgress[courseId]
  const progressPercent = progress?.percentComplete || 0
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <Badge variant="secondary" className="mb-2">
              {currentCourse.tags?.[0] || 'Course'}
            </Badge>
            <h1 className="text-3xl font-bold mb-4">{currentCourse.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">
              {currentCourse.description}
            </p>
          </div>
          
          {/* Course Stats */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{currentCourse.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{currentCourse.enrollmentCount} students</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{currentCourse.rating} rating</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">{currentCourse.videos.length} videos</span>
            </div>
          </div>
          
          {/* Progress */}
          {progress && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Course Progress</span>
                <span className="text-sm text-muted-foreground">
                  {progress.videosCompleted}/{progress.totalVideos} videos completed
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progressPercent}% complete</p>
            </div>
          )}
        </div>
        
        {/* Course Thumbnail */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video relative rounded-t-lg overflow-hidden">
                <Image
                  src={currentCourse.thumbnailUrl}
                  alt={currentCourse.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={currentCourse.instructor.avatar}
                    alt={currentCourse.instructor.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-medium">{currentCourse.instructor.name}</p>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/student/course/${courseId}/video/${currentCourse.videos[0]?.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    {progress ? 'Continue Learning' : 'Start Course'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Course Content */}
      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
          <CardDescription>
            {currentCourse.videos.length} videos • {currentCourse.duration} minutes total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentCourse.videos.map((video, index) => {
              const isCompleted = progress && index < progress.videosCompleted
              const isCurrent = progress && index === progress.videosCompleted
              
              return (
                <Link
                  key={video.id}
                  href={`/student/course/${courseId}/video/${video.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : isCurrent ? (
                        <Play className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{video.title}</h4>
                      <p className="text-sm text-muted-foreground">{video.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-muted-foreground">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}