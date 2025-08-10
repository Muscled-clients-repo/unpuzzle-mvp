"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockUsers, mockCourses } from "@/data/mock"
import { 
  Users,
  Flame,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Heart,
  Clock,
  AlertCircle,
  Zap,
  BookOpen,
  Brain,
  Target,
  Trophy,
  ArrowUp,
  Video,
  HelpCircle,
  ChevronRight,
  Activity,
  Lightbulb,
  UserPlus,
  Share2
} from "lucide-react"
import Link from "next/link"

// Mock data for community features
const struggleZones = [
  {
    id: "1",
    topic: "CSS Grid Layout",
    course: "Web Development",
    activeCount: 87,
    lastHour: 23,
    difficulty: 85,
    topHelpers: ["Sarah M.", "Mike R."],
    aiSuggestion: "Many learners find visual guides helpful for Grid"
  },
  {
    id: "2",
    topic: "Gradient Descent",
    course: "Machine Learning",
    activeCount: 45,
    lastHour: 15,
    difficulty: 92,
    topHelpers: ["Dr. Chen", "Alex K."],
    aiSuggestion: "Breaking down the math step-by-step helps most"
  },
  {
    id: "3", 
    topic: "Async/Await",
    course: "JavaScript Fundamentals",
    activeCount: 34,
    lastHour: 12,
    difficulty: 78,
    topHelpers: ["James L.", "Emma W."],
    aiSuggestion: "Real-world examples make this concept clearer"
  }
]

const studyCircles = [
  {
    id: "1",
    name: "Night Owls - Web Dev",
    members: 8,
    maxMembers: 10,
    topic: "Building Responsive Layouts",
    nextSession: "Tonight 10 PM",
    learnRate: 45,
    status: "active"
  },
  {
    id: "2",
    name: "ML Morning Crew",
    members: 6,
    maxMembers: 8,
    topic: "Neural Networks",
    nextSession: "Tomorrow 7 AM",
    learnRate: 38,
    status: "enrolling"
  },
  {
    id: "3",
    name: "Weekend Warriors",
    members: 12,
    maxMembers: 12,
    topic: "Full Stack Project",
    nextSession: "Saturday 2 PM",
    learnRate: 52,
    status: "full"
  }
]

const reflections = [
  {
    id: "1",
    author: "Sarah Martinez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    course: "Web Development",
    lesson: "CSS Grid",
    content: "Finally understood Grid after struggling for days! The key was realizing that grid-template-areas lets you visually design your layout. It's like drawing with ASCII art!",
    likes: 234,
    replies: 18,
    timeAgo: "2 hours ago",
    aiHighlight: "Breakthrough insight about visual thinking",
    instructorFeatured: true
  },
  {
    id: "2",
    author: "Mike Rodriguez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    course: "Machine Learning",
    lesson: "Backpropagation",
    content: "The 'chain rule' finally clicked when I thought of it like dominoes falling backward. Each derivative passes its effect to the previous layer.",
    likes: 189,
    replies: 24,
    timeAgo: "4 hours ago",
    aiHighlight: "Excellent analogy for complex concept"
  },
  {
    id: "3",
    author: "Emma Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    course: "Data Science",
    lesson: "Data Cleaning",
    content: "Spent 3 hours cleaning data, realized 80% of data science is janitor work 😅 But now I see why - garbage in, garbage out!",
    likes: 412,
    replies: 67,
    timeAgo: "6 hours ago",
    aiHighlight: "Realistic expectation setting"
  }
]

const breakthroughs = [
  {
    id: "1",
    author: "Alex Kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    journey: {
      struggle: "Couldn't understand closures for 2 weeks",
      tryCount: 47,
      breakthrough: "Realized closures are just functions with backpacks!",
      timeToSuccess: "14 days"
    },
    helpedBy: ["Community", "AI Hints"],
    nowHelping: 12
  },
  {
    id: "2",
    author: "Lisa Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    journey: {
      struggle: "Redux state management was a nightmare",
      tryCount: 31,
      breakthrough: "Drew the data flow on paper - suddenly it all made sense!",
      timeToSuccess: "8 days"
    },
    helpedBy: ["Study Circle", "Instructor"],
    nowHelping: 8
  }
]

const todaysChallenge = {
  title: "Collaborative CSS Grid Gallery",
  description: "Build a responsive photo gallery using CSS Grid. Work solo or join a team!",
  difficulty: "Medium",
  participants: 234,
  timeLeft: "18 hours",
  topSolutions: 12,
  aiHints: 3
}

export default function CommunityPage() {
  const learner = mockUsers.learners[0]
  
  // Get data from Zustand store
  const {
    struggleZones: storeStruggleZones,
    studyCircles: storeStudyCircles,
    reflections: storeReflections,
    breakthroughs: storeBreakthroughs,
    todaysChallenge,
    communityStats,
    activeTab,
    setActiveTab,
    joinStruggleZone,
    joinStudyCircle,
    likeReflection,
    joinChallenge,
    fetchCommunityData
  } = useAppStore()
  
  // Use store data if available, fallback to local mock data for now
  const struggleZonesData = storeStruggleZones.length > 0 ? storeStruggleZones : struggleZones
  const studyCirclesData = storeStudyCircles.length > 0 ? storeStudyCircles : studyCircles
  const reflectionsData = storeReflections.length > 0 ? storeReflections : reflections
  const breakthroughsData = storeBreakthroughs.length > 0 ? storeBreakthroughs : breakthroughs
  const todaysChallengeData = todaysChallenge || todaysChallenge
  
  // Get community stats from store
  const {
    totalActiveLearners,
    currentlyLearning,
    strugglesResolved,
    communityLearnRate
  } = communityStats
  
  // Fetch community data on mount
  useEffect(() => {
    fetchCommunityData()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      
      <div className="flex flex-1">
        <Sidebar role="learner" />
        
        <main className="flex-1 p-6 md:ml-64">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Community Learning Hub</h1>
            <p className="text-muted-foreground">
              Learn together, struggle together, breakthrough together
            </p>
          </div>

          {/* Live Community Pulse */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary animate-pulse" />
                  <h3 className="font-semibold">Community Pulse</h3>
                  <Badge variant="secondary" className="animate-pulse">LIVE</Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {currentlyLearning} learners active now
                </span>
              </div>
              
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalActiveLearners}</div>
                  <div className="text-xs text-muted-foreground">Total Active Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{communityLearnRate}%</div>
                  <div className="text-xs text-muted-foreground">Avg Learn Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{struggleZonesData.length}</div>
                  <div className="text-xs text-muted-foreground">Active Struggle Zones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{strugglesResolved}</div>
                  <div className="text-xs text-muted-foreground">Resolved Today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="struggles">Struggle Zones</TabsTrigger>
              <TabsTrigger value="circles">Study Circles</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
              <TabsTrigger value="breakthroughs">Breakthroughs</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Today's Challenge */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <CardTitle>Today's Community Challenge</CardTitle>
                      </div>
                      <Badge variant="outline">{todaysChallengeData?.timeLeft} left</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">{todaysChallengeData?.title}</h4>
                        <p className="text-sm text-muted-foreground">{todaysChallengeData?.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{todaysChallengeData?.participants} participating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span>{todaysChallengeData?.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <span>{todaysChallengeData?.aiHints} AI hints available</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button>Join Challenge</Button>
                        <Button variant="outline">View Solutions</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Struggle Zones */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <CardTitle>Hot Struggle Zones</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("struggles")}>
                        View All
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {struggleZonesData.slice(0, 3).map((zone) => (
                        <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{zone.topic}</span>
                              <Badge variant="destructive" className="text-xs">
                                {zone.activeCount} struggling
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{zone.course}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <HelpCircle className="mr-1 h-3 w-3" />
                            Help
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Study Circles */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <CardTitle>Study Circles</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("circles")}>
                        View All
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studyCirclesData.slice(0, 3).map((circle) => (
                        <div key={circle.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{circle.name}</span>
                            <Badge variant={circle.status === "full" ? "secondary" : "default"}>
                              {circle.members}/{circle.maxMembers}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{circle.topic}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {circle.nextSession}
                            </span>
                            <Button size="sm" variant="outline" disabled={circle.status === "full"}>
                              {circle.status === "full" ? "Full" : "Join"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Breakthroughs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Recent Breakthrough Moments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {breakthroughsData.map((breakthrough) => (
                      <div key={breakthrough.id} className="p-4 rounded-lg border bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={breakthrough.avatar} />
                            <AvatarFallback>{breakthrough.author[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{breakthrough.author}</div>
                            <div className="text-xs text-muted-foreground">After {breakthrough.journey.timeToSuccess}</div>
                          </div>
                          <Zap className="h-5 w-5 text-yellow-500" />
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                            <span className="text-muted-foreground">{breakthrough.journey.struggle}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="font-medium">{breakthrough.journey.breakthrough}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>{breakthrough.journey.tryCount} attempts</span>
                          <span>Now helping {breakthrough.nowHelping} others</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Struggle Zones Tab */}
            <TabsContent value="struggles" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Struggle Zones</CardTitle>
                  <CardDescription>
                    Real-time areas where learners need help. Your assistance can make the difference!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {struggleZonesData.map((zone) => (
                      <Card key={zone.id} className="border-orange-200 dark:border-orange-800/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{zone.topic}</h4>
                                <Badge variant="destructive">
                                  <Flame className="mr-1 h-3 w-3" />
                                  {zone.activeCount} active
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{zone.course}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">Difficulty</div>
                              <Progress value={zone.difficulty} className="w-20 h-2 mt-1" />
                            </div>
                          </div>
                          
                          <div className="grid gap-3 md:grid-cols-2 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{zone.lastHour} joined in last hour</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Top helpers: {zone.topHelpers.join(", ")}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20 mb-3">
                            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-blue-900 dark:text-blue-100">
                              AI Tip: {zone.aiSuggestion}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button className="flex-1">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Join Struggle Room
                            </Button>
                            <Button variant="outline">
                              <Share2 className="mr-2 h-4 w-4" />
                              Share Solution
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Study Circles Tab */}
            <TabsContent value="circles" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Study Circles</CardTitle>
                      <CardDescription>
                        AI-matched study groups based on your pace and current topics
                      </CardDescription>
                    </div>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Circle
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {studyCirclesData.map((circle) => (
                      <Card key={circle.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-sm">{circle.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{circle.topic}</p>
                            </div>
                            <Badge variant={
                              circle.status === "active" ? "default" :
                              circle.status === "full" ? "secondary" : "outline"
                            }>
                              {circle.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Members</span>
                              <span className="font-medium">{circle.members}/{circle.maxMembers}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Avg Learn Rate</span>
                              <span className="font-medium text-green-600">{circle.learnRate}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Next Session</span>
                              <span className="font-medium">{circle.nextSession}</span>
                            </div>
                          </div>
                          
                          <div className="flex -space-x-2 mb-3">
                            {[1, 2, 3, 4].map((i) => (
                              <Avatar key={i} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                                <AvatarFallback>U</AvatarFallback>
                              </Avatar>
                            ))}
                            {circle.members > 4 && (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                                +{circle.members - 4}
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            className="w-full" 
                            variant={circle.status === "full" ? "secondary" : "default"}
                            disabled={circle.status === "full"}
                          >
                            {circle.status === "full" ? "Circle Full" : 
                             circle.status === "active" ? "Join Session" : "Request to Join"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reflections Tab */}
            <TabsContent value="reflections" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reflection Wall</CardTitle>
                  <CardDescription>
                    Shared insights and "aha!" moments from the community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reflectionsData.map((reflection) => (
                      <Card key={reflection.id} className={reflection.instructorFeatured ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          {reflection.instructorFeatured && (
                            <Badge className="mb-2" variant="default">
                              <Trophy className="mr-1 h-3 w-3" />
                              Instructor Featured
                            </Badge>
                          )}
                          
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar>
                              <AvatarImage src={reflection.avatar} />
                              <AvatarFallback>{reflection.author[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{reflection.author}</span>
                                <span className="text-xs text-muted-foreground">{reflection.timeAgo}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reflection.course} • {reflection.lesson}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm mb-3">{reflection.content}</p>
                          
                          {reflection.aiHighlight && (
                            <div className="flex items-center gap-2 p-2 rounded bg-primary/5 mb-3">
                              <Brain className="h-4 w-4 text-primary" />
                              <span className="text-xs text-primary">
                                AI Insight: {reflection.aiHighlight}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm">
                              <Heart className="mr-1 h-4 w-4" />
                              {reflection.likes}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageCircle className="mr-1 h-4 w-4" />
                              {reflection.replies}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Breakthroughs Tab */}
            <TabsContent value="breakthroughs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Breakthrough Stories</CardTitle>
                  <CardDescription>
                    From struggle to success - inspiring journeys from our community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {breakthroughsData.map((story) => (
                      <div key={story.id} className="relative">
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-green-500" />
                        
                        <div className="space-y-4">
                          {/* Struggle Phase */}
                          <div className="flex gap-4">
                            <div className="relative z-10 h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-white" />
                            </div>
                            <Card className="flex-1 border-orange-200 dark:border-orange-800/50">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={story.avatar} />
                                    <AvatarFallback>{story.author[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{story.author}</div>
                                    <div className="text-xs text-muted-foreground">Struggled for {story.journey.timeToSuccess}</div>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{story.journey.struggle}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <Badge variant="outline">{story.journey.tryCount} attempts</Badge>
                                  <Badge variant="outline">Helped by: {story.helpedBy.join(", ")}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Breakthrough Phase */}
                          <div className="flex gap-4">
                            <div className="relative z-10 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-white" />
                            </div>
                            <Card className="flex-1 border-green-200 dark:border-green-800/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Lightbulb className="h-5 w-5 text-green-600" />
                                  <span className="font-semibold text-sm">Breakthrough Moment!</span>
                                </div>
                                <p className="text-sm font-medium">{story.journey.breakthrough}</p>
                                <div className="flex items-center gap-2 mt-3">
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                    Now helping {story.nowHelping} others
                                  </Badge>
                                  <Button size="sm" variant="outline">
                                    <MessageCircle className="mr-1 h-3 w-3" />
                                    Ask for Help
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Floating Action - Who's Learning Now */}
          <Card className="mt-6 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary animate-pulse" />
                  <span className="font-semibold">Who's Learning Now</span>
                  <Badge variant="secondary" className="animate-pulse">LIVE</Badge>
                </div>
                <Button variant="ghost" size="sm">
                  <Users className="mr-1 h-4 w-4" />
                  Join Someone
                </Button>
              </div>
              
              <ScrollArea className="h-20">
                <div className="flex gap-3">
                  {[
                    { name: "Sarah", topic: "CSS Grid", course: "Web Dev", time: "2 min ago" },
                    { name: "Mike", topic: "Neural Networks", course: "ML", time: "5 min ago" },
                    { name: "Emma", topic: "React Hooks", course: "React", time: "8 min ago" },
                    { name: "Alex", topic: "Python Basics", course: "Python", time: "12 min ago" },
                    { name: "Lisa", topic: "SQL Joins", course: "Database", time: "15 min ago" },
                  ].map((learner, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 min-w-[200px]">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.name}`} />
                        <AvatarFallback>{learner.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{learner.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {learner.topic} • {learner.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}