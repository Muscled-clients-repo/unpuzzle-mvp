"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Video,
  MessageCircle,
  Clock,
  User,
  AlertCircle,
  Brain,
  Send,
  ChevronRight,
  Sparkles,
  History,
  TrendingUp
} from "lucide-react"
import Link from "next/link"

export default function RespondToConfusionPage() {
  const params = useParams()
  const router = useRouter()
  const confusionId = params.id as string
  const { pendingConfusions, courseAnalytics, similarConfusions, respondToConfusion, loadInstructorData } = useAppStore()
  const [response, setResponse] = useState("")
  const [aiSuggestion, setAiSuggestion] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadInstructorData()
    // Simulate AI suggestion
    setTimeout(() => {
      setAiSuggestion("The useCallback hook needs a dependency array because React uses it to determine when to recreate the memoized function. Without dependencies, the function would be recreated on every render, defeating the purpose of memoization. The dependencies tell React: 'Only create a new version of this function if one of these values changes.'")
    }, 1000)
  }, [loadInstructorData])

  const confusion = pendingConfusions.find(c => c.id === confusionId)
  
  if (!confusion) {
    return <div>Loading confusion details...</div>
  }

  const course = courseAnalytics.find(c => c.courseId === confusion.courseId)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    respondToConfusion(confusionId, response)
    router.push('/instructor')
  }

  const handleUseAiSuggestion = () => {
    setResponse(aiSuggestion)
  }

  // Use similarConfusions from store (extended for display)
  const extendedSimilarConfusions = [
    { student: "John Doe", time: "3 days ago", message: "Why can't I just use a regular function instead of useCallback?", resolved: true },
    { student: "Jane Smith", time: "1 week ago", message: "What's the difference between useMemo and useCallback?", resolved: true },
    { student: "Bob Wilson", time: "2 weeks ago", message: "When should I use useCallback vs useEffect?", resolved: true }
  ]

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/instructor" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/instructor/confusions" className="hover:text-foreground">Confusions</Link>
        <ChevronRight className="h-4 w-4" />
        <span>Respond</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Confusion Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Student Confusion</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course?.courseName}
                  </p>
                </div>
                <Badge variant={confusion.priority === 'high' ? 'destructive' : 'secondary'}>
                  {confusion.priority} priority
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Student Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{confusion.studentName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{confusion.timestamp}</span>
                  </div>
                </div>

                {/* Video Context */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Timestamp: {confusion.videoTime}</span>
                </div>

                {/* Confusion Message */}
                <div className="p-4 bg-background border rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Student&apos;s Question:</p>
                      <p>{confusion.message}</p>
                    </div>
                  </div>
                </div>

                {/* Video Transcript Context */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Video Transcript at {confusion.videoTime}:</p>
                  <p className="text-sm italic">
                    &quot;...the handleUpdate function is being recreated on every render. To fix this performance issue, 
                    we wrap it with useCallback. This ensures the function reference stays the same between renders 
                    unless its dependencies change...&quot;
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Response</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="compose">
                <TabsList className="mb-4">
                  <TabsTrigger value="compose">Compose</TabsTrigger>
                  <TabsTrigger value="ai-suggestion">AI Suggestion</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="space-y-4">
                  <Textarea
                    placeholder="Type your response to the student's confusion..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="min-h-[200px]"
                  />
                  
                  {response && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Estimated read time: {Math.ceil(response.split(' ').length / 200)} min
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ai-suggestion" className="space-y-4">
                  {aiSuggestion ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-medium mb-2">AI Suggested Response:</p>
                            <p className="text-sm">{aiSuggestion}</p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleUseAiSuggestion} className="w-full">
                        Use This Response
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p>Generating AI suggestion...</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setResponse("Great question! Let me clarify this concept for you...")}
                    >
                      Clarification Template
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setResponse("I understand your confusion. Here's another way to think about it...")}
                    >
                      Alternative Explanation
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setResponse("You're on the right track! The key thing to understand is...")}
                    >
                      Encouragement + Explanation
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 mt-6">
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={!response || isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Response
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => router.push('/instructor')}>
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Student Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Learn Rate</span>
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">42 min/hr</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium">67%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Confusions</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium">2.5 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Similar Confusions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Similar Past Confusions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {similarConfusions.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.student}</span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.message}</p>
                    {item.resolved && (
                      <Badge variant="secondary" className="text-xs">Resolved</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Today&apos;s Responses</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium text-green-500">1.8 hrs</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Satisfaction Rate</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium">96%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}