"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAppStore } from "@/stores/app-store"
import { mockUsers } from "@/data/mock"
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Star, 
  Calendar,
  User,
  Lightbulb
} from "lucide-react"

export default function ReflectionsPage() {
  const learner = mockUsers.learners[0]
  const { studentData, loadStudentData } = useAppStore()
  const { reflections } = studentData
  
  useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Unknown date'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
      case "confused":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400"
      case "neutral":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
    }
  }

  const reviewed = reflections.filter(r => r.aiResponse)
  const pending = reflections.filter(r => !r.aiResponse)

  return (
    <div className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Reflections</h1>
            <p className="text-muted-foreground">
              Deepen your understanding through guided reflection
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
                <CardTitle className="text-sm font-medium">With AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{reviewed.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pending.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Reflections</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewed">With Insights</TabsTrigger>
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
                              {reflection.courseTitle}
                            </Badge>
                            <Badge className={`text-xs ${getSentimentColor(reflection.sentiment)}`}>
                              {reflection.sentiment}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">Reflection on {reflection.courseTitle}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted {formatDate(reflection.date)}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Student Response */}
                      <div className="rounded-lg border p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-2">Your Reflection ({reflection.type})</p>
                            <p className="text-sm leading-relaxed">
                              {reflection.content}
                            </p>
                            {reflection.tags && reflection.tags.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {reflection.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Response */}
                      {reflection.aiResponse ? (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                                AI Insight
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                {reflection.aiResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
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
                      <CardHeader>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reflection.courseTitle}
                            </Badge>
                            <Badge className={`text-xs ${getSentimentColor(reflection.sentiment)}`}>
                              {reflection.sentiment}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">Reflection on {reflection.courseTitle}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted {formatDate(reflection.date)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border p-4">
                          <p className="text-sm leading-relaxed">{reflection.content}</p>
                          {reflection.tags && reflection.tags.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {reflection.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              AI insights will be available soon
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium">All caught up!</p>
                      <p className="text-sm text-muted-foreground">
                        All your reflections have AI insights
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviewed" className="mt-6">
              <div className="space-y-6">
                {reviewed.length > 0 ? (
                  reviewed.map((reflection) => (
                    <Card key={reflection.id}>
                      <CardHeader>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reflection.courseTitle}
                            </Badge>
                            <Badge className={`text-xs ${getSentimentColor(reflection.sentiment)}`}>
                              {reflection.sentiment}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">Reflection on {reflection.courseTitle}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted {formatDate(reflection.date)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border p-4">
                          <p className="text-sm leading-relaxed">{reflection.content}</p>
                          {reflection.tags && reflection.tags.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {reflection.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                                AI Insight
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                {reflection.aiResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium">No AI insights yet</p>
                      <p className="text-sm text-muted-foreground">
                        Submit reflections to receive AI-powered insights
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
    </div>
  )
}