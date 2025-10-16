"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { RichTextEditor } from "@/components/admin/blog/RichTextEditor"
import {
  getBlogPostById,
  updateBlogPost,
  getAllCategories,
  type BlogPost,
  type BlogCategory,
} from "@/lib/actions/blog-actions"
import { toast } from "sonner"
import { ArrowLeft, Save, Eye } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image_url: "",
    status: "draft" as "draft" | "published" | "scheduled",
    meta_title: "",
    meta_description: "",
    og_image_url: "",
    canonical_url: "",
    focus_keyword: "",
    additional_keywords: "",
    category_ids: [] as string[],
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    setLoading(true)

    // Load post
    const postResult = await getBlogPostById(params.id as string)
    if (postResult.error) {
      toast.error(postResult.error)
      router.push('/admin/blog')
      return
    }

    if (postResult.post) {
      setPost(postResult.post)
      setFormData({
        title: postResult.post.title,
        slug: postResult.post.slug,
        excerpt: postResult.post.excerpt || "",
        content: postResult.post.content,
        featured_image_url: postResult.post.featured_image_url || "",
        status: postResult.post.status,
        meta_title: postResult.post.meta_title || "",
        meta_description: postResult.post.meta_description || "",
        og_image_url: postResult.post.og_image_url || "",
        canonical_url: postResult.post.canonical_url || "",
        focus_keyword: postResult.post.focus_keyword || "",
        additional_keywords: postResult.post.additional_keywords?.join(', ') || "",
        category_ids: postResult.post.categories?.map(c => c.id) || [],
      })
    }

    // Load categories
    const categoriesResult = await getAllCategories()
    if (categoriesResult.categories) {
      setCategories(categoriesResult.categories)
    }

    setLoading(false)
  }

  async function handleSubmit(status: "draft" | "published") {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error("Please fill in title, slug, and content")
      return
    }

    setSaving(true)

    const result = await updateBlogPost({
      id: params.id as string,
      ...formData,
      status,
      additional_keywords: formData.additional_keywords
        ? formData.additional_keywords.split(',').map(k => k.trim())
        : [],
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Blog post ${status === 'published' ? 'published' : 'updated'} successfully`)
      router.push('/admin/blog')
    }

    setSaving(false)
  }

  function toggleCategory(categoryId: string) {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }))
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageContentHeader
        title="Edit Blog Post"
        description="Update and manage your blog post"
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit('published')}
            disabled={saving}
          >
            <Eye className="mr-2 h-4 w-4" />
            {formData.status === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </PageContentHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter blog post title"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="url-friendly-slug"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL: /blog/{formData.slug || 'your-slug'}
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary of the post"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="featured_image">Featured Image URL</Label>
                <Input
                  id="featured_image"
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="Custom title for search engines (defaults to post title)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.meta_title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Custom description for search engines (defaults to excerpt)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.meta_description.length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="focus_keyword">Focus Keyword</Label>
                <Input
                  id="focus_keyword"
                  value={formData.focus_keyword}
                  onChange={(e) => setFormData(prev => ({ ...prev, focus_keyword: e.target.value }))}
                  placeholder="Primary SEO keyword"
                />
              </div>

              <div>
                <Label htmlFor="additional_keywords">Additional Keywords</Label>
                <Input
                  id="additional_keywords"
                  value={formData.additional_keywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, additional_keywords: e.target.value }))}
                  placeholder="keyword1, keyword2, keyword3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list
                </p>
              </div>

              <div>
                <Label htmlFor="og_image">Open Graph Image URL</Label>
                <Input
                  id="og_image"
                  value={formData.og_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, og_image_url: e.target.value }))}
                  placeholder="https://example.com/og-image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  value={formData.canonical_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, canonical_url: e.target.value }))}
                  placeholder="https://example.com/original-post"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only needed if content is republished from another source
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {post && (
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{post.view_count}</div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{post.word_count || 0}</div>
                    <div className="text-xs text-muted-foreground">Words</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{post.reading_time_minutes || 0} min</div>
                    <div className="text-xs text-muted-foreground">Read Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={formData.category_ids.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit(formData.status as any)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : formData.status === 'published' ? "Update Post" : "Save Draft"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
