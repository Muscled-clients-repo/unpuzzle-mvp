'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import NextImage from 'next/image'
import { Loader2, Search, Video, Music, FileText, Image as ImageIcon, Play, X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

// Define types for media items
interface MediaItem {
  id: string
  title?: string
  originalFilename?: string
  filename?: string
  fileType: string
  fileSize?: number
  file_size?: number
  fileSizeFormatted?: string
  duration?: string
  durationFormatted?: string
  resolution?: string
  thumbnailUrl?: string
  thumbnail_url?: string
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processing_status?: string
}

type MediaTypeFilter = 'all' | 'video' | 'audio' | 'document' | 'image'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'video': return <Video className="h-4 w-4" />
    case 'audio': return <Music className="h-4 w-4" />
    case 'document': return <FileText className="h-4 w-4" />
    case 'image': return <ImageIcon className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

export function MediaLibraryModal() {
  const {
    mediaLibrary,
    closeMediaLibrary,
    loadUnassignedMedia,
    toggleMediaSelection,
    assignSelectedMedia,
    setMediaFilters
  } = useAppStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setMediaFilters({ search: searchQuery })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, setMediaFilters])
  
  const handleAssign = async () => {
    setIsAssigning(true)
    try {
      const result = await assignSelectedMedia()
      if (result?.successful) {
        console.log(`✅ Added ${result.successful} media files`)
      }
      if (result?.failed) {
        console.error(`❌ Failed to add ${result.failed} media files`)
      }
    } finally {
      setIsAssigning(false)
    }
  }
  
  if (!mediaLibrary.isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden m-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Media Library</h2>
          <Button variant="outline" size="sm" onClick={closeMediaLibrary}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs
              value={mediaLibrary.filters.type}
              onValueChange={(value: MediaTypeFilter) => setMediaFilters({ type: value })}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="document">Documents</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="min-h-[400px] max-h-[400px] overflow-auto">
            {mediaLibrary.loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : mediaLibrary.error ? (
              <div className="flex items-center justify-center h-full text-red-600">
                {mediaLibrary.error}
              </div>
            ) : mediaLibrary.media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText className="h-12 w-12 mb-2" />
                <p>No unassigned media files found</p>
                <p className="text-sm">Upload new files or remove files from existing courses</p>
              </div>
            ) : (
              <div className="h-[400px] overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {mediaLibrary.media.map((media: MediaItem) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      isSelected={mediaLibrary.selectedIds.has(media.id)}
                      onToggle={() => toggleMediaSelection(media.id)}
                    />
                  ))}
                </div>
                
                {mediaLibrary.pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUnassignedMedia(mediaLibrary.pagination.page - 1)}
                      disabled={mediaLibrary.pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {mediaLibrary.pagination.page} of {mediaLibrary.pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUnassignedMedia(mediaLibrary.pagination.page + 1)}
                      disabled={mediaLibrary.pagination.page === mediaLibrary.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            {mediaLibrary.selectedIds.size} file(s) selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeMediaLibrary}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={mediaLibrary.selectedIds.size === 0 || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${mediaLibrary.selectedIds.size} File(s)`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaCard({ media, isSelected, onToggle }: { media: MediaItem, isSelected: boolean, onToggle: () => void }) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 cursor-pointer transition-all",
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium truncate">
                {media.title || media.originalFilename || media.filename || 'Untitled'}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {getFileIcon(media.fileType || 'video')}
                <span className="text-sm text-gray-500">
                  {media.fileSizeFormatted || formatFileSize(media.fileSize || media.file_size || 0)}
                  {(media.durationFormatted || media.duration) && ` • ${media.durationFormatted || media.duration}`}
                </span>
              </div>
              {media.resolution && (
                <Badge variant="outline" className="mt-2">
                  {media.resolution}
                </Badge>
              )}
            </div>
            
            {(media.thumbnailUrl || media.thumbnail_url) && (
              <div className="relative ml-2">
                <NextImage
                  src={media.thumbnailUrl || media.thumbnail_url}
                  alt={`${media.title || media.filename || 'Media'} thumbnail`}
                  width={80}
                  height={80}
                  priority={false}
                  className="w-20 h-20 object-cover rounded"
                  sizes="80px"
                />
                {media.fileType === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {(media.processingStatus || media.processing_status) && (media.processingStatus || media.processing_status) !== 'completed' && (
            <Badge variant={(media.processingStatus || media.processing_status) === 'failed' ? 'destructive' : 'secondary'} className="mt-2">
              {media.processingStatus || media.processing_status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}