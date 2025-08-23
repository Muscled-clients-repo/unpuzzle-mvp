"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Play,
  Clock,
  Users,
  Star,
  Globe,
  BookOpen,
  Award,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  Brain,
  MessageSquare,
  Target,
  ShoppingCart
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common"
import { ErrorFallback } from "@/components/common"
import { EnrollmentDialog } from "@/components/enrollment/EnrollmentDialog"
import { CourseReviews } from "@/components/course/course-reviews"

export default function CoursePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  
  // State for enrollment dialog
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  
  // Use both student-course-slice and public-course-slice for course data
  const { 
    enrolledCourses,
    currentCourse,
    loadCourseById,
    loadEnrolledCourses,
    loading,
    error,
    // Public course data
    currentCourse: publicCourse,
    loadCourseById: loadPublicCourse,
    loadingCourse: loadingPublicCourse
  } = useAppStore()
  
  // Load course data
  useEffect(() => {
    loadCourseById(courseId) // Load specific course details for enrolled students
    loadPublicCourse(courseId) // Load public course details
    loadEnrolledCourses('guest') // Check if user is already enrolled
  }, [courseId, loadCourseById, loadPublicCourse, loadEnrolledCourses])
  
  // Use public course data as fallback if student course is not available
  const course = currentCourse || publicCourse
  const instructor = course?.instructor
  const isLoadingCourse = loading || loadingPublicCourse
  
  // Check enrollment status using new store
  const isEnrolled = enrolledCourses.some(c => c.id === courseId)
  
  // Handle enrollment success
  const handleEnrollSuccess = () => {
    setShowEnrollDialog(false)
    router.push(`/student/course/${courseId}`)
  }
  
  if (isLoadingCourse) return <LoadingSpinner />
  
  if (error) return <ErrorFallback error={error} />
  
  if (!course) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
            <Button asChild>
              <Link href="/courses">Browse All Courses</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // AI-powered course insights (mock data)
  const aiInsights = {
    matchScore: 92,
    estimatedTime: "3-4 weeks",
    difficulty: 7.2,
    prerequisitesMet: true,
    similarStudentsSuccess: 89
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-background to-muted py-12">
          <div className="container px-4">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {course.tags?.[0] || 'Development'}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {course.difficulty}
                  </Badge>
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 border-0">
                    <Brain className="mr-1 h-3 w-3" />
                    {aiInsights.matchScore}% AI Match
                  </Badge>
                </div>
                
                <h1 className="mb-4 text-4xl font-bold tracking-tight">
                  {course.title}
                </h1>
                
                <p className="mb-6 text-lg text-muted-foreground">
                  {course.description}
                </p>

                {/* Course Stats */}
                <div className="mb-6 flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{course.rating || 4.5}</span>
                    <span className="text-muted-foreground">
                      ({Math.floor((course.enrollmentCount || 0) * 0.8)} ratings)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{(course.enrollmentCount || 0).toLocaleString()} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration} hours content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>English</span>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      AI Learning Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated completion</span>
                        <span className="font-medium">{aiInsights.estimatedTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Difficulty level</span>
                        <span className="font-medium">{aiInsights.difficulty}/10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prerequisites</span>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-600 dark:text-green-400">Met</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Similar students success</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {aiInsights.similarStudentsSuccess}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Instructor */}
                {instructor && (
                  <div className="flex items-start gap-4 rounded-lg border p-4">
                    <img
                      src={instructor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${instructor.name}`}
                      alt={instructor.name}
                      className="h-16 w-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{instructor.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">Experienced instructor</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>4.8 rating</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>1,500+ students</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enrollment Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  {/* Course Preview Video */}
                  <div className="relative aspect-video bg-muted">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Play className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-t-lg">
                      <Button size="lg" className="bg-white/90 text-black hover:bg-white">
                        <Play className="mr-2 h-5 w-5" />
                        Preview Course
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="mb-6">
                      <div className="mb-2">
                        <span className="text-3xl font-bold">${course.price || 99}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        30-day money-back guarantee
                      </p>
                    </div>

                    <div className="space-y-3">
                      {isEnrolled ? (
                        <Button className="w-full" size="lg" asChild>
                          <Link href={`/learn/${courseId}`}>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Continue Learning
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => setShowEnrollDialog(true)}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Enroll Now {course.price && course.price > 0 ? `- $${course.price}` : ''}
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Try AI Features Free
                      </Button>
                    </div>

                    <div className="mt-6 space-y-2 text-sm">
                      <p className="font-medium">This course includes:</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          <span>{course.duration} hours on-demand video</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.videos?.length || 0} lessons</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>Downloadable resources</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          <span>Certificate of completion</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <span>AI-powered learning assistance</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Button variant="ghost" size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content Tabs */}
        <section className="py-12">
          <div className="container px-4">
            <Tabs defaultValue="curriculum" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="ai-features">AI Features</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="curriculum" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                    <CardDescription>
                      {(course.videos || []).length} lessons • {course.duration}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(course.videos || []).map((video, index) => (
                        <div key={video.id} className="flex items-center justify-between border-b pb-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{video.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {video.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{Math.floor((video.duration || 600) / 60)} min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-features" className="mt-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Puzzle Hint
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get contextual hints when you pause or rewind. AI analyzes your confusion points and provides targeted assistance.
                      </p>
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <strong>Example:</strong> &quot;Remember: Semantic HTML elements like &lt;header&gt; and &lt;nav&gt; describe content purpose, not appearance.&quot;
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-green-500" />
                        Puzzle Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI-generated quizzes at key learning moments to test your understanding and reinforce concepts.
                      </p>
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <strong>Example:</strong> &quot;What are the three core technologies of web development?&quot;
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        Puzzle Reflect
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Guided reflection prompts at section completion to deepen understanding and get instructor feedback.
                      </p>
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <strong>Example:</strong> &quot;How would you explain the difference between block and inline elements?&quot;
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        Puzzle Path
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adaptive learning paths with supplementary content when struggling is detected.
                      </p>
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <strong>Example:</strong> Recommends &quot;CSS Box Model Explained&quot; video when layout concepts are challenging.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-8">
                <CourseReviews 
                  courseId={courseId}
                  averageRating={course?.rating}
                  totalReviews={course?.reviewCount}
                />
              </TabsContent>

              <TabsContent value="instructor" className="mt-8">
                {instructor && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-6">
                        <img
                          src={instructor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${instructor.name}`}
                          alt={instructor.name}
                          className="h-24 w-24 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-2">{instructor.name}</h3>
                          <p className="text-muted-foreground mb-4">Experienced instructor with expertise in modern development</p>
                          
                          <div className="grid gap-4 sm:grid-cols-3 mb-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold">4.8</div>
                              <div className="text-sm text-muted-foreground">Instructor Rating</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">1,500+</div>
                              <div className="text-sm text-muted-foreground">Students</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">5</div>
                              <div className="text-sm text-muted-foreground">Courses</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {['React', 'TypeScript', 'Node.js', 'Next.js'].map((skill) => (
                                <Badge key={skill} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Enrollment Dialog */}
      {course && (
        <EnrollmentDialog
          course={course}
          isOpen={showEnrollDialog}
          onClose={() => setShowEnrollDialog(false)}
          onSuccess={handleEnrollSuccess}
        />
      )}
    </div>
  )
}