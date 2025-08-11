"use client"

import { useEffect, useState, useRef } from "react"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { mockUsers } from "@/data/mock"
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Zap,
  Clock,
  Target,
  Flame,
  Users,
  ArrowUp,
  ArrowDown,
  Activity,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Send,
  Hash,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Play,
  Search,
  Filter,
  ThumbsUp,
  Brain,
  Video
} from "lucide-react"

export default function CommunityPage() {
  const learner = mockUsers.learners[0]
  const [selectedMetric, setSelectedMetric] = useState<'learnRate' | 'executionPace' | 'executionRate'>('learnRate')
  const [newPostContent, setNewPostContent] = useState('')
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [aiInsightsFilter, setAiInsightsFilter] = useState('all')
  const [aiInsightsSearch, setAiInsightsSearch] = useState('')
  const [videoActivityCourse, setVideoActivityCourse] = useState('all')
  const [videoActivityType, setVideoActivityType] = useState('all') // all, confusions, reflections, annotations
  
  // Get data from Zustand store
  const {
    communityStats,
    leaderboard,
    posts,
    pinnedPosts,
    comments,
    activeTab,
    setActiveTab,
    likePost,
    unlikePost,
    commentOnPost,
    sharePost,
    createPost,
    fetchCommunityData
  } = useAppStore()
  
  // Fetch community data on mount
  useEffect(() => {
    fetchCommunityData()
  }, [fetchCommunityData])

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />
      default: return <Minus className="h-3 w-3 text-muted-foreground" />
    }
  }

  // Format metric values
  const formatMetric = (value: number, type: string) => {
    switch (type) {
      case 'learnRate': return `${value} min/hr`
      case 'executionPace': return `${value}s`
      case 'executionRate': return `${value}%`
      default: return value
    }
  }

  // Handle post creation
  const handleCreatePost = () => {
    if (newPostContent.trim()) {
      createPost({
        type: 'post',
        author: {
          id: learner.id,
          name: learner.name,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.name}`,
          role: 'learner',
          metrics: {
            learnRate: 38,
            executionPace: 45,
            executionRate: 82
          }
        },
        content: newPostContent,
        tags: []
      })
      setNewPostContent('')
      setIsCreatingPost(false)
    }
  }

  return (
    <div className="flex-1 p-6">
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1 max-w-4xl">
              {/* Header with Key Metrics */}
              <div className="mb-8">
                <h1 className="text-2xl font-semibold mb-4">Community Performance</h1>
                
                {/* Community Average Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Learn Rate</p>
                      <p className="text-xl font-semibold">{communityStats.communityLearnRate} min/hr</p>
                      <p className="text-xs text-muted-foreground mt-1">Active learning per hour</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Execution Pace</p>
                      <p className="text-xl font-semibold">{communityStats.avgExecutionPace}s</p>
                      <p className="text-xs text-muted-foreground mt-1">Response time to prompts</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Execution Rate</p>
                      <p className="text-xl font-semibold">{communityStats.avgExecutionRate}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Activities completed</p>
                    </div>
                    <Target className="h-8 w-8 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="newsfeed" className="text-xs">Newsfeed</TabsTrigger>
              <TabsTrigger value="video-activity" className="text-xs">Video Activity</TabsTrigger>
              <TabsTrigger value="ai-insights" className="text-xs">AI Insights</TabsTrigger>
              <TabsTrigger value="leaderboard" className="text-xs">Leaderboard</TabsTrigger>
            </TabsList>

            {/* Newsfeed Tab */}
            <TabsContent value="newsfeed" className="space-y-6 mt-6">
              {/* Create Post */}
              <Card className="border-muted">
                <CardContent className="p-4">
                  {!isCreatingPost ? (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => setIsCreatingPost(true)}
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.name}`} />
                        <AvatarFallback>{learner.name[0]}</AvatarFallback>
                      </Avatar>
                      Share your progress or ask a question...
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.name}`} />
                          <AvatarFallback>{learner.name[0]}</AvatarFallback>
                        </Avatar>
                        <textarea
                          className="flex-1 min-h-[100px] p-3 text-sm bg-transparent border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Share your progress, ask a question, or celebrate an achievement..."
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setIsCreatingPost(false)
                          setNewPostContent('')
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleCreatePost} disabled={!newPostContent.trim()}>
                          <Send className="h-4 w-4 mr-1" />
                          Post
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pinned Posts */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3">
                  {pinnedPosts.map((post) => (
                    <Card key={post.id} className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.author.avatar} />
                            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{post.author.name}</span>
                                {post.author.role === 'admin' && (
                                  <Badge variant="default" className="text-xs">Admin</Badge>
                                )}
                                {post.author.role === 'instructor' && (
                                  <Badge variant="secondary" className="text-xs">Instructor</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Pinned
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                            </div>
                            <p className="text-sm mb-3">{post.content}</p>
                            {post.tags && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {post.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Hash className="h-3 w-3 mr-0.5" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => 
                                  post.likedBy?.includes(learner.id) 
                                    ? unlikePost(post.id, learner.id)
                                    : likePost(post.id, learner.id)
                                }
                              >
                                <Heart className={`h-4 w-4 ${post.likedBy?.includes(learner.id) ? 'fill-current text-red-500' : ''}`} />
                                <span className="text-xs">{post.likes}</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 gap-1">
                                <MessageCircle className="h-4 w-4" />
                                <span className="text-xs">{post.comments}</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => sharePost(post.id)}>
                                <Share2 className="h-4 w-4" />
                                <span className="text-xs">{post.shares}</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Regular Posts */}
              <div className="space-y-4">
                {posts.filter(p => !p.isPinned).map((post) => (
                  <Card key={post.id} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{post.author.name}</span>
                              {post.author.role === 'instructor' && (
                                <Badge variant="secondary" className="text-xs">Instructor</Badge>
                              )}
                              {post.author.metrics && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{post.author.metrics.learnRate} min/hr</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                          </div>
                          
                          {/* Achievement Badge */}
                          {post.achievement && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-2">
                              <span className="text-lg">{post.achievement.icon}</span>
                              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                                {post.achievement.value}
                              </span>
                            </div>
                          )}
                          
                          {/* Post Type Icon */}
                          {post.type === 'question' && (
                            <div className="flex items-center gap-1 text-blue-600 mb-2">
                              <HelpCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Question</span>
                            </div>
                          )}
                          
                          <p className="text-sm mb-3">{post.content}</p>
                          
                          {post.course && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Related to: {post.course}
                            </p>
                          )}
                          
                          {post.tags && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Hash className="h-3 w-3 mr-0.5" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Comments Section */}
                          {post.type === 'question' && comments.filter(c => c.postId === post.id).length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {comments.filter(c => c.postId === post.id).slice(0, 2).map((comment) => (
                                <div key={comment.id} className="flex gap-2 text-sm">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={comment.author.avatar} />
                                    <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <span className="font-medium text-xs">{comment.author.name}</span>
                                    <p className="text-xs text-muted-foreground mt-0.5">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => 
                                post.likedBy?.includes(learner.id) 
                                  ? unlikePost(post.id, learner.id)
                                  : likePost(post.id, learner.id)
                              }
                            >
                              <Heart className={`h-4 w-4 ${post.likedBy?.includes(learner.id) ? 'fill-current text-red-500' : ''}`} />
                              <span className="text-xs">{post.likes}</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-1">
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-xs">{post.comments}</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => sharePost(post.id)}>
                              <Share2 className="h-4 w-4" />
                              <span className="text-xs">{post.shares}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Video Activity Tab */}
            <TabsContent value="video-activity" className="space-y-6 mt-6">
              {/* Filters */}
              <div className="flex gap-3">
                <select 
                  className="px-3 py-2 text-sm border rounded-md bg-transparent outline-none"
                  value={videoActivityCourse}
                  onChange={(e) => setVideoActivityCourse(e.target.value)}
                >
                  <option value="all">All Courses</option>
                  <option value="react">React Advanced</option>
                  <option value="ml">Machine Learning</option>
                  <option value="web-dev">Web Development</option>
                  <option value="python">Python Basics</option>
                  <option value="javascript">JavaScript Fundamentals</option>
                </select>
                
                <select 
                  className="px-3 py-2 text-sm border rounded-md bg-transparent outline-none"
                  value={videoActivityType}
                  onChange={(e) => setVideoActivityType(e.target.value)}
                >
                  <option value="all">All Activities</option>
                  <option value="confusions">Confusions Only</option>
                  <option value="reflections">Reflections Only</option>
                  <option value="annotations">Annotations Only</option>
                </select>
              </div>

              {/* Video Activities List */}
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    type: "confusion",
                    user: "Alex Kim",
                    avatar: "Alex",
                    course: "React Advanced",
                    video: "UseEffect Deep Dive",
                    timestamp: 125, // seconds
                    timeDisplay: "2:05",
                    content: "Why does useEffect run twice in strict mode? Is this a bug?",
                    replies: 5,
                    resolved: true,
                    postedAt: "2 hours ago"
                  },
                  {
                    id: 2,
                    type: "reflection",
                    user: "Sarah Chen",
                    avatar: "Sarah",
                    course: "Machine Learning",
                    video: "Gradient Descent",
                    timestamp: 542,
                    timeDisplay: "9:02",
                    content: "The visualization at this point made everything click! The ball rolling down the hill analogy is perfect for understanding how gradient descent finds the minimum.",
                    likes: 34,
                    instructorEndorsed: true,
                    postedAt: "3 hours ago"
                  },
                  {
                    id: 3,
                    type: "annotation",
                    user: "Dr. Chen",
                    avatar: "DrChen",
                    role: "instructor",
                    course: "Machine Learning",
                    video: "Neural Networks Intro",
                    timestamp: 890,
                    timeDisplay: "14:50",
                    content: "Important: This activation function (ReLU) is what allows neural networks to learn non-linear patterns. Without it, even deep networks would only learn linear relationships.",
                    likes: 89,
                    pinned: true,
                    postedAt: "5 hours ago"
                  },
                  {
                    id: 4,
                    type: "confusion",
                    user: "Mike Rodriguez",
                    avatar: "Mike",
                    course: "Web Development",
                    video: "CSS Grid Mastery",
                    timestamp: 320,
                    timeDisplay: "5:20",
                    content: "How is grid-template-areas different from using grid-column and grid-row? They seem to do the same thing.",
                    replies: 8,
                    resolved: false,
                    postedAt: "6 hours ago"
                  },
                  {
                    id: 5,
                    type: "reflection",
                    user: "Emma Davis",
                    avatar: "Emma",
                    course: "JavaScript Fundamentals",
                    video: "Promises vs Callbacks",
                    timestamp: 445,
                    timeDisplay: "7:25",
                    content: "This comparison finally helped me understand why Promises are better than callback hell. The code is so much cleaner!",
                    likes: 23,
                    instructorEndorsed: false,
                    postedAt: "8 hours ago"
                  },
                  {
                    id: 6,
                    type: "annotation",
                    user: "Lisa Wang",
                    avatar: "Lisa",
                    course: "Python Basics",
                    video: "List Comprehensions",
                    timestamp: 180,
                    timeDisplay: "3:00",
                    content: "Pro tip: You can add conditions to list comprehensions! Example: [x for x in range(10) if x % 2 == 0] gives you only even numbers.",
                    likes: 45,
                    pinned: false,
                    postedAt: "10 hours ago"
                  },
                  {
                    id: 7,
                    type: "confusion",
                    user: "Tom Henderson",
                    avatar: "Tom",
                    course: "React Advanced",
                    video: "Custom Hooks",
                    timestamp: 667,
                    timeDisplay: "11:07",
                    content: "When should I extract logic into a custom hook vs just keeping it in the component?",
                    replies: 12,
                    resolved: true,
                    postedAt: "12 hours ago"
                  },
                  {
                    id: 8,
                    type: "reflection",
                    user: "Nina Scott",
                    avatar: "Nina",
                    course: "Web Development",
                    video: "Flexbox Fundamentals",
                    timestamp: 234,
                    timeDisplay: "3:54",
                    content: "The way the instructor explains justify-content vs align-items using the main axis and cross axis makes so much sense now!",
                    likes: 67,
                    instructorEndorsed: true,
                    postedAt: "14 hours ago"
                  }
                ].filter(activity => {
                  // Filter by course
                  if (videoActivityCourse !== 'all') {
                    const courseMap: { [key: string]: string } = {
                      'react': 'React Advanced',
                      'ml': 'Machine Learning',
                      'web-dev': 'Web Development',
                      'python': 'Python Basics',
                      'javascript': 'JavaScript Fundamentals'
                    }
                    if (activity.course !== courseMap[videoActivityCourse]) return false
                  }
                  
                  // Filter by type
                  if (videoActivityType !== 'all') {
                    const typeMap: { [key: string]: string } = {
                      'confusions': 'confusion',
                      'reflections': 'reflection',
                      'annotations': 'annotation'
                    }
                    if (activity.type !== typeMap[videoActivityType]) return false
                  }
                  
                  return true
                }).map((activity) => (
                  <Card key={activity.id} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* User Avatar */}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.avatar}`} />
                          <AvatarFallback>{activity.user[0]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{activity.user}</span>
                                {'role' in activity && activity.role === 'instructor' && (
                                  <Badge variant="secondary" className="text-xs">Instructor</Badge>
                                )}
                                {activity.type === 'confusion' && (
                                  <Badge variant="outline" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Confusion
                                  </Badge>
                                )}
                                {activity.type === 'reflection' && (
                                  <Badge variant="outline" className="text-xs">
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    Reflection
                                  </Badge>
                                )}
                                {activity.type === 'annotation' && (
                                  <Badge variant="outline" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Note
                                  </Badge>
                                )}
                                {'resolved' in activity && activity.resolved && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Resolved
                                  </Badge>
                                )}
                                {'instructorEndorsed' in activity && activity.instructorEndorsed && (
                                  <Badge variant="default" className="text-xs">
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Endorsed
                                  </Badge>
                                )}
                                {'pinned' in activity && activity.pinned && (
                                  <Badge variant="default" className="text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Pinned
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {activity.course} • {activity.video}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">{activity.postedAt}</span>
                          </div>
                          
                          {/* Video Timestamp */}
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md mb-2">
                            <Play className="h-3 w-3" />
                            <span className="text-xs font-medium">{activity.timeDisplay}</span>
                          </div>
                          
                          {/* Content */}
                          <p className="text-sm mb-3">{activity.content}</p>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            {'likes' in activity && (
                              <Button variant="ghost" size="sm" className="h-7 gap-1">
                                <Heart className="h-3 w-3" />
                                <span className="text-xs">{activity.likes}</span>
                              </Button>
                            )}
                            {'replies' in activity && (
                              <Button variant="ghost" size="sm" className="h-7 gap-1">
                                <MessageCircle className="h-3 w-3" />
                                <span className="text-xs">{activity.replies} replies</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 gap-1 ml-auto">
                              <Play className="h-3 w-3" />
                              <span className="text-xs">Jump to video</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More */}
              <div className="flex justify-center pt-4">
                <Button variant="outline">
                  Load More Activities
                </Button>
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="space-y-6 mt-6">
              {/* Search and Filter Bar */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search video segments, prompts, or concepts..."
                    className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                    value={aiInsightsSearch}
                    onChange={(e) => setAiInsightsSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <select 
                    className="bg-transparent border-0 outline-none text-sm"
                    value={aiInsightsFilter}
                    onChange={(e) => setAiInsightsFilter(e.target.value)}
                  >
                    <option value="all">All Courses</option>
                    <option value="web-dev">Web Development</option>
                    <option value="ml">Machine Learning</option>
                    <option value="react">React</option>
                    <option value="python">Python</option>
                  </select>
                </Button>
              </div>

              {/* AI Insights List */}
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    user: "Sarah Chen",
                    avatar: "Sarah",
                    course: "React Advanced",
                    video: "Custom Hooks Deep Dive",
                    videoLength: "45:30",
                    timeRange: { start: "12:30", end: "14:45" },
                    thumbnail: "/api/placeholder/120/68",
                    segmentTranscript: "So here we have a parent component that passes a callback function to multiple child components. Notice what happens when I type in this input field - all three child components re-render, even though only one of them actually needs the updated value. This is because the handleUpdate function is being recreated on every render. To fix this performance issue, we wrap it with useCallback...",
                    prompt: "Can you explain why we need to use useCallback here? What would happen without it?",
                    responsePreview: "useCallback is crucial here to prevent unnecessary re-renders. Without it, the function would be recreated on every render, causing child components to re-render even when the actual logic hasn't changed...",
                    helpful: 45,
                    timestamp: "2 hours ago",
                    tags: ["hooks", "performance", "react"]
                  },
                  {
                    id: 2,
                    user: "Mike Rodriguez",
                    avatar: "Mike",
                    course: "Machine Learning",
                    video: "Backpropagation Explained",
                    videoLength: "38:20",
                    timeRange: { start: "23:15", end: "25:30" },
                    thumbnail: "/api/placeholder/120/68",
                    segmentTranscript: "Now let's calculate the gradient for this three-layer network. We start from the output and work backwards. The partial derivative of the loss with respect to W3 is... then we apply the chain rule: dL/dW2 = dL/dZ3 × dZ3/dA2 × dA2/dZ2 × dZ2/dW2. Each of these terms represents how the loss changes with respect to different parts of our network...",
                    prompt: "Break down the chain rule calculation step by step for this specific neural network",
                    responsePreview: "Let me break down the chain rule for this 3-layer network: 1) Start from the output layer - the derivative of the loss with respect to the output is...",
                    helpful: 67,
                    timestamp: "3 hours ago",
                    tags: ["neural-networks", "calculus", "backprop"]
                  },
                  {
                    id: 3,
                    user: "Emma Davis",
                    avatar: "Emma",
                    course: "CSS Mastery",
                    video: "Grid vs Flexbox",
                    videoLength: "32:45",
                    timeRange: { start: "8:20", end: "9:15" },
                    thumbnail: "/api/placeholder/120/68",
                    segmentTranscript: "Let me show you how to center a div using CSS Grid. First method: we can use display: grid and place-items: center. This is the simplest approach. Second, we can use display: grid with justify-content: center and align-items: center. Third option is using grid-template-areas and placing our item in the center area...",
                    prompt: "Show me 3 different ways to center this div using the Grid approach shown here",
                    responsePreview: "Here are 3 Grid centering methods based on the video segment: Method 1: Using place-items: center...",
                    helpful: 34,
                    timestamp: "5 hours ago",
                    tags: ["css", "grid", "layout"]
                  },
                  {
                    id: 4,
                    user: "Alex Kim",
                    avatar: "Alex",
                    course: "JavaScript Fundamentals",
                    video: "Async/Await Patterns",
                    videoLength: "28:15",
                    timeRange: { start: "15:00", end: "16:30" },
                    thumbnail: "/api/placeholder/120/68",
                    segmentTranscript: "When we use async/await, we handle errors with try/catch blocks. This is different from Promises where we chain .catch() at the end. The advantage of try/catch is that it can catch both synchronous errors in our code AND asynchronous Promise rejections. If we had a typo or null reference before the await, .catch() wouldn't catch it, but try/catch will...",
                    prompt: "Why does the instructor use try/catch here instead of .catch()? What's the difference?",
                    responsePreview: "The instructor uses try/catch with async/await for better error handling scope. Unlike .catch() which only handles Promise rejections, try/catch can handle both synchronous and asynchronous errors...",
                    helpful: 89,
                    timestamp: "6 hours ago",
                    tags: ["async", "error-handling", "javascript"]
                  }
                ].map((insight) => (
                  <Card key={insight.id} className="border-muted overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${insight.avatar}`} />
                            <AvatarFallback>{insight.user[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-sm">{insight.user}</span>
                                <span className="text-xs text-muted-foreground ml-2">• {insight.timestamp}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                <span className="text-xs">{insight.helpful} helpful</span>
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {insight.course} • {insight.video}
                            </p>
                          </div>
                        </div>

                        {/* Video Segment & Transcript */}
                        <div className="bg-muted/30 p-3 rounded-md mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              Video Segment: {insight.timeRange.start} - {insight.timeRange.end}
                            </span>
                          </div>
                          <div className="bg-background p-2 rounded border text-sm italic text-muted-foreground">
                            "{insight.segmentTranscript}"
                          </div>
                        </div>

                        {/* User's Question */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md mb-3">
                          <div className="flex items-start gap-2">
                            <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Question about this segment:</p>
                              <p className="text-sm">{insight.prompt}</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Response Preview */}
                        <div className="bg-muted/50 p-3 rounded-md mb-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-primary mb-1">AI Response</p>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {insight.responsePreview}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Tags and Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {insight.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Hash className="h-3 w-3 mr-0.5" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              View Full Response
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <Play className="h-3 w-3 mr-1" />
                              Watch Segment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More */}
              <div className="flex justify-center pt-4">
                <Button variant="outline">
                  Load More AI Insights
                </Button>
              </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-6 mt-6">
              {/* Metric Selector */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={selectedMetric === 'learnRate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('learnRate')}
                  className="gap-2"
                >
                  <Activity className="h-4 w-4" />
                  Learn Rate
                </Button>
                <Button 
                  variant={selectedMetric === 'executionPace' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('executionPace')}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Execution Pace
                </Button>
                <Button 
                  variant={selectedMetric === 'executionRate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric('executionRate')}
                  className="gap-2"
                >
                  <Target className="h-4 w-4" />
                  Execution Rate
                </Button>
              </div>

              {/* Leaderboard List */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top Performers - {selectedMetric === 'learnRate' ? 'Learn Rate' : 
                                      selectedMetric === 'executionPace' ? 'Execution Pace' : 
                                      'Execution Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard[selectedMetric].map((entry, index) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Rank */}
                        <div className={`text-lg font-bold w-8 text-center ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-muted-foreground'
                        }`}>
                          {entry.rank}
                        </div>
                        
                        {/* User Info */}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.avatar} />
                          <AvatarFallback>{entry.name[0]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{entry.name}</p>
                            {getTrendIcon(entry.trend)}
                            {entry.currentStreak > 7 && (
                              <Badge variant="outline" className="text-xs">
                                <Flame className="h-3 w-3 mr-1" />
                                {entry.currentStreak} day streak
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>Learn: {entry.learnRate} min/hr</span>
                            <span>Pace: {entry.executionPace}s</span>
                            <span>Rate: {entry.executionRate}%</span>
                          </div>
                        </div>
                        
                        {/* Primary Metric Display */}
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {formatMetric(entry[selectedMetric], selectedMetric)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.totalStudyTime}h total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Your Position */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                      <div className="text-lg font-bold w-8 text-center text-primary">12</div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.name}`} />
                        <AvatarFallback>{learner.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">You</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>Learn: 38 min/hr</span>
                          <span>Pace: 45s</span>
                          <span>Rate: 82%</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar - Recent Activity */}
            <div className="hidden xl:block w-80 space-y-4">
              {/* Recent Confusions */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Recent Confusions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { user: "Alex K.", course: "React Fundamentals", video: "UseEffect Hook", confusion: "When to use useEffect vs useLayoutEffect?", time: "5m ago" },
                      { user: "Sarah M.", course: "CSS Mastery", video: "Grid Layout", confusion: "How to center items in CSS Grid?", time: "12m ago" },
                      { user: "Mike R.", course: "JavaScript", video: "Promises", confusion: "Difference between .then() and async/await", time: "18m ago" },
                      { user: "Emma W.", course: "Python Basics", video: "List Comprehension", confusion: "Nested list comprehension syntax", time: "25m ago" },
                    ].map((item, index) => (
                      <div key={index} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} />
                            <AvatarFallback>{item.user[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate">{item.user}</p>
                              <span className="text-xs text-muted-foreground">{item.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{item.course} • {item.video}</p>
                            <p className="text-xs mt-1 line-clamp-2">{item.confusion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View All Confusions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Reflections */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    Recent Reflections
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { user: "Lisa Chen", course: "Web Development", video: "Flexbox Deep Dive", reflection: "Finally understood flex-grow vs flex-shrink!", likes: 12, time: "2m ago" },
                      { user: "John D.", course: "Machine Learning", video: "Neural Networks", reflection: "The backprop visualization made everything click", likes: 28, time: "8m ago" },
                      { user: "Amy T.", course: "Data Science", video: "Pandas Basics", reflection: "GroupBy operations are like SQL but in Python!", likes: 15, time: "15m ago" },
                      { user: "Ryan P.", course: "React Advanced", video: "Custom Hooks", reflection: "Creating reusable logic with hooks is game-changing", likes: 22, time: "22m ago" },
                    ].map((item, index) => (
                      <div key={index} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} />
                            <AvatarFallback>{item.user[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate">{item.user}</p>
                              <span className="text-xs text-muted-foreground">{item.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{item.course} • {item.video}</p>
                            <p className="text-xs mt-1 line-clamp-2">{item.reflection}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Heart className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">{item.likes}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View All Reflections
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent AI Insights */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Recent AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { user: "Tom H.", video: "React Hooks", timeRange: "2:30-3:15", prompt: "Why useCallback here?", time: "1m ago" },
                      { user: "Nina S.", video: "CSS Grid", timeRange: "5:45-6:20", prompt: "Center without flexbox?", time: "3m ago" },
                      { user: "Jake L.", video: "Async JS", timeRange: "10:00-11:30", prompt: "Promise vs async difference", time: "8m ago" },
                    ].map((item, index) => (
                      <div key={index} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <Badge variant="outline" className="text-xs px-1">
                              {item.timeRange}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate">{item.user}</p>
                              <span className="text-xs text-muted-foreground">{item.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{item.video}</p>
                            <p className="text-xs mt-1 line-clamp-1">{item.prompt}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => setActiveTab('ai-insights')}
                    >
                      View All AI Insights
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Trending Topics */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Trending Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { topic: "React Hooks", count: 234, trend: "up" },
                      { topic: "CSS Grid", count: 189, trend: "up" },
                      { topic: "Async/Await", count: 156, trend: "down" },
                      { topic: "Machine Learning", count: 142, trend: "up" },
                      { topic: "TypeScript", count: 128, trend: "up" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{item.topic}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{item.count}</span>
                          {item.trend === "up" ? (
                            <ArrowUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  )
}