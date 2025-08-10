import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { mockUsers, mockCourses } from "@/data/mock"
import { 
  Bookmark, 
  Search, 
  Clock, 
  Play, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Filter
} from "lucide-react"
import Link from "next/link"

export default function BookmarksPage() {
  const learner = mockUsers.learners[0]
  
  // Mock bookmarks data
  const bookmarks = [
    {
      id: "bookmark-1",
      courseId: "course-1",
      videoId: "video-1-2",
      courseName: "Introduction to Web Development",
      videoTitle: "HTML Fundamentals",
      timestamp: 1200,
      note: "Important concept about semantic HTML elements and accessibility",
      createdAt: new Date("2024-02-01"),
      tags: ["html", "semantic", "accessibility"]
    },
    {
      id: "bookmark-2", 
      courseId: "course-1",
      videoId: "video-1-3",
      courseName: "Introduction to Web Development",
      videoTitle: "CSS Styling Basics",
      timestamp: 2400,
      note: "Flexbox vs Grid comparison - when to use each",
      createdAt: new Date("2024-02-02"),
      tags: ["css", "flexbox", "grid"]
    },
    {
      id: "bookmark-3",
      courseId: "course-2",
      videoId: "video-2-3",
      courseName: "Machine Learning Fundamentals", 
      videoTitle: "Linear Regression Deep Dive",
      timestamp: 1800,
      note: "Gradient descent algorithm explanation",
      createdAt: new Date("2024-02-03"),
      tags: ["ml", "regression", "algorithm"]
    },
    {
      id: "bookmark-4",
      courseId: "course-1",
      videoId: "video-1-4",
      courseName: "Introduction to Web Development",
      videoTitle: "JavaScript Essentials",
      timestamp: 900,
      note: "Event delegation pattern - very useful!",
      createdAt: new Date("2024-02-04"),
      tags: ["javascript", "events", "patterns"]
    },
    {
      id: "bookmark-5",
      courseId: "course-2",
      videoId: "video-2-1",
      courseName: "Machine Learning Fundamentals",
      videoTitle: "Introduction to Machine Learning", 
      timestamp: 600,
      note: "Types of ML: supervised, unsupervised, reinforcement",
      createdAt: new Date("2024-02-05"),
      tags: ["ml", "types", "introduction"]
    }
  ]

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      
      <div className="flex flex-1">
        <Sidebar role="learner" />
        
        <main className="flex-1 p-6 md:ml-64">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Bookmarks</h1>
            <p className="text-muted-foreground">
              Save important moments and concepts for quick reference
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search bookmarks..."
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter by Course
              </Button>
              <span className="text-sm text-muted-foreground">
                {bookmarks.length} bookmarks
              </span>
            </div>
          </div>

          {/* Bookmarks List */}
          {bookmarks.length > 0 ? (
            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {bookmark.courseName}
                          </Badge>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(bookmark.createdAt)}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-1">
                          {bookmark.videoTitle}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Bookmarked at {formatTime(bookmark.timestamp)}</span>
                        </div>
                        
                        {bookmark.note && (
                          <p className="text-sm bg-muted p-3 rounded-lg mb-3">
                            "{bookmark.note}"
                          </p>
                        )}
                        
                        {bookmark.tags && bookmark.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {bookmark.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2 ml-4">
                        <Button
                          asChild
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Link href={`/learn/course/${bookmark.courseId}/video/${bookmark.videoId}?t=${bookmark.timestamp}`}>
                            <Play className="h-3 w-3" />
                            Watch
                          </Link>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Start learning and bookmark important moments as you go
                </p>
                <Button asChild>
                  <Link href="/student">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Continue Learning
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Bookmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookmarks.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Bookmarked Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Web Development</div>
                <div className="text-xs text-muted-foreground">3 bookmarks</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <div className="text-xs text-muted-foreground">New bookmarks</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}