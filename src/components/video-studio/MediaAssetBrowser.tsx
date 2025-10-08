"use client"

import { useState, useMemo } from "react"
import { useMediaFiles } from "@/hooks/use-media-queries"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, FileVideo, Image, File, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaAssetBrowserProps {
  onImportMedia: (mediaFile: {
    id: string
    name: string
    url: string
    type: 'video' | 'audio' | 'image'
    durationSeconds?: number
  }) => void
}

export function MediaAssetBrowser({ onImportMedia }: MediaAssetBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all')

  // Fetch media files
  const { data, isLoading, error } = useMediaFiles({ page: 1, limit: 100 })

  // Filter and search media files
  const filteredMedia = useMemo(() => {
    if (!data?.media) return []

    let filtered = data.media

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.type === filterType)
    }

    // Search by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [data?.media, filterType, searchQuery])

  const handleDragStart = (e: React.DragEvent, file: any) => {
    // Use pre-generated CDN URL from server
    const cdnUrl = file.cdn_url

    if (!cdnUrl) {
      console.error('No CDN URL available for file:', file.name)
      return
    }

    // Store media data for drop handler
    const mediaData = {
      id: file.id,
      name: file.name,
      url: cdnUrl,
      type: file.type,
      durationSeconds: file.duration_seconds
    }

    e.dataTransfer.setData('application/json', JSON.stringify(mediaData))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleClick = (file: any) => {
    // Use pre-generated CDN URL from server
    const cdnUrl = file.cdn_url

    if (!cdnUrl) {
      console.error('No CDN URL available for file:', file.name)
      return
    }

    onImportMedia({
      id: file.id,
      name: file.name,
      url: cdnUrl,
      type: file.type,
      durationSeconds: file.duration_seconds
    })
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FileVideo className="w-4 h-4" />
      case 'image':
        return <Image className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">Assets</h3>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200">
            Import
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2 h-3 w-3 text-gray-500" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs bg-gray-900 border-gray-700 text-gray-300"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1">
          <Button
            variant={filterType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="flex-1 h-6 text-xs"
          >
            All
          </Button>
          <Button
            variant={filterType === 'video' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('video')}
            className="flex-1 h-6 text-xs"
          >
            Video
          </Button>
        </div>
      </div>

      {/* Media Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {isLoading && (
              <div className="col-span-2 flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            )}

            {error && (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-sm text-gray-500">Failed to load</p>
              </div>
            )}

            {!isLoading && !error && filteredMedia.length === 0 && (
              <div className="col-span-2 aspect-video bg-gray-900 rounded flex flex-col items-center justify-center text-xs text-gray-500 border border-gray-700">
                <FileVideo className="w-6 h-6 mb-2" />
                {searchQuery || filterType !== 'all' ? 'No media found' : 'No clips yet'}
              </div>
            )}

            {filteredMedia.map((file) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onClick={() => handleClick(file)}
                className="aspect-video bg-gray-900 rounded flex flex-col items-center justify-center text-xs text-gray-400 border border-gray-700 cursor-pointer hover:border-blue-500 hover:bg-gray-850 transition-colors relative group"
              >
                <div className="mt-0.5 text-gray-500 group-hover:text-blue-400">
                  {getFileIcon(file.type)}
                </div>
                <p className="mt-1 text-center px-2 truncate w-full">{file.name}</p>
                {file.duration_seconds && (
                  <span className="text-xs text-gray-600 mt-1">
                    {formatDuration(file.duration_seconds)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
