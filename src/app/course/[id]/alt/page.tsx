"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Play,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Sparkles,
  Brain,
  MessageSquare,
  Target,
  Download,
  Award,
  Globe,
  Heart,
  Share2,
  Zap,
  TrendingUp,
  BookOpen
} from "lucide-react"
import { mockCourses, mockUsers } from "@/data/mock"

export default function AlternativeCoursePreview() {
  const params = useParams()
  const courseId = params.id as string
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  
  const course = mockCourses.find(c => c.id === courseId)
  const instructor = mockUsers.instructors.find(i => i.courses.includes(courseId))
  
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

  // Mock AI insights with more detailed breakdown
  const aiInsights = {
    matchScore: 94,
    learningStyle: "Visual + Hands-on",
    estimatedTime: "3.2 weeks",
    difficulty: 6.8,
    completionPrediction: 87,
    recommendationReason: "Based on your JavaScript fundamentals progress"
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="flex-1">
        {/* Floating Navigation */}
        <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-sm border-b">
          <div className="container px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <a href="#overview" className="hover:text-primary transition-colors">Overview</a>
                <a href="#curriculum" className="hover:text-primary transition-colors">Curriculum</a>
                <a href="#ai-features" className="hover:text-primary transition-colors">AI Features</a>
                <a href="#instructor" className="hover:text-primary transition-colors">Instructor</a>
                <a href="#reviews" className="hover:text-primary transition-colors">Reviews</a>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/course/${courseId}`}>
                  View Original Layout
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section with Split Layout */}
        <section id="overview" className="py-12">
          <div className="container px-4">
            <div className="grid gap-8 lg:grid-cols-5">
              {/* Left: Course Info (3/5) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Breadcrumb & Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{course.category}</Badge>
                  <Badge variant="outline" className="capitalize">{course.level}</Badge>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI-Enhanced
                  </Badge>
                </div>

                {/* Title & Description */}
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                    {course.title}
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Course Stats in Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="text-center p-4">
                    <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold">{course.rating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </Card>
                  
                  <Card className="text-center p-4">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="font-bold">{(course.students / 1000).toFixed(1)}k</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </Card>
                  
                  <Card className="text-center p-4">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-bold">{course.duration.split(' ')[0]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </Card>
                  
                  <Card className="text-center p-4">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Globe className="h-4 w-4" />
                      <span className="font-bold">EN</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Language</p>
                  </Card>
                </div>

                {/* AI Personalization Panel */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg text-blue-900 dark:text-blue-100">
                        <Brain className="h-5 w-5" />
                        AI Personalization for You
                      </CardTitle>
                      <Badge className="bg-blue-600 text-white border-0">
                        {aiInsights.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Your Learning Style
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {aiInsights.learningStyle}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Estimated Timeline
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {aiInsights.estimatedTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Success Prediction
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {aiInsights.completionPrediction}% likely to complete
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Recommended Because
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          {aiInsights.recommendationReason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* What You'll Learn */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      What You'll Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {[
                        "Build responsive websites from scratch",
                        "Master HTML5 semantic structure", 
                        "Create dynamic layouts with CSS Grid & Flexbox",
                        "Add interactivity with JavaScript",
                        "Use AI-powered debugging assistance",
                        "Deploy projects to the web"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructor Info */}
                {instructor && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={instructor.avatar}
                          alt={instructor.name}
                          className="h-16 w-16 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{instructor.name}</h3>
                          <p className="text-muted-foreground text-sm mb-3">{instructor.bio}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{instructor.rating} rating</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{instructor.totalStudents.toLocaleString()} students</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Enrollment & Video Preview (2/5) */}
              <div className="lg:col-span-2">
                <div className="sticky top-32">
                  <Card className="overflow-hidden">
                    {/* Video Preview */}
                    <div className="relative aspect-video bg-black">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Play className="h-16 w-16 text-white/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Button 
                          size="lg" 
                          className="bg-white/90 text-black hover:bg-white"
                          onClick={() => setSelectedVideo(course.videos[0]?.id || null)}
                        >
                          <Play className="mr-2 h-5 w-5" />
                          Preview Course
                        </Button>
                      </div>
                      
                      {/* Course Duration Overlay */}
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {course.duration} total
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {/* Price & Actions */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-bold">${course.price}</div>
                          <p className="text-sm text-muted-foreground">One-time payment</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsWishlisted(!isWishlisted)}
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              isWishlisted ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Button className="w-full" size="lg">
                          <Sparkles className="mr-2 h-4 w-4" />
                          Enroll Now
                        </Button>
                        <Button variant="outline" className="w-full">
                          Start Free Trial
                        </Button>
                      </div>

                      <Separator />

                      {/* Course Includes */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">This course includes:</h4>
                        <div className="space-y-2 text-sm">
                          {[
                            { icon: Play, text: `${course.duration} on-demand video` },
                            { icon: BookOpen, text: `${course.videos.length} comprehensive lessons` },
                            { icon: Zap, text: "AI-powered learning assistance" },
                            { icon: Download, text: "Downloadable resources & code" },
                            { icon: Award, text: "Certificate of completion" },
                            { icon: Globe, text: "Lifetime access" }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Share & Guarantee */}
                      <div className="flex items-center justify-between text-sm">
                        <Button variant="ghost" size="sm">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <span className="text-muted-foreground">30-day guarantee</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Curriculum Section */}
        <section id="curriculum" className="py-16 bg-muted/30">
          <div className="container px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Course Curriculum</h2>
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible defaultValue="item-0">
                {course.videos.map((video, index) => (
                  <AccordionItem key={video.id} value={`item-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 text-left">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{video.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{video.duration}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-12 space-y-3">
                        <p className="text-muted-foreground">{video.description}</p>
                        
                        {video.timestamps && video.timestamps.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm">Key Topics:</h5>
                            <div className="flex flex-wrap gap-1">
                              {video.timestamps.map((timestamp) => (
                                <Badge key={timestamp.time} variant="secondary" className="text-xs">
                                  {timestamp.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          <span>AI hints available during this lesson</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* AI Features Showcase */}
        <section id="ai-features" className="py-16">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">AI-Powered Learning Experience</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Experience personalized learning with our four AI agents that adapt to your progress
              </p>
            </div>
            
            {/* Pills Layout - User Preferred */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { text: "⏰ AI Features triggered during video", bg: "bg-slate-100 dark:bg-slate-800" },
                { text: "✨ Hints appear when you pause or rewind", bg: "bg-yellow-100 dark:bg-yellow-900/20" },
                { text: "🧠 Quizzes at key learning moments", bg: "bg-green-100 dark:bg-green-900/20" },
                { text: "💭 Reflections prompt at section end", bg: "bg-blue-100 dark:bg-blue-900/20" },
                { text: "🎯 Adaptive paths when struggling detected", bg: "bg-purple-100 dark:bg-purple-900/20" }
              ].map((item, index) => (
                <div key={index} className={`px-4 py-2 rounded-full ${item.bg} text-sm font-medium`}>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}