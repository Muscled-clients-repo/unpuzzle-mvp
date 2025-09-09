"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FloatingUploadPanel } from "@/components/ui/FloatingUploadPanel"
import { UnifiedDropzone } from "@/components/media/unified-dropzone"
import { useMediaFiles, useDeleteMediaFile, useUploadMediaFile } from "@/hooks/use-media-queries"
import { useMediaStore } from "@/stores/media-store"
import { SimpleVideoPreview } from "@/components/ui/SimpleVideoPreview"
import { FileDetailsModal } from "@/components/media/FileDetailsModal"
import {
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  FileVideo,
  Image,
  File,
  Play,
  Trash2,
  MoreHorizontal,
  Info
} from "lucide-react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function MediaPage() {
  // ARCHITECTURE-COMPLIANT: Form state in useState
  const [searchQuery, setSearchQuery] = useState('')
  const [previewingFile, setPreviewingFile] = useState<any>(null)
  const [detailsFile, setDetailsFile] = useState<any>(null)
  
  // ARCHITECTURE-COMPLIANT: UI state in Zustand
  const {
    viewMode,
    setViewMode,
    showUploadDashboard,
    setShowUploadDashboard,
    filterType,
    setFilterType,
    sortOrder,
    setSortOrder,
  } = useMediaStore()
  
  // ARCHITECTURE-COMPLIANT: Server state in TanStack Query
  const { data: mediaFiles = [], isLoading, error } = useMediaFiles()
  const deleteMutation = useDeleteMediaFile()
  const uploadMutation = useUploadMediaFile()

  // ARCHITECTURE-COMPLIANT: Upload handlers for TanStack Query integration
  const handleFilesSelected = (files: File[]) => {
    files.forEach(file => {
      const operationId = `media_upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      uploadMutation.mutate({ file, operationId })
    })
  }

  const handleDelete = async (fileId: string) => {
    deleteMutation.mutate(fileId)
  }

  const clearModals = () => {
    setPreviewingFile(null)
    setDetailsFile(null)
    // Force DOM cleanup
    document.body.style.overflow = 'unset'
    document.body.style.pointerEvents = 'auto'
  }

  const handlePreview = (item: any) => {
    console.log('[MEDIA PREVIEW] Item data:', item)
    
    // Generate private URL format for signed URL system if we have the data
    let privateUrl = null
    if (item.backblaze_file_id && item.file_name) {
      privateUrl = `private:${item.backblaze_file_id}:${item.file_name}`
      console.log('[MEDIA PREVIEW] Generated private URL:', privateUrl)
    }
    
    const videoForPreview = {
      id: item.id,
      name: item.name,
      video_url: privateUrl || item.backblaze_url,
      url: item.backblaze_url,
      backblaze_url: item.backblaze_url,
    }
    console.log('[MEDIA PREVIEW] Video for preview:', videoForPreview)
    setPreviewingFile(videoForPreview)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }


  const filteredMedia = mediaFiles.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load media files</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Manage and organize your course content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredMedia.length} files
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearModals}
            className="text-xs"
          >
            Clear Modals
          </Button>
        </div>
      </div>

      {/* Progress Panel - Shows upload and bulk operation progress */}

      {/* Upload Zone */}
      <div className="mb-8">
        <UnifiedDropzone 
          onFilesSelected={handleFilesSelected}
          isUploading={uploadMutation.isPending}
          showHeader={true}
          headerTitle="Upload Media Files"
        />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter by Type */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Button 
          variant="outline" 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
          Date
        </Button>

        {/* View Mode */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail/Preview */}
              <div className="aspect-video bg-muted flex items-center justify-center">
                {getTypeIcon(item.type)}
              </div>

              {/* Content */}
              <div className="p-3">
                <h4 className="font-medium truncate mb-1">{item.name}</h4>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>{item.size}</span>
                  <span>{item.uploadedAt}</span>
                </div>
                <Badge 
                  variant={item.usage === 'Unused' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {item.usage}
                </Badge>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePreview(item)}>
                      <Play className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDetailsFile(item)}>
                      <Info className="h-4 w-4 mr-2" />
                      Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.name}</h4>
                <p className="text-sm text-muted-foreground">{item.size} • {item.uploadedAt}</p>
              </div>
              <Badge variant={item.usage === 'Unused' ? 'secondary' : 'outline'}>
                {item.usage}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePreview(item)}>
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDetailsFile(item)}>
                    <Info className="h-4 w-4 mr-2" />
                    Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No media files found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try adjusting your search terms' : 'Upload some files to get started'}
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewingFile && (
        <SimpleVideoPreview
          key={previewingFile.id}
          video={previewingFile}
          isOpen={true}
          onClose={clearModals}
        />
      )}

      {/* File Details Modal */}
      {detailsFile && (
        <FileDetailsModal
          key={detailsFile.id}
          file={detailsFile}
          isOpen={true}
          onClose={clearModals}
        />
      )}

      {/* Floating Upload Panel - Google Drive style */}
      <FloatingUploadPanel
        items={mediaFiles.filter(file => 
          file.status === 'uploading' || 
          file.status === 'processing' || 
          (file.status === 'ready' && typeof file.uploadProgress === 'number')
        )}
        position="bottom-right" // Can be changed to "top" or "bottom-center"
      />
    </div>
  )
}