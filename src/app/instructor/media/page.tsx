"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FloatingUploadPanel } from "@/components/ui/FloatingUploadPanel"
import { UnifiedDropzone } from "@/components/media/unified-dropzone"
import { useMediaFiles, useDeleteMediaFile, useUploadMediaFile, useBulkDeleteFiles, useExistingTags } from "@/hooks/use-media-queries"
import { useMediaStore } from "@/stores/media-store"
import { useAppStore } from "@/stores/app-store"
import { getInstructorCourses } from "@/app/actions/get-instructor-courses"
import { useQuery } from "@tanstack/react-query"
import { SimpleVideoPreview } from "@/components/ui/SimpleVideoPreview"
import { FileDetailsModal } from "@/components/media/FileDetailsModal"
import { BulkSelectionToolbar } from "@/components/media/BulkSelectionToolbar"
import { useDragSelection } from "@/hooks/use-drag-selection"
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
  Info,
  Tag,
  CheckSquare,
  Square
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
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [previewingFile, setPreviewingFile] = useState<any>(null)
  const [detailsFile, setDetailsFile] = useState<any>(null)
  
  // State for tracking files being deleted (for animation)
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [hiddenFiles, setHiddenFiles] = useState<Set<string>>(new Set())
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  
  // Container ref for drag selection
  const containerRef = useRef<HTMLDivElement>(null)
  
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
    selectedFiles,
    lastSelectedId,
    toggleSelection,
    selectRange,
    clearSelection,
  } = useMediaStore()
  
  // ARCHITECTURE-COMPLIANT: Server state in TanStack Query
  const { data: mediaFiles = [], isLoading, error } = useMediaFiles()
  const { data: existingTags = [] } = useExistingTags()
  const deleteMutation = useDeleteMediaFile()
  const uploadMutation = useUploadMediaFile()
  const bulkDeleteMutation = useBulkDeleteFiles()

  // Course selection state from app store
  const { 
    selectedInstructorCourse, 
    setSelectedInstructorCourse,
    user
  } = useAppStore()

  // Fetch real courses using TanStack Query
  const { data: realCourses = [] } = useQuery({
    queryKey: ['instructor-courses', user?.id],
    queryFn: () => getInstructorCourses(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

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

  const handleBulkDelete = useCallback((operationId: string) => {
    console.log('🗑️ [BULK DELETE] Starting bulk deletion with operationId:', operationId)
    
    const fileIds = Array.from(selectedFiles)
    console.log('Selected files for deletion:', fileIds)
    
    // Execute bulk delete with animation callback
    bulkDeleteMutation.mutate({ 
      fileIds, 
      operationId,
      onAnimationStart: (deletingFileIds) => {
        // Phase 1: Start fade-out animation
        setDeletingFiles(new Set(deletingFileIds))
        
        // Phase 2: After fade completes, hide from render to trigger reflow
        setTimeout(() => {
          setHiddenFiles(new Set(deletingFileIds))
        }, 800) // Give more time to see the fade-out
      }
    })
    
    // Clear selection after operation starts
    clearSelection()
  }, [selectedFiles, clearSelection, bulkDeleteMutation, setDeletingFiles, setHiddenFiles])

  // Clean up deleting files state when operation completes
  useEffect(() => {
    if ((deletingFiles.size > 0 || hiddenFiles.size > 0) && !bulkDeleteMutation.isPending) {
      // Clear deleting and hidden state after a delay to allow animation to complete
      const timer = setTimeout(() => {
        setDeletingFiles(new Set())
        setHiddenFiles(new Set())
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [deletingFiles.size, hiddenFiles.size, bulkDeleteMutation.isPending])

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

  const renderTagBadges = (tags: string[] | null | undefined, maxVisible: number = 3) => {
    if (!tags || tags.length === 0) {
      return (
        <div className="flex items-center gap-1">
          <Tag className="h-3 w-3 text-muted-foreground/50" />
          <Badge variant="outline" className="text-xs opacity-50 border-dashed">
            No tags
          </Badge>
        </div>
      )
    }

    const visibleTags = tags.slice(0, maxVisible)
    const remainingCount = tags.length - maxVisible

    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Tag className="h-3 w-3 text-blue-500 flex-shrink-0" />
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 opacity-70 border-blue-200"
            >
              +{remainingCount}
            </Badge>
          )}
        </div>
      </div>
    )
  }


  const filteredMedia = mediaFiles.filter(item => {
    const searchLower = searchQuery.toLowerCase()
    const matchesName = item.name.toLowerCase().includes(searchLower)
    const matchesTags = item.tags?.some(tag => 
      tag.toLowerCase().includes(searchLower)
    ) || false
    const matchesSearch = matchesName || matchesTags
    const matchesFilter = filterType === 'all' || item.type === filterType
    
    // Course filtering logic
    let matchesCourse = true
    if (selectedInstructorCourse === 'unused') {
      // Show only files not used in any course
      matchesCourse = !item.media_usage || item.media_usage.length === 0
    } else if (selectedInstructorCourse !== 'all') {
      // Show only files used in the selected course
      matchesCourse = item.media_usage?.some(usage => usage.course_id === selectedInstructorCourse) || false
    }
    
    return matchesSearch && matchesFilter && matchesCourse
  })

  // Filter tags for autocomplete suggestions
  const tagSuggestions = existingTags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase()) && 
    searchQuery.length > 0
  ).slice(0, 5) // Limit to 5 suggestions

  const handleTagSuggestionClick = (tag: string) => {
    setSearchQuery(tag)
    setShowTagSuggestions(false)
  }

  // Drag selection hook with file IDs for range selection  
  const allFileIds = filteredMedia.map(item => item.id)
  const { isDragActive, dragRectangle, selectedDuringDrag } = useDragSelection(
    containerRef, 
    allFileIds,
    isSelectionMode // Only enable drag selection when in selection mode
  )

  // Temporarily disabled auto-enter/exit to debug issues
  // TODO: Re-enable after fixing selection issues
  
  // Temporarily disabled auto-exit to fix immediate toggle-off issue
  // TODO: Re-implement auto-exit with proper logic later
  
  // useEffect(() => {
  //   if (isSelectionMode && selectedFiles.size === 0) {
  //     console.log('🔄 Auto-exiting selection mode - no files selected')
  //     setIsSelectionMode(false)
  //   }
  // }, [selectedFiles.size, isSelectionMode])

  // Handle individual item selection with modifier key support
  const handleItemSelection = useCallback((fileId: string, event?: React.MouseEvent) => {
    // Only handle selection if in selection mode and not currently dragging
    if (!isSelectionMode || isDragActive) return
    
    if (event) {
      if (event.shiftKey && lastSelectedId && allFileIds.length > 0) {
        // Range selection with Shift+click
        selectRange(lastSelectedId, fileId, allFileIds)
      } else if (event.ctrlKey || event.metaKey) {
        // Add/remove from selection with Ctrl/Cmd+click
        toggleSelection(fileId)
      } else {
        // Normal click - replace selection
        clearSelection()
        toggleSelection(fileId)
      }
    } else {
      // Fallback for direct calls without event
      toggleSelection(fileId)
    }
  }, [isSelectionMode, isDragActive, toggleSelection, selectRange, clearSelection, lastSelectedId, allFileIds])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 bg-gradient-to-r from-muted to-muted/50 rounded w-48 animate-pulse mb-2" />
            <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-64 animate-pulse" />
          </div>
          <div className="h-6 bg-gradient-to-r from-muted to-muted/50 rounded w-16 animate-pulse" />
        </div>

        {/* Upload Zone Skeleton */}
        <div className="mb-8">
          <div className="h-32 bg-gradient-to-r from-muted to-muted/50 rounded-lg animate-pulse" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded flex-1 animate-pulse" />
          <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded w-36 animate-pulse" />
          <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded w-20 animate-pulse" />
          <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded w-20 animate-pulse" />
        </div>

        {/* Media Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="bg-card border rounded-lg overflow-hidden">
              <div className="aspect-video bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
              <div className="p-3">
                <div className="h-5 bg-gradient-to-r from-muted to-muted/50 rounded w-3/4 animate-pulse mb-2" />
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-12 animate-pulse" />
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-16 animate-pulse" />
                </div>
                <div className="h-5 bg-gradient-to-r from-muted to-muted/50 rounded w-16 animate-pulse" />
              </div>
            </div>
          ))}
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
            placeholder="Search by name or tags..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowTagSuggestions(e.target.value.length > 0)
            }}
            onFocus={() => setShowTagSuggestions(searchQuery.length > 0)}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)} // Delay to allow click
            className="pl-10"
          />
          
          {/* Tag Autocomplete Suggestions */}
          {showTagSuggestions && tagSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg">
              <div className="p-2 text-xs text-muted-foreground border-b">
                Tag suggestions:
              </div>
              <div className="max-h-40 overflow-y-auto">
                {tagSuggestions.map((tag, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                    onClick={() => handleTagSuggestionClick(tag)}
                  >
                    <Badge variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Search by tag
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter by Course */}
        <Select value={selectedInstructorCourse} onValueChange={setSelectedInstructorCourse}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem value="unused">Unused Files</SelectItem>
            <div className="my-1 h-px bg-border" />
            {realCourses.map(course => {
              // Count media files used in this course
              const mediaCount = mediaFiles.filter(file => 
                file.media_usage?.some(usage => usage.course_id === course.id)
              ).length
              
              return (
                <SelectItem key={course.id} value={course.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{course.title}</span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {mediaCount}
                    </Badge>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

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

        {/* Select Mode Toggle */}
        <Button 
          variant="outline"
          className={cn(
            "relative z-50 border-2 transition-colors",
            isSelectionMode 
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700" 
              : "bg-background border-border hover:bg-muted"
          )}
          onClick={() => {
            console.log('🔘 Select button clicked! Current mode:', isSelectionMode)
            setIsSelectionMode(!isSelectionMode)
            if (isSelectionMode) {
              console.log('🧹 Clearing selections on exit')
              clearSelection()
            }
          }}
          style={{ pointerEvents: 'all' }}
        >
          {isSelectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
          {isSelectionMode ? 'Exit Select' : 'Select'}
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

      {/* Media Grid/List with Selection Support */}
      <div ref={containerRef} className="relative">
        {/* Drag selection rectangle */}
        {isDragActive && dragRectangle && (
          <div 
            className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-10 rounded"
            style={{
              left: dragRectangle.left,
              top: dragRectangle.top,
              width: dragRectangle.width,
              height: dragRectangle.height
            }}
          />
        )}
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-700 ease-out">
            {filteredMedia
              .filter(item => !hiddenFiles.has(item.id)) // Remove hidden files from render
              .map((item) => {
              const isSelected = selectedFiles.has(item.id) || selectedDuringDrag.has(item.id)
              const isDeleting = deletingFiles.has(item.id)
              
              return (
                <div
                  key={item.id}
                  data-selectable={item.id}
                  className={cn(
                    "group relative bg-card border rounded-lg overflow-hidden hover:shadow-md cursor-pointer",
                    "transform",
                    isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
                    isDeleting && "opacity-0 scale-90 pointer-events-none transition-all duration-700 ease-out"
                  )}
                  onClick={(e) => {
                    // Only handle selection clicks when in selection mode
                    if (!isDeleting && isSelectionMode) {
                      handleItemSelection(item.id, e)
                    }
                  }}
                >
                  {/* Checkbox - only show in selection mode */}
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-20">
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center border-2",
                        isSelected 
                          ? "bg-blue-500 border-blue-500 text-white" 
                          : "bg-background border-gray-300 hover:border-gray-400"
                      )}>
                        {isSelected && <CheckSquare className="w-4 h-4" />}
                      </div>
                    </div>
                  )}
                  
                  
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
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={item.usage === 'Unused' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {item.usage}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      {renderTagBadges(item.tags, 2)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(item)
                        }}>
                          <Play className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          setDetailsFile(item)
                        }}>
                          <Info className="h-4 w-4 mr-2" />
                          Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2 transition-all duration-700 ease-out">
            {filteredMedia
              .filter(item => !hiddenFiles.has(item.id)) // Remove hidden files from render
              .map((item) => {
              const isSelected = selectedFiles.has(item.id) || selectedDuringDrag.has(item.id)
              const isDeleting = deletingFiles.has(item.id)
              
              return (
                <div
                  key={item.id}
                  data-selectable={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 cursor-pointer",
                    "transform",
                    isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
                    isDeleting && "opacity-0 scale-90 pointer-events-none transition-all duration-700 ease-out"
                  )}
                  onClick={(e) => {
                    // Only handle selection clicks when in selection mode
                    if (!isDeleting && isSelectionMode) {
                      handleItemSelection(item.id, e)
                    }
                  }}
                >
                  {/* Checkbox - only show in selection mode */}
                  {isSelectionMode && (
                    <div className="flex-shrink-0 mr-3">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center border-2",
                        isSelected 
                          ? "bg-blue-500 border-blue-500 text-white" 
                          : "bg-background border-gray-300 hover:border-gray-400"
                      )}>
                        {isSelected && <CheckSquare className="w-3 h-3" />}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.size} • {item.uploadedAt}</p>
                    <div className="mt-1">
                      {renderTagBadges(item.tags, 4)}
                    </div>
                  </div>
                  <Badge variant={item.usage === 'Unused' ? 'secondary' : 'outline'}>
                    {item.usage}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(item)
                      }}>
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        setDetailsFile(item)
                      }}>
                        <Info className="h-4 w-4 mr-2" />
                        Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No media files found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try adjusting your search terms' : 'Upload some files to get started'}
          </p>
        </div>
      )}

      {/* Bulk Selection Toolbar */}
      <BulkSelectionToolbar 
        onBulkDelete={handleBulkDelete} // Phase 2 enabled
        allFileIds={filteredMedia.map(item => item.id)}
      />

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