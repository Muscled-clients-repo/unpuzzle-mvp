"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { 
  Play, 
  Brain, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Sparkles,
  Clock,
  Target,
  Award,
  Video,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  BookOpen,
  BarChart3,
  Heart,
  Share2,
  Hash,
  Trophy,
  Flame
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function AlternativeHomePage() {
  const [selectedFeature, setSelectedFeature] = useState("ai-segments")

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section - Focused on the Core Innovation */}
        <section className="relative bg-gradient-to-b from-background to-primary/5 py-20 overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-100/[0.03] dark:bg-grid-slate-700/[0.03]" />
          <div className="container relative px-4">
            <div className="mx-auto max-w-4xl text-center">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <Star className="h-4 w-4" />
                Founding Member Access - First 50 Students
              </div>
              
              <h1 className="mb-6 text-5xl md:text-6xl font-bold tracking-tight">
                Never Get Stuck on a
                <span className="block mt-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Video Lesson Again
                </span>
              </h1>
              
              <p className="mb-8 text-xl text-muted-foreground max-w-3xl mx-auto">
                Select any confusing segment, get instant AI explanations. See exactly where others struggled. 
                Track your real learning velocity, not just watch time.
              </p>
              
              {/* Key Metrics */}
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">89%</div>
                  <div className="text-sm text-muted-foreground">Complete Courses</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">3.2x</div>
                  <div className="text-sm text-muted-foreground">Faster Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">AI + Instructor</div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/#pricing">
                    Start Learning Smarter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/preview">
                    Try One Lesson Free
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Live Activity Ticker */}
        <section className="border-y bg-muted/30 py-3">
          <div className="container px-4">
            <div className="flex items-center gap-6 overflow-x-auto">
              <Badge variant="secondary" className="animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                LIVE
              </Badge>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Sarah just resolved her confusion at 3:45 in "React Hooks"</span>
                <span>•</span>
                <span>Mike's reflection on "CSS Grid" was endorsed by instructor</span>
                <span>•</span>
                <span>12 learners struggling with "Async/Await" right now</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Features Showcase */}
        <section className="py-20">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Learning That Actually Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We rebuilt online learning from first principles. Every feature is designed to ensure you understand, not just watch.
              </p>
            </div>

            {/* Feature Selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {[
                { id: "ai-segments", label: "AI Segment Help", icon: Brain },
                { id: "community", label: "Live Community", icon: Users },
                { id: "metrics", label: "Performance Metrics", icon: BarChart3 },
                { id: "reflections", label: "Validated Learning", icon: CheckCircle }
              ].map((feature) => (
                <Button
                  key={feature.id}
                  variant={selectedFeature === feature.id ? "default" : "outline"}
                  onClick={() => setSelectedFeature(feature.id)}
                  className="gap-2"
                >
                  <feature.icon className="h-4 w-4" />
                  {feature.label}
                </Button>
              ))}
            </div>

            {/* Feature Details */}
            <div className="max-w-5xl mx-auto">
              {/* AI Segment Help */}
              {selectedFeature === "ai-segments" && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-8 flex flex-col justify-center">
                        <Badge className="w-fit mb-4">Revolutionary Feature</Badge>
                        <h3 className="text-2xl font-bold mb-4">
                          Select. Ask. Understand.
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Confused by something in a video? Select that exact segment (like 2:30-3:15) 
                          and ask AI to explain it differently. No more rewinding and hoping to understand.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                              <Video className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Timestamp: 12:30 - 14:45</p>
                              <p className="text-sm text-muted-foreground">Select any portion of the video</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                              <Brain className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">Ask: "Why useCallback here?"</p>
                              <p className="text-sm text-muted-foreground">Get instant contextual explanation</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">89 others found this helpful</p>
                              <p className="text-sm text-muted-foreground">Learn from community insights</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-8 border-l">
                        <div className="space-y-4">
                          <div className="bg-background rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Video className="h-4 w-4" />
                              <span>React Hooks Deep Dive • 12:30-14:45</span>
                            </div>
                            <div className="bg-muted rounded p-3 text-sm italic mb-3">
                              "...the handleUpdate function is being recreated on every render. 
                              To fix this performance issue, we wrap it with useCallback..."
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3">
                              <p className="text-sm font-medium mb-1">Your Question:</p>
                              <p className="text-sm">Why do we need useCallback here? What happens without it?</p>
                            </div>
                          </div>
                          <div className="bg-primary/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">AI Response</span>
                            </div>
                            <p className="text-sm">
                              Without useCallback, the function recreates on every render, 
                              causing all child components to re-render unnecessarily...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Community Learning */}
              {selectedFeature === "community" && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-8 flex flex-col justify-center">
                        <Badge className="w-fit mb-4">Never Learn Alone</Badge>
                        <h3 className="text-2xl font-bold mb-4">
                          See Exactly Where Others Struggle
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Every confusion, reflection, and breakthrough is timestamped to the exact video moment. 
                          Learn from others' questions and insights at the precise point you need them.
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                              <div>
                                <p className="text-sm font-medium">87 learners confused here</p>
                                <p className="text-xs text-muted-foreground">CSS Grid • 5:20</p>
                              </div>
                            </div>
                            <Badge variant="secondary">Resolved</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <MessageCircle className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium">Great insight shared</p>
                                <p className="text-xs text-muted-foreground">React Hooks • 9:02</p>
                              </div>
                            </div>
                            <Badge>Endorsed</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Flame className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium">23 struggling now</p>
                                <p className="text-xs text-muted-foreground">Async/Await • 15:00</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">Help</Button>
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-8 border-l">
                        <h4 className="font-semibold mb-4">Live Activity Feed</h4>
                        <div className="space-y-3">
                          {[
                            { type: "confusion", user: "Alex K.", time: "2:05", video: "UseEffect Hook", activity: "Why does it run twice?" },
                            { type: "reflection", user: "Sarah C.", time: "9:02", video: "CSS Grid", activity: "Grid template areas = visual layouts!" },
                            { type: "annotation", user: "Dr. Chen", time: "14:50", video: "Neural Networks", activity: "Key concept: ReLU enables non-linearity" },
                            { type: "breakthrough", user: "Mike R.", time: "7:25", video: "Promises", activity: "Finally understood callback hell!" }
                          ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                              <div className={cn(
                                "h-2 w-2 rounded-full mt-1.5",
                                item.type === "confusion" && "bg-orange-500",
                                item.type === "reflection" && "bg-blue-500",
                                item.type === "annotation" && "bg-purple-500",
                                item.type === "breakthrough" && "bg-green-500"
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.user}</span>
                                  <Badge variant="outline" className="text-xs">{item.time}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{item.video}</p>
                                <p className="text-sm mt-1">{item.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Metrics */}
              {selectedFeature === "metrics" && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-8 flex flex-col justify-center">
                        <Badge className="w-fit mb-4">Quantified Progress</Badge>
                        <h3 className="text-2xl font-bold mb-4">
                          Measure Real Learning, Not Watch Time
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Track your actual learning velocity with three key metrics that matter. 
                          Compare with peers, join competitions, and prove your understanding.
                        </p>
                        <div className="space-y-4">
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-blue-500" />
                                <span className="font-medium">Learn Rate</span>
                              </div>
                              <span className="text-2xl font-bold">42 min/hr</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Active learning time per hour (not passive watching)
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                <span className="font-medium">Execution Pace</span>
                              </div>
                              <span className="text-2xl font-bold">38s</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Average response time to learning prompts
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-green-500" />
                                <span className="font-medium">Execution Rate</span>
                              </div>
                              <span className="text-2xl font-bold">89%</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Percentage of activities completed successfully
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-8 border-l">
                        <h4 className="font-semibold mb-4">Leaderboard</h4>
                        <div className="space-y-2">
                          {[
                            { rank: 1, name: "Sarah Chen", metric: 52, trend: "up" },
                            { rank: 2, name: "Mike Johnson", metric: 48, trend: "stable" },
                            { rank: 3, name: "Emma Davis", metric: 45, trend: "up" },
                            { rank: 4, name: "Alex Kim", metric: 44, trend: "down" },
                            { rank: 12, name: "You", metric: 38, trend: "up", isYou: true }
                          ].map((entry) => (
                            <div 
                              key={entry.rank} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg",
                                entry.isYou ? "bg-primary/10 border border-primary/20" : "bg-background"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "text-lg font-bold w-8 text-center",
                                  entry.rank === 1 && "text-yellow-500",
                                  entry.rank === 2 && "text-gray-400",
                                  entry.rank === 3 && "text-orange-600"
                                )}>
                                  {entry.rank}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{entry.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.metric} min/hr learn rate
                                  </p>
                                </div>
                              </div>
                              {entry.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {entry.trend === "down" && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                            </div>
                          ))}
                        </div>
                        <Button className="w-full mt-4" variant="outline">
                          View Full Leaderboard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validated Learning */}
              {selectedFeature === "reflections" && (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-8 flex flex-col justify-center">
                        <Badge className="w-fit mb-4">Prove Understanding</Badge>
                        <h3 className="text-2xl font-bold mb-4">
                          Instructor-Validated Learning
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Submit reflections on what you learned. Get personal feedback from instructors. 
                          Build a portfolio of validated understanding that employers trust.
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <MessageCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Submit Your Reflection</p>
                              <p className="text-sm text-muted-foreground">
                                Explain what you learned in your own words
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Instructor Reviews</p>
                              <p className="text-sm text-muted-foreground">
                                Get personalized feedback within 24 hours
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Award className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Verified Certificate</p>
                              <p className="text-sm text-muted-foreground">
                                Prove real understanding, not just completion
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-8 border-l">
                        <h4 className="font-semibold mb-4">Example Reflection</h4>
                        <div className="space-y-4">
                          <div className="bg-background rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">CSS Grid Lesson</Badge>
                              <span className="text-xs text-muted-foreground">2 days ago</span>
                            </div>
                            <p className="text-sm mb-3">
                              "I learned that CSS Grid is like a spreadsheet where you can place items 
                              in specific cells. The grid-template-areas property lets me visually design 
                              layouts using ASCII art, which makes responsive design intuitive..."
                            </p>
                            <div className="border-t pt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Instructor Reviewed
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground italic">
                                "Excellent understanding! Your spreadsheet analogy is spot-on. 
                                Consider also how Grid differs from Flexbox for 2D layouts." - Sarah Chen
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Real Results From Real Learners</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join thousands who've transformed their learning journey
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm mb-4">
                    "The segment selection feature is a game-changer. I can finally get help 
                    on the exact part I don't understand without rewatching entire videos."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div>
                      <p className="font-medium text-sm">Sarah Martinez</p>
                      <p className="text-xs text-muted-foreground">Completed React Course</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm mb-4">
                    "Seeing where others get confused makes me feel less alone. The community 
                    insights at each timestamp are incredibly valuable."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div>
                      <p className="font-medium text-sm">Mike Chen</p>
                      <p className="text-xs text-muted-foreground">Learning Machine Learning</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm mb-4">
                    "The performance metrics keep me motivated. I can see my learn rate improving 
                    week by week. It's like having a fitness tracker for learning!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div>
                      <p className="font-medium text-sm">Emma Wilson</p>
                      <p className="text-xs text-muted-foreground">Top 5% Learn Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-20">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Start Your Transformation Today
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join the first 50 founding members and get lifetime access to all features
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="relative">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">Course Access</h3>
                    <div className="text-3xl font-bold mb-4">$39<span className="text-lg font-normal">/mo</span></div>
                    <ul className="space-y-2 text-sm text-left mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Full course videos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>10 AI interactions daily</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>View community insights</span>
                      </li>
                    </ul>
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/#pricing">Get Started</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative border-primary">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">MOST POPULAR</Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">Full Experience</h3>
                    <div className="text-3xl font-bold mb-4">$97<span className="text-lg font-normal">/mo</span></div>
                    <ul className="space-y-2 text-sm text-left mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">Unlimited AI help</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">Weekly instructor review</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">24hr confusion response</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Performance tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Verified certificate</span>
                      </li>
                    </ul>
                    <Button className="w-full" asChild>
                      <Link href="/#pricing">Get Full Access</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm text-muted-foreground">
                🎁 <strong>Bonus:</strong> Try one complete lesson free before you buy
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}