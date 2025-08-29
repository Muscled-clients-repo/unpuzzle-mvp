"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X,
  Video,
  Youtube,
  Link2,
  Globe,
  Copy,
  ExternalLink
} from "lucide-react"

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = params.id as string
  
  const {
    lessons,
    updateLesson,
    loadLessons,
    generateShareLink
  } = useAppStore()

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Form state - matching lesson creation fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [ctaLink, setCtaLink] = useState("")
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public')
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")

  // Load lesson data on mount
  useEffect(() => {
    loadLessons()
  }, [loadLessons])

  // Set form data when lesson is loaded
  useEffect(() => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson) {
      setTitle(lesson.title)
      setDescription(lesson.description || "")
      setTags(lesson.tags || [])
      setCtaText(lesson.ctaText || "")
      setCtaLink(lesson.ctaLink || "")
      setVisibility(lesson.visibility || 'public')
      setYoutubeUrl(lesson.youtubeUrl || "")
      setVideoUrl(lesson.videoUrl || "")
    }
  }, [lessons, lessonId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      updateLesson(lessonId, {
        title,
        description,
        tags,
        ctaText,
        ctaLink,
        visibility
      })
      setHasChanges(false)
      // Show success message
      setTimeout(() => {
        router.push('/instructor/lessons')
      }, 1000)
    } catch (error) {
      console.error('Failed to save lesson:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    switch(field) {
      case 'title':
        setTitle(value)
        break
      case 'description':
        setDescription(value)
        break
      case 'ctaText':
        setCtaText(value)
        break
      case 'ctaLink':
        setCtaLink(value)
        break
      case 'visibility':
        setVisibility(value)
        break
    }
    setHasChanges(true)
  }

  // Add tag
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput("")
      setHasChanges(true)
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
    setHasChanges(true)
  }

  // Copy share link
  const handleCopyLink = () => {
    const link = generateShareLink(lessonId)
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const lesson = lessons.find(l => l.id === lessonId)

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Lesson</h1>
            <p className="text-sm text-muted-foreground">
              Update your lesson information and settings
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          
          {!hasChanges && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Saved
            </Badge>
          )}
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Basic Info</TabsTrigger>
          <TabsTrigger value="video">Video Source</TabsTrigger>
          <TabsTrigger value="settings">Settings & AI</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Information</CardTitle>
              <CardDescription>
                Update the basic information about your lesson
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter lesson title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="What will viewers learn from this lesson?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button onClick={handleAddTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Marketing CTA */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Call to Action (Optional)</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cta-text">CTA Button Text</Label>
                    <Input
                      id="cta-text"
                      placeholder="e.g., Learn React Properly"
                      value={ctaText}
                      onChange={(e) => handleInputChange('ctaText', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta-link">CTA Link</Label>
                    <Input
                      id="cta-link"
                      placeholder="e.g., /course/react-masterclass"
                      value={ctaLink}
                      onChange={(e) => handleInputChange('ctaLink', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Source Tab */}
        <TabsContent value="video" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Video Source</CardTitle>
              <CardDescription>
                Current video configuration for this lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              {youtubeUrl ? (
                <Alert>
                  <Youtube className="h-4 w-4" />
                  <AlertDescription>
                    YouTube video linked: {youtubeUrl}
                  </AlertDescription>
                </Alert>
              ) : videoUrl ? (
                <Alert>
                  <Video className="h-4 w-4" />
                  <AlertDescription>
                    Video uploaded successfully
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No video source configured. Upload a new video from the lessons page.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                  className="text-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">Public</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone can find and view this lesson
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="unlisted"
                  checked={visibility === 'unlisted'}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                  className="text-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    <span className="font-medium">Unlisted</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only people with the link can view
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Share Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Share Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted rounded-lg text-xs font-mono break-all">
                {generateShareLink(lessonId)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`/lesson/${lessonId}`, '_blank')}
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}