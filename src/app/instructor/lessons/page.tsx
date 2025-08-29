"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus,
  Search,
  Filter,
  Eye,
  BarChart3,
  Share2,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Youtube,
  Video,
  Clock,
  Users,
  Sparkles,
  TrendingUp,
  Globe
} from "lucide-react"

export default function TeachLessonsPage() {
  const router = useRouter()
  const { lessons, loadLessons, deleteLesson, generateShareLink } = useAppStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    loadLessons()
  }, [loadLessons])

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lesson.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || lesson.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCopyLink = (lessonId: string) => {
    const link = generateShareLink(lessonId)
    navigator.clipboard.writeText(link)
    setCopiedLink(lessonId)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleDelete = (lessonId: string, title: string) => {
    if (confirm(`Delete lesson "${title}"? This cannot be undone.`)) {
      deleteLesson(lessonId)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Lessons</h1>
          <p className="text-muted-foreground">
            Create standalone video lessons for marketing and quick tutorials
          </p>
        </div>
        <Button onClick={() => router.push('/instructor/lesson/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Lesson
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessons.length}</div>
            <p className="text-xs text-muted-foreground">
              {lessons.filter(l => l.status === 'published').length} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lessons.reduce((acc, l) => acc + l.views, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all lessons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lessons.reduce((acc, l) => acc + l.aiInteractions, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Student engagements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lessons.length > 0 
                ? Math.round(lessons.reduce((acc, l) => acc + l.completionRate, 0) / lessons.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Watch completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search lessons or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lessons</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lessons Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredLessons.map((lesson) => (
          <Card key={lesson.id} className="overflow-hidden">
            <div className="aspect-video relative bg-muted">
              {lesson.thumbnailUrl ? (
                <Image 
                  src={lesson.thumbnailUrl} 
                  alt={lesson.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex gap-2">
                <Badge 
                  variant={
                    lesson.status === 'published' ? 'default' :
                    lesson.status === 'draft' ? 'secondary' :
                    'outline'
                  }
                >
                  {lesson.status}
                </Badge>
                {lesson.isFree && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                    Free
                  </Badge>
                )}
              </div>

              {/* Source indicator */}
              <div className="absolute top-2 right-2">
                {lesson.youtubeUrl ? (
                  <Youtube className="h-5 w-5 text-red-500" />
                ) : lesson.videoUrl ? (
                  <Video className="h-5 w-5 text-blue-500" />
                ) : null}
              </div>

              {/* Duration */}
              {lesson.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lesson.duration}
                </div>
              )}
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="line-clamp-1">{lesson.title}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {lesson.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/instructor/lesson/${lesson.id}/edit`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Lesson
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/instructor/lesson/${lesson.id}/analytics`)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/student/courses/learn/${lesson.id}`, '_blank')}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyLink(lesson.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copiedLink === lesson.id ? 'Copied!' : 'Copy Link'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(lesson.id, lesson.title)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Lesson
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Tags */}
                {lesson.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lesson.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span>{lesson.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <span>{lesson.aiInteractions}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span>{lesson.completionRate}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(lesson.id)}
                  >
                    <Share2 className="mr-2 h-3 w-3" />
                    Share
                  </Button>
                  <Button 
                    className="flex-1"
                    size="sm"
                    onClick={() => router.push(`/instructor/lesson/${lesson.id}/analytics`)}
                  >
                    <BarChart3 className="mr-2 h-3 w-3" />
                    Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredLessons.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No lessons found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your filters"
                : "Create your first standalone lesson for marketing"}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => router.push('/instructor/lesson/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Lesson
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}