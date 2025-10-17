'use client'

import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { TiptapEditor } from './TiptapEditor'
import { BlogImageUpload } from './BlogImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useBlogCategories } from '@/hooks/blog/useBlogCategories'
import { useBlogTags } from '@/hooks/blog/useBlogTags'
import { useBlogMutations } from '@/hooks/blog/useBlogMutations'
import type { BlogPost, CreateBlogPostInput } from '@/app/actions/blog-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BlogPostFormProps {
  initialData?: BlogPost
  postId?: string
}

export function BlogPostForm({ initialData, postId }: BlogPostFormProps) {
  const { data: categories } = useBlogCategories()
  const { data: tags } = useBlogTags()
  const { createMutation, updateMutation, publishMutation, unpublishMutation } = useBlogMutations()

  // Form state is SSOT for inputs (Pattern 09)
  const form = useForm<CreateBlogPostInput>({
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      excerpt: initialData?.excerpt || '',
      content: initialData?.content || null,
      category_id: initialData?.category_id || '',
      meta_title: initialData?.meta_title || '',
      meta_description: initialData?.meta_description || '',
      og_image_url: initialData?.og_image_url || '',
      featured_image_url: initialData?.featured_image_url || ''
    }
  })

  const isDirty = form.formState.isDirty
  const isPublished = initialData?.status === 'published'

  // Only reset form when loading a different post (not on every data change)
  useEffect(() => {
    if (initialData && !isDirty) {
      form.reset({
        title: initialData.title,
        slug: initialData.slug,
        excerpt: initialData.excerpt || '',
        content: initialData.content,
        category_id: initialData.category_id || '',
        meta_title: initialData.meta_title || '',
        meta_description: initialData.meta_description || '',
        og_image_url: initialData.og_image_url || '',
        featured_image_url: initialData.featured_image_url || ''
      })
    }
  }, [initialData?.id]) // Only re-run when post ID changes

  const handleSave = async () => {
    const data = form.getValues()

    // Validate required fields
    if (!data.title) {
      toast.error('Title is required')
      return
    }

    try {
      // Optimistic reset for immediate feedback
      form.reset(data)

      if (postId) {
        await updateMutation.mutateAsync({ postId, data })
      } else {
        await createMutation.mutateAsync(data)
      }
    } catch (error) {
      // Error - revert to server data
      if (initialData) {
        form.reset(initialData)
      }
    }
  }

  const handlePublish = async () => {
    if (!postId) {
      toast.error('Save the post first before publishing')
      return
    }

    const data = form.getValues()
    if (!data.title || !data.excerpt || !data.content) {
      toast.error('Title, excerpt, and content are required to publish')
      return
    }

    // Save first if dirty
    if (isDirty) {
      await handleSave()
    }

    await publishMutation.mutateAsync(postId)
  }

  const handleUnpublish = async () => {
    if (!postId) return
    await unpublishMutation.mutateAsync(postId)
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          {...form.register('title')}
          placeholder="Enter post title"
          className="text-2xl font-bold"
        />
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          {...form.register('slug')}
          placeholder="auto-generated-from-title"
        />
        <p className="text-sm text-gray-500 mt-1">
          Leave blank to auto-generate from title
        </p>
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          {...form.register('excerpt')}
          placeholder="Brief summary of the post (recommended for SEO)"
          rows={3}
        />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={form.watch('category_id')}
          onValueChange={(value) => form.setValue('category_id', value, { shouldDirty: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Editor */}
      <div>
        <Label>Content *</Label>
        <TiptapEditor
          content={form.watch('content')}
          onChange={(content) => form.setValue('content', content, { shouldDirty: true })}
        />
      </div>

      {/* SEO Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="meta_title">Meta Title</Label>
            <Input
              id="meta_title"
              {...form.register('meta_title')}
              placeholder="Custom meta title (defaults to post title)"
            />
          </div>

          <div>
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              {...form.register('meta_description')}
              placeholder="Meta description for search engines"
              rows={2}
            />
          </div>

          <div>
            <BlogImageUpload
              label="Featured Image"
              description="Upload a featured image for this blog post"
              recommendedDimensions="1600x900px (16:9 ratio) or 1200x630px"
              value={form.watch('featured_image_url')}
              onChange={(cdnUrl) => form.setValue('featured_image_url', cdnUrl, { shouldDirty: true })}
              onClear={() => form.setValue('featured_image_url', '', { shouldDirty: true })}
            />
          </div>

          <div>
            <BlogImageUpload
              label="OG Image (Social Media Preview)"
              description="Upload an image for social media previews (optional, defaults to featured image)"
              recommendedDimensions="1200x630px (Facebook/Twitter/LinkedIn standard)"
              value={form.watch('og_image_url')}
              onChange={(cdnUrl) => form.setValue('og_image_url', cdnUrl, { shouldDirty: true })}
              onClear={() => form.setValue('og_image_url', '', { shouldDirty: true })}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {postId ? 'Save Changes' : 'Create Draft'}
          </Button>

          {postId && !isPublished && (
            <Button
              type="button"
              onClick={handlePublish}
              variant="default"
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish
            </Button>
          )}

          {postId && isPublished && (
            <Button
              type="button"
              onClick={handleUnpublish}
              variant="outline"
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unpublish
            </Button>
          )}
        </div>

        {isDirty && (
          <p className="text-sm text-orange-600">Unsaved changes</p>
        )}
      </div>
    </div>
  )
}
