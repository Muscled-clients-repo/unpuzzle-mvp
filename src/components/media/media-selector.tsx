"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMediaFiles } from "@/hooks/use-media-queries"
import { useMediaStore } from "@/stores/media-store"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  FileVideo,
  Image,
  File,
  Check
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { MediaFile } from "@/hooks/use-media-queries"

interface MediaSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedFiles: MediaFile[]) => void
  allowMultiple?: boolean
  fileTypeFilter?: string
  title?: string
  isLinking?: boolean
}

export function MediaSelector({
  isOpen,
  onClose,
  onSelect,
  allowMultiple = false,
  fileTypeFilter,
  title = "Select Media from Library",
  isLinking = false
}: MediaSelectorProps) {
  // ARCHITECTURE-COMPLIANT: Form state in useState
  const [searchQuery, setSearchQuery] = useState('')
  const [localSelectedFiles, setLocalSelectedFiles] = useState<string[]>([])
  
  // ARCHITECTURE-COMPLIANT: UI state in Zustand
  const {
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
  } = useMediaStore()
  
  // ARCHITECTURE-COMPLIANT: Server state in TanStack Query
  const { data: mediaFiles = [], isLoading } = useMediaFiles()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const filteredMedia = mediaFiles.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = (fileTypeFilter || filterType) === 'all' || item.type === (fileTypeFilter || filterType)
    return matchesSearch && matchesFilter
  })

  const handleFileToggle = (fileId: string) => {
    if (allowMultiple) {
      setLocalSelectedFiles(prev => 
        prev.includes(fileId) 
          ? prev.filter(id => id !== fileId)
          : [...prev, fileId]
      )
    } else {
      setLocalSelectedFiles([fileId])
    }
  }

  const handleSelect = () => {
    const selectedMediaFiles = mediaFiles.filter(file => 
      localSelectedFiles.includes(file.id)
    )
    onSelect(selectedMediaFiles)
    onClose()
    setLocalSelectedFiles([])
  }

  const handleClose = () => {
    onClose()
    setLocalSelectedFiles([])
  }

  if (isLoading) {
    return (
      <TooltipProvider>
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 border-b pb-4">
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

          {/* Filter by Type (only if no specific type filter) */}
          {!fileTypeFilter && (
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
          )}

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
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md",
                    localSelectedFiles.includes(item.id) && "ring-2 ring-primary bg-primary/10"
                  )}
                  onClick={() => handleFileToggle(item.id)}
                >
                  {/* Selection indicator */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={localSelectedFiles.includes(item.id)}
                      onChange={() => handleFileToggle(item.id)}
                    />
                  </div>

                  {/* Thumbnail/Preview */}
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h4 className="font-medium truncate mb-1">{item.name}</h4>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
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

                  {/* Selected indicator */}
                  {localSelectedFiles.includes(item.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary rounded-full p-2">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 bg-card border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                    localSelectedFiles.includes(item.id) && "bg-primary/10 border-primary"
                  )}
                  onClick={() => handleFileToggle(item.id)}
                >
                  <Checkbox
                    checked={localSelectedFiles.includes(item.id)}
                    onChange={() => handleFileToggle(item.id)}
                  />
                  
                  <div className="flex-shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h4 className="font-medium truncate">{item.name}</h4>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-sm text-muted-foreground">{item.size} • {item.uploadedAt}</p>
                  </div>
                  
                  <Badge variant={item.usage === 'Unused' ? 'secondary' : 'outline'}>
                    {item.usage}
                  </Badge>
                  
                  {localSelectedFiles.includes(item.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={localSelectedFiles.length === 0 || isLinking}
          >
            {isLinking ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border border-current border-t-transparent rounded-full" />
                Linking...
              </>
            ) : (
              `Select ${localSelectedFiles.length > 0 ? `(${localSelectedFiles.length})` : ''}`
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}