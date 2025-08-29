"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  Users, 
  Star, 
  Brain, 
  Sparkles, 
  TrendingUp,
  Zap,
  Target,
  MessageSquare,
  ChevronRight,
  Activity,
  Award,
  ShoppingCart
} from "lucide-react"
import { Course, UserRole } from "@/types/domain"
import { cn } from "@/lib/utils"
import { FeatureGate } from "@/config/features"
import { EnrollmentDialog } from "@/components/enrollment/EnrollmentDialog"
import { useAppStore } from "@/stores/app-store"

interface AICourseCardProps {
  course: Course
  variant?: "default" | "enrolled" | "instructor"
  userRole?: UserRole
  progress?: number
  aiMetrics?: {
    learnRate?: number
    strugglingTopics?: string[]
    predictedCompletion?: string
    aiInteractionsUsed?: number
  }
  showAIQuiz?: boolean
  showAITip?: boolean
}

export function AICourseCard({ 
  course, 
  variant = "default", 
  userRole,
  progress,
  aiMetrics,
  showAIQuiz = false,
  showAITip = false
}: AICourseCardProps) {
  const isEnrolled = variant === "enrolled"
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const { enrolledCourses } = useAppStore()
  
  // Check if user is actually enrolled (for course listing pages)
  const isUserEnrolled = enrolledCourses?.some(c => c.id === course.id) || isEnrolled
  
  const handleEnrollSuccess = () => {
    setShowEnrollDialog(false)
    // The store will automatically update enrolled courses
  }
  
  // Mock AI-powered insights
  const difficultyScore = 7.2 // AI-calculated based on content analysis
  const matchScore = 89 // How well this course matches user's learning style
  const dropoutRisk = progress && progress < 30 ? "high" : "low"
  const estimatedTime = "3 weeks" // AI prediction based on user's pace
  
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-xl">
      {/* AI Match Score Badge - Only for students */}
      {userRole && (
        <FeatureGate role={userRole} feature="aiHints">
          <div className="absolute right-3 top-3 z-10">
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
              <Brain className="mr-1 h-3 w-3" />
              {matchScore}% Match
            </Badge>
          </div>
        </FeatureGate>
      )}

      {/* Course Thumbnail with AI Overlay */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        

        {/* Progress Bar for Enrolled Courses */}
        {isEnrolled && progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={progress} className="h-1.5 rounded-none" />
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-lg font-semibold">{course.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        </div>

        {/* AI Learning Metrics for Enrolled - Only for students with AI features */}
        {isUserEnrolled && aiMetrics && userRole && (
          <FeatureGate role={userRole} feature="aiChat">
            <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-2 text-center">
              <TrendingUp className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
                {aiMetrics.learnRate || 35} min/hr
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-400">Learn Rate</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2 text-center">
              <Zap className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                {aiMetrics.aiInteractionsUsed || 12}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">AI Hints</p>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2 text-center">
              <Target className="mx-auto h-4 w-4 text-purple-600 dark:text-purple-400" />
              <p className="mt-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                {aiMetrics.predictedCompletion || "3 wks"}
              </p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400">Est. Time</p>
            </div>
          </div>
          </FeatureGate>
        )}

        {/* AI-Powered Struggling Topics Alert */}
        {isUserEnrolled && aiMetrics?.strugglingTopics && aiMetrics.strugglingTopics.length > 0 && (
          <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-2">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  AI detected struggle areas:
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {aiMetrics.strugglingTopics.slice(0, 2).map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-[10px] py-0 h-5">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        {/* Course Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{(course.enrollmentCount || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{course.duration} hours</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{course.rating || 4.5}</span>
          </div>
        </div>

        {/* AI Features Preview - Only for students */}
        {!isUserEnrolled && userRole && (
          <FeatureGate role={userRole} feature="aiChat">
            <div className="mt-3 space-y-2">
            {/* AI Tip */}
            {showAITip && (
              <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-2 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    AI Tip: Schedule 30 min today to stay on track
                  </span>
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-muted-foreground font-medium">
              ⏰ AI Features triggered during video:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 h-5" title="Appears when you pause or rewind">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                AI Hints
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 h-5" title="Triggered at key learning moments">
                <Brain className="mr-1 h-2.5 w-2.5" />
                AI Quiz
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 h-5" title="Prompts at section completion">
                <MessageSquare className="mr-1 h-2.5 w-2.5" />
                Reflections
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 h-5" title="Adapts when struggling detected">
                <Target className="mr-1 h-2.5 w-2.5" />
                Adaptive Path
              </Badge>
            </div>
          </div>
          </FeatureGate>
        )}

        {/* Instructor */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <Image
              src={course.instructor?.avatar || "/placeholder-avatar.jpg"}
              alt={course.instructor?.name || "Instructor"}
              width={24}
              height={24}
              className="rounded-full"
              unoptimized={course.instructor?.avatar?.includes('dicebear.com') || course.instructor?.avatar?.includes('/svg') || false}
            />
            <span className="text-xs text-muted-foreground">
              {course.instructor?.name || "Unknown Instructor"}
            </span>
          </div>
          {!isUserEnrolled && (
            <span className="text-lg font-bold">
              {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isUserEnrolled ? (
          <div className="w-full space-y-2">
            {/* AI Recommendation */}
            {progress && progress < 50 && dropoutRisk === "high" && (
              <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    AI Tip: Schedule 30 min today to stay on track
                  </span>
                </div>
              </div>
            )}
            
            <Button className="w-full group" asChild>
              <Link href={`/student/courses/learn/${course.id}`}>
                Continue Learning
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <Button className="flex-1" asChild>
                <Link href={`/courses/${course.id}`}>
                  View Course
                  <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowEnrollDialog(true)}
                className="px-3"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              10 free AI interactions included
            </p>
          </div>
        )}
        
        {/* Enrollment Dialog */}
        <EnrollmentDialog
          course={course}
          isOpen={showEnrollDialog}
          onClose={() => setShowEnrollDialog(false)}
          onSuccess={handleEnrollSuccess}
        />
      </CardFooter>
    </Card>
  )
}