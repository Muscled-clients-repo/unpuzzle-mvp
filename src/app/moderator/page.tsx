"use client"

import { useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Award,
  AlertCircle,
  CheckCircle,
  Users,
  Star,
  Zap,
  Trophy,
  Target,
  ArrowRight,
  Shield,
  Video
} from "lucide-react"
import Link from "next/link"

export default function ModerateDashboard() {
  const { 
    moderationQueue, 
    myAssignments,
    moderatorResponses,
    leaderboard,
    moderatorStats,
    loadModerationQueue,
    claimAssignment
  } = useAppStore()

  const { profile } = useAppStore()

  useEffect(() => {
    loadModerationQueue()
  }, [loadModerationQueue])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Moderator Dashboard</h1>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
              <Shield className="h-3 w-3 mr-1" />
              Trusted Helper
            </Badge>
          </div>
          <p className="text-muted-foreground">Help students while earning recognition</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Trust Score</p>
            <p className="text-2xl font-bold">{profile?.moderatorStats?.trustScore || 85}/100</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student">
              Back to Learning
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {moderatorStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderatorStats.totalPending}</div>
              <p className="text-xs text-muted-foreground">
                {moderatorStats.myPending} assigned to you
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderatorStats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">
                Target: under 30 mins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderatorStats.weeklyProgress}/{moderatorStats.weeklyGoal}</div>
              <Progress value={(moderatorStats.weeklyProgress / moderatorStats.weeklyGoal) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Helpful Votes</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.moderatorStats?.helpfulVotes || 167}</div>
              <p className="text-xs text-muted-foreground">
                +23 this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Endorsed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.moderatorStats?.endorsedByInstructor || 12}</div>
              <p className="text-xs text-muted-foreground">
                By instructors
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">
            Moderation Queue
            {moderationQueue.filter(q => q.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {moderationQueue.filter(q => q.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-assignments">
            My Assignments
            {myAssignments.length > 0 && (
              <Badge className="ml-2">{myAssignments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="responses">Recent Responses</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Available to Help</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">Filter by: Your Specializations</Badge>
                  <Button size="sm" variant="outline">All Topics</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {moderationQueue
                  .filter(q => q.status === 'pending')
                  .map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.type === 'confusion' ? 'destructive' : 'secondary'}>
                              {item.type}
                            </Badge>
                            <span className="font-medium">{item.studentName}</span>
                            <span className="text-sm text-muted-foreground">• {item.timestamp}</span>
                            <Badge variant="outline">{item.courseName}</Badge>
                          </div>
                          <p className="text-sm">{item.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Video className="h-3 w-3" />
                            <span>at {item.videoTime}</span>
                            {item.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge 
                            variant={
                              item.priority === 'high' ? 'destructive' : 
                              item.priority === 'medium' ? 'default' : 
                              'secondary'
                            }
                          >
                            {item.priority} priority
                          </Badge>
                          <Button 
                            size="sm"
                            onClick={() => claimAssignment(item.id)}
                          >
                            Help Student
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Active Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {myAssignments.length > 0 ? (
                <div className="space-y-4">
                  {myAssignments.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">In Review</Badge>
                            <span className="font-medium">{item.studentName}</span>
                            <span className="text-sm text-muted-foreground">• {item.timestamp}</span>
                          </div>
                          <p className="text-sm">{item.content}</p>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/moderate/respond/${item.id}`}>
                            Continue Response
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No active assignments. Check the queue to help students!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Moderator Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {moderatorResponses.map((response) => (
                  <div key={response.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{response.moderatorName}</span>
                          {response.endorsedByInstructor && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Instructor Endorsed
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">• {response.timestamp}</span>
                        </div>
                        <p className="text-sm bg-muted p-3 rounded-md">{response.response}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <Star className="h-4 w-4" />
                            <span>{response.helpfulVotes} found helpful</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Top Moderators This Week</CardTitle>
                <Badge variant="outline">
                  <Trophy className="h-3 w-3 mr-1" />
                  Weekly Competition
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((moderator) => (
                  <div 
                    key={moderator.moderatorId}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      moderator.rank === 1 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      moderator.rank === 2 ? 'bg-gray-50 dark:bg-gray-950/20' :
                      moderator.rank === 3 ? 'bg-orange-50 dark:bg-orange-950/20' :
                      'bg-muted'
                    } border`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-bold ${
                        moderator.rank === 1 ? 'text-yellow-600' :
                        moderator.rank === 2 ? 'text-gray-600' :
                        moderator.rank === 3 ? 'text-orange-600' :
                        'text-muted-foreground'
                      }`}>
                        #{moderator.rank}
                      </div>
                      <div>
                        <p className="font-medium">{moderator.moderatorName}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{moderator.responsesThisWeek} responses</span>
                          <span>• {moderator.avgResponseTime} avg</span>
                          <span>• {moderator.helpfulVotes} votes</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {moderator.specializations.map(spec => (
                            <Badge key={spec} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <span className="font-bold">{moderator.trustScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Trust Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rewards Section */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="font-medium">1st Place</p>
                  <p className="text-sm text-muted-foreground">1 Month Premium</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">2nd Place</p>
                  <p className="text-sm text-muted-foreground">2 Weeks Premium</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Trophy className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-medium">3rd Place</p>
                  <p className="text-sm text-muted-foreground">1 Week Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}