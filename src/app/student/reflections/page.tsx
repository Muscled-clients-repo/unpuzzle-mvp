import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mockUsers, mockCourses } from "@/data/mock"
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Star, 
  Play, 
  Calendar,
  User,
  Lightbulb,
  TrendingUp
} from "lucide-react"
import Link from "next/link"

export default function ReflectionsPage() {
  const learner = mockUsers.learners[0]
  
  // Mock reflections data
  const reflections = [
    {
      id: "reflection-1",
      courseId: "course-1",
      courseName: "Introduction to Web Development",
      videoId: "video-1-5",
      videoTitle: "Building Your First Website",
      type: "text" as const,
      prompt: "What was the most important thing you learned about HTML structure?",
      content: "I learned how to structure a website properly using HTML5 semantic elements like <header>, <nav>, <main>, and <footer>. This not only makes the code more readable but also improves accessibility for screen readers. The key insight was understanding that HTML is about meaning, not appearance - that's what CSS is for.",
      submittedAt: new Date("2024-02-05"),
      feedback: {
        from: "Sarah Chen",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        message: "Excellent reflection! You've grasped the fundamental concept perfectly. Try to also consider how semantic HTML helps with SEO - search engines use these elements to understand your content better.",
        rating: 4,
        givenAt: new Date("2024-02-06")
      },
      status: "reviewed"
    },
    {
      id: "reflection-2",
      courseId: "course-2", 
      courseName: "Machine Learning Fundamentals",
      videoId: "video-2-3",
      videoTitle: "Linear Regression Deep Dive",
      type: "text" as const,
      prompt: "How would you explain linear regression to someone who's never heard of it?",
      content: "Linear regression is like finding the best straight line through a cloud of data points. Imagine you're trying to predict house prices based on size - you'd draw a line that comes as close as possible to all the price/size points on a graph. The line helps you predict what a house might cost based on its size.",
      submittedAt: new Date("2024-02-03"),
      feedback: null,
      status: "pending"
    },
    {
      id: "reflection-3",
      courseId: "course-1",
      courseName: "Introduction to Web Development", 
      videoId: "video-1-3",
      videoTitle: "CSS Styling Basics",
      type: "text" as const,
      prompt: "What's the difference between Flexbox and Grid? When would you use each?",
      content: "Flexbox is great for one-dimensional layouts (either row or column), like navigation bars or centering items. Grid is better for two-dimensional layouts where you need to control both rows and columns, like complex page layouts or card grids.",
      submittedAt: new Date("2024-01-28"),
      feedback: {
        from: "Sarah Chen",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        message: "Good start! You understand the dimensional difference. Can you think of specific examples where Grid's two-dimensional control gives you advantages over Flexbox?",
        rating: 3,
        givenAt: new Date("2024-01-29")
      },
      status: "reviewed"
    }
  ]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reviewed":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
    }
  }

  const reviewed = reflections.filter(r => r.status === "reviewed")
  const pending = reflections.filter(r => r.status === "pending")

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      
      <div className="flex flex-1">
        <Sidebar role="learner" />
        
        <main className="flex-1 p-6 md:ml-64">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Reflections</h1>
            <p className="text-muted-foreground">
              Deepen your understanding through guided reflection prompts
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Reflections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reflections.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{reviewed.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pending.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <div className="text-2xl font-bold">3.5</div>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Reflections</TabsTrigger>
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-6">
                {reflections.map((reflection) => (
                  <Card key={reflection.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reflection.courseName}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(reflection.status)}`}>
                              {reflection.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{reflection.videoTitle}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted {formatDate(reflection.submittedAt)}</span>
                          </div>
                        </div>
                        
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <Link href={`/learn/course/${reflection.courseId}/video/${reflection.videoId}`}>
                            <Play className="mr-2 h-3 w-3" />
                            Watch
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Prompt */}
                      <div className="rounded-lg bg-muted p-4">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Reflection Prompt</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {reflection.prompt}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Student Response */}
                      <div className="rounded-lg border p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-2">Your Response</p>
                            <p className="text-sm leading-relaxed">
                              {reflection.content}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Instructor Feedback */}
                      {reflection.feedback ? (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reflection.feedback.avatar} />
                              <AvatarFallback>
                                {reflection.feedback.from.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium text-sm text-green-800 dark:text-green-200">
                                  {reflection.feedback.from}
                                </p>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= reflection.feedback!.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(reflection.feedback.givenAt)}
                                </span>
                              </div>
                              <p className="text-sm text-green-700 dark:text-green-300">
                                {reflection.feedback.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Waiting for instructor feedback
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <div className="space-y-6">
                {pending.length > 0 ? (
                  pending.map((reflection) => (
                    <Card key={reflection.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{reflection.courseName}</Badge>
                          <Badge className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                            Pending Review
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{reflection.videoTitle}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{reflection.prompt}</p>
                        <p className="text-sm bg-muted p-3 rounded-lg">
                          {reflection.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                      <p className="text-sm text-muted-foreground">
                        No reflections pending review
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviewed" className="mt-6">
              <div className="space-y-6">
                {reviewed.map((reflection) => (
                  <Card key={reflection.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{reflection.courseName}</Badge>
                        <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          Reviewed
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{reflection.videoTitle}</h3>
                      
                      {reflection.feedback && (
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= reflection.feedback!.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            by {reflection.feedback.from}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        {reflection.feedback?.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}