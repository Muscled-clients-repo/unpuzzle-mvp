"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageCircle, 
  Clock, 
  User,
  AlertCircle,
  Send,
  ChevronRight,
  Sparkles,
  Shield,
  Video,
  Hash,
  TrendingUp,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default function ModeratorRespondPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  const { 
    moderationQueue, 
    submitResponse,
    escalateToInstructor
  } = useAppStore()
  const { profile } = useAppStore()
  
  const [response, setResponse] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalationReason, setEscalationReason] = useState("")

  const item = moderationQueue.find(q => q.id === itemId)
  
  if (!item) {
    return <div>Loading...</div>
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    submitResponse(itemId, response)
    router.push('/moderate')
  }

  const handleEscalate = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    escalateToInstructor(itemId, escalationReason)
    router.push('/moderate')
  }

  // AI suggestions based on type
  const aiSuggestions = item.type === 'confusion' ? [
    "Break down the concept into smaller, digestible parts",
    "Provide a simple analogy or real-world example",
    "Reference the specific video timestamp for review",
    "Suggest additional resources or practice exercises"
  ] : [
    "Acknowledge their insight and expand on it",
    "Connect their reflection to broader concepts",
    "Provide encouragement and validation",
    "Suggest next steps for deeper understanding"
  ]

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/moderator" className="hover:text-foreground">Moderator Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span>Respond to {item.type}</span>
      </div>

      {/* Moderator Badge */}
      <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            You&apos;re responding as a <strong>Trusted Moderator</strong>. 
            Your response will be visible to the student and may be endorsed by instructors.
          </span>
          <Badge className="ml-4">
            Trust Score: {profile?.moderatorStats?.trustScore || 85}/100
          </Badge>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question/Reflection Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="capitalize">Student {item.type}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.courseName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={item.type === 'confusion' ? 'destructive' : 'secondary'}>
                    {item.type}
                  </Badge>
                  <Badge variant={
                    item.priority === 'high' ? 'destructive' : 
                    item.priority === 'medium' ? 'default' : 
                    'secondary'
                  }>
                    {item.priority} priority
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Student Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.studentName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>

                {/* Video Context */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Video timestamp: {item.videoTime}</span>
                </div>

                {/* Content */}
                <div className="p-4 bg-background border rounded-lg">
                  <div className="flex items-start gap-3">
                    {item.type === 'confusion' ? (
                      <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium mb-1">
                        {item.type === 'confusion' ? "Student's Question:" : "Student's Reflection:"}
                      </p>
                      <p>{item.content}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Writing Tips */}
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">AI Writing Tips:</p>
                  <ul className="text-sm space-y-1">
                    {aiSuggestions.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>

              <Textarea
                placeholder={
                  item.type === 'confusion' 
                    ? "Help the student understand this concept..."
                    : "Acknowledge and expand on their reflection..."
                }
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-[200px]"
              />

              {/* Quick Templates */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setResponse(
                    item.type === 'confusion'
                      ? "Great question! Let me help clarify this concept for you...\n\n"
                      : "Excellent reflection! You've made an important connection here...\n\n"
                  )}
                >
                  Use Template
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setResponse(prev => prev + "\n\nFeel free to ask follow-up questions if anything is still unclear!")}
                >
                  Add Closing
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={!response || isSubmitting}
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Response
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowEscalate(!showEscalate)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Escalate to Instructor
                </Button>
              </div>

              {/* Escalation Form */}
              {showEscalate && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium mb-2">Why does this need instructor attention?</p>
                    <Textarea
                      placeholder="This question requires deep expertise / Contains potential misinformation / Student seems very frustrated..."
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      className="mb-3"
                    />
                    <Button 
                      onClick={handleEscalate}
                      disabled={!escalationReason || isSubmitting}
                      variant="destructive"
                      className="w-full"
                    >
                      Escalate to Instructor
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(profile?.moderatorStats?.specialization || ['React', 'JavaScript', 'CSS']).map(spec => (
                  <Badge key={spec} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                You&apos;re qualified to answer questions in these areas
              </p>
            </CardContent>
          </Card>

          {/* Response Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Be encouraging and supportive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Reference specific video content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Provide clear, simple explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Don&apos;t guess if unsure - escalate instead</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Avoid overly technical jargon</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Responses Today</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium text-green-500">12 mins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Helpful Rate</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium">94%</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Weekly Rank</span>
                  <span className="font-medium">#7</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}