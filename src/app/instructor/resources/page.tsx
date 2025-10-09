'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getResources,
  createResource,
  deleteResource,
  type Resource
} from '@/app/actions/resource-actions'
import { uploadResourceFile } from '@/app/actions/resource-upload-actions'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Filter,
  Upload,
  FileText,
  Download,
  Star,
  MoreVertical,
  Trash2,
  X,
  Loader2,
  File,
  Globe,
  Lock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageContainer } from '@/components/layout/page-container'
import { PageContentHeader } from '@/components/layout/page-content-header'
import { StatsGrid } from '@/components/layout/stats-grid'
import { FiltersSection } from '@/components/layout'
import { SearchInput, FilterDropdown } from '@/components/ui/filters'

export default function InstructorResourcesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [accessFilter, setAccessFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    type: 'template',
    category: 'development',
    access: 'free' as 'free' | 'member-only',
    tags: [] as string[],
    file: null as File | null
  })
  const [tagInput, setTagInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Fetch resources
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ['instructor-resources', typeFilter, accessFilter, searchQuery],
    queryFn: async () => {
      const filters: any = {}
      if (typeFilter !== 'all') filters.type = typeFilter
      if (accessFilter !== 'all') filters.access = accessFilter
      if (searchQuery) filters.searchQuery = searchQuery

      const result = await getResources(filters)
      if (result.error) throw new Error(result.error)
      return result.resources || []
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Resource deleted!')
      queryClient.invalidateQueries({ queryKey: ['instructor-resources'] })
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadForm(prev => ({ ...prev, file }))
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !uploadForm.tags.includes(tagInput.trim())) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleUploadSubmit = async () => {
    if (!uploadForm.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (!uploadForm.file) {
      toast.error('Please select a file')
      return
    }

    setIsUploading(true)

    try {
      // Upload file to Backblaze B2
      const formData = new FormData()
      formData.append('file', uploadForm.file)

      const uploadResult = await uploadResourceFile(formData)

      if (uploadResult.error) {
        toast.error(uploadResult.error)
        setIsUploading(false)
        return
      }

      // Create resource record in database
      const result = await createResource({
        title: uploadForm.title,
        description: uploadForm.description,
        type: uploadForm.type,
        category: uploadForm.category,
        access: uploadForm.access,
        file_url: uploadResult.fileUrl!,
        file_size: uploadResult.fileSize,
        format: uploadForm.file.name.split('.').pop()?.toUpperCase() || 'FILE',
        mime_type: uploadForm.file.type,
        tags: uploadForm.tags.length > 0 ? uploadForm.tags : undefined
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Resource uploaded successfully!')
      setShowUploadModal(false)
      setUploadForm({
        title: '',
        description: '',
        type: 'template',
        category: 'development',
        access: 'free',
        tags: [],
        file: null
      })
      queryClient.invalidateQueries({ queryKey: ['instructor-resources'] })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload resource')
    } finally {
      setIsUploading(false)
    }
  }

  const resources = resourcesData || []

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'template', label: 'Templates' },
    { value: 'guide', label: 'Guides' },
    { value: 'checklist', label: 'Checklists' },
    { value: 'tool', label: 'Tools' },
    { value: 'spreadsheet', label: 'Spreadsheets' },
    { value: 'document', label: 'Documents' }
  ]

  const accessOptions = [
    { value: 'all', label: 'All Access' },
    { value: 'free', label: 'Free' },
    { value: 'member-only', label: 'Member Only' }
  ]

  return (
    <PageContainer>
      {/* Header */}
      <PageContentHeader
        title="Resources"
        description="Manage community resources and course materials"
      >
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Resource
        </Button>
      </PageContentHeader>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
            <p className="text-xs text-muted-foreground">
              {resources.filter(r => r.access === 'free').length} free
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resources.reduce((acc, r) => acc + r.download_count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resources.length > 0
                ? (resources.reduce((acc, r) => acc + r.rating_average, 0) / resources.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Only</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resources.filter(r => r.access === 'member-only').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Premium resources
            </p>
          </CardContent>
        </Card>
      </StatsGrid>

      {/* Filters */}
      <FiltersSection className="mt-6 mb-6">
        <SearchInput
          placeholder="Search resources..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <FilterDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="Filter by type"
          width="w-[180px]"
          icon={<Filter className="h-4 w-4" />}
          options={typeOptions}
        />

        <FilterDropdown
          value={accessFilter}
          onChange={setAccessFilter}
          placeholder="Filter by access"
          width="w-[180px]"
          options={accessOptions}
        />
      </FiltersSection>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : resources.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No resources found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || accessFilter !== 'all'
                ? "Try adjusting your filters"
                : "Get started by uploading your first resource"}
            </p>
            {!searchQuery && typeFilter === 'all' && accessFilter === 'all' && (
              <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Your First Resource
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <File className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{resource.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {resource.format || 'FILE'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this resource?')) {
                            deleteMutation.mutate(resource.id)
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {resource.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {resource.type}
                    </Badge>
                    <Badge variant={resource.access === 'free' ? 'default' : 'secondary'}>
                      {resource.access === 'free' ? (
                        <><Globe className="mr-1 h-3 w-3" />Free</>
                      ) : (
                        <><Lock className="mr-1 h-3 w-3" />Member Only</>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {resource.download_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {resource.rating_average.toFixed(1)} ({resource.rating_count})
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upload Resource</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Client Onboarding Template"
                  disabled={isUploading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A complete template for onboarding new clients..."
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                  disabled={isUploading}
                />
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type *</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm"
                    disabled={isUploading}
                  >
                    <option value="template">Template</option>
                    <option value="guide">Guide</option>
                    <option value="checklist">Checklist</option>
                    <option value="tool">Tool</option>
                    <option value="spreadsheet">Spreadsheet</option>
                    <option value="document">Document</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border rounded-lg text-sm"
                    disabled={isUploading}
                  >
                    <option value="development">Development</option>
                    <option value="client-acquisition">Client Acquisition</option>
                    <option value="marketing">Marketing</option>
                    <option value="business">Business</option>
                    <option value="templates">Templates</option>
                  </select>
                </div>
              </div>

              {/* Access Control */}
              <div>
                <label className="text-sm font-medium">Access *</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="free"
                      checked={uploadForm.access === 'free'}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, access: e.target.value as 'free' }))}
                      disabled={isUploading}
                    />
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">Free (Community)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="member-only"
                      checked={uploadForm.access === 'member-only'}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, access: e.target.value as 'member-only' }))}
                      disabled={isUploading}
                    />
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">Member Only</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add tag..."
                    disabled={isUploading}
                  />
                  <Button type="button" onClick={handleAddTag} disabled={isUploading}>
                    Add
                  </Button>
                </div>
                {uploadForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadForm.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1"
                          disabled={isUploading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="text-sm font-medium">File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-2"
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadForm.file ? uploadForm.file.name : 'Choose File'}
                </Button>
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  className="flex-1"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" />Upload Resource</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
