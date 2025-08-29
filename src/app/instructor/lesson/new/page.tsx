"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload,
  Youtube,
  Video,
  Link2,
  Save,
  Globe,
  Lock,
  Eye,
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  ExternalLink,
  Loader2,
  Copy,
  Share2
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function CreateLessonPage() {
  const router = useRouter()
  const { 
    createLesson, 
    updateLesson,
    uploadLessonVideo,
    setYoutubeUrl,
    publishLesson,
    generateShareLink,
    currentLesson,
    isUploading
  } = useAppStore()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [youtubeInput, setYoutubeInput] = useState("")
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'youtube'>('upload')
  const [ctaText, setCtaText] = useState("")
  const [ctaLink, setCtaLink] = useState("")
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public')
  const [isPublishing, setIsPublishing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [lessonId, setLessonId] = useState<string | null>(null)

  // Handle video upload
  const handleVideoUpload = useCallback((file: File) => {
    // Create lesson if not exists
    if (!lessonId) {
      const id = createLesson({
        title: title || 'Untitled Lesson',
        description,
        tags,
        visibility,
        ctaText,
        ctaLink
      })
      setLessonId(id)
      uploadLessonVideo(file, id)
    } else {
      uploadLessonVideo(file, lessonId)
    }
  }, [lessonId, createLesson, title, description, tags, visibility, ctaText, ctaLink, uploadLessonVideo])

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleVideoUpload(file)
    }
  }, [handleVideoUpload])

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVideoUpload(file)
    }
  }

  // Handle YouTube URL
  const handleYoutubeSubmit = () => {
    if (!youtubeInput) return
    
    // Create lesson if not exists
    if (!lessonId) {
      const id = createLesson({
        title: title || 'Untitled Lesson',
        description,
        tags,
        visibility,
        ctaText,
        ctaLink
      })
      setLessonId(id)
      setYoutubeUrl(id, youtubeInput)
    } else {
      setYoutubeUrl(lessonId, youtubeInput)
    }
  }

  // Add tag
  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      const newTags = [...tags, tagInput]
      setTags(newTags)
      setTagInput("")
      if (lessonId) {
        updateLesson(lessonId, { tags: newTags })
      }
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    if (lessonId) {
      updateLesson(lessonId, { tags: newTags })
    }
  }

  // Save draft
  const handleSaveDraft = () => {
    if (!lessonId) {
      const id = createLesson({
        title: title || 'Untitled Lesson',
        description,
        tags,
        visibility,
        ctaText,
        ctaLink
      })
      setLessonId(id)
    } else {
      updateLesson(lessonId, {
        title,
        description,
        tags,
        visibility,
        ctaText,
        ctaLink
      })
    }
    router.push('/instructor/lessons')
  }

  // Publish lesson
  const handlePublish = async () => {
    if (!lessonId) {
      alert('Please upload a video or save as draft first')
      return
    }
    
    setIsPublishing(true)
    await publishLesson(lessonId)
    setIsPublishing(false)
    router.push('/instructor/lessons')
  }

  // Copy share link
  const handleCopyLink = () => {
    if (!lessonId) return
    const link = generateShareLink(lessonId)
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create Standalone Lesson</h1>
          <p className="text-muted-foreground">
            Perfect for marketing videos and single tutorials
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={!title || (!currentLesson?.videoUrl && !currentLesson?.youtubeUrl) || isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Publish Lesson
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Video Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., React Hooks in 10 Minutes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will viewers learn from this lesson?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
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
            </CardContent>
          </Card>

          {/* Video Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Video Content</CardTitle>
              <CardDescription>
                Upload a video file or link from YouTube
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={uploadMethod} onValueChange={(v: 'upload' | 'youtube') => setUploadMethod(v)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video
                  </TabsTrigger>
                  <TabsTrigger value="youtube">
                    <Youtube className="mr-2 h-4 w-4" />
                    YouTube Link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">
                      Drag & drop your video here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="video-upload"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => document.getElementById('video-upload')?.click()}
                    >
                      Select Video
                    </Button>
                  </div>

                  {isUploading && currentLesson?.uploadProgress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{Math.round(currentLesson.uploadProgress)}%</span>
                      </div>
                      <Progress value={currentLesson.uploadProgress} />
                    </div>
                  )}

                  {currentLesson?.videoUrl && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Video uploaded successfully! Ready to publish.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="youtube" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                    />
                    <Button onClick={handleYoutubeSubmit}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {currentLesson?.youtubeUrl && (
                    <Alert>
                      <Youtube className="h-4 w-4" />
                      <AlertDescription>
                        YouTube video linked successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      YouTube videos will be embedded. AI features work best with uploaded videos.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Marketing CTA */}
          <Card>
            <CardHeader>
              <CardTitle>Call to Action (Optional)</CardTitle>
              <CardDescription>
                Add a CTA to convert viewers to your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cta-text">CTA Button Text</Label>
                <Input
                  id="cta-text"
                  placeholder="e.g., Learn React Properly"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-link">CTA Link</Label>
                <Input
                  id="cta-link"
                  placeholder="e.g., /course/react-masterclass"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Settings */}
        <div className="space-y-6">
          {/* Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted')}
                  className="text-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">Public</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone can find and view
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="unlisted"
                  checked={visibility === 'unlisted'}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted')}
                  className="text-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    <span className="font-medium">Unlisted</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only with link can view
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Share Preview */}
          {lessonId && (
            <Card>
              <CardHeader>
                <CardTitle>Share Preview</CardTitle>
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
          )}
        </div>
      </div>
    </div>
  )
}