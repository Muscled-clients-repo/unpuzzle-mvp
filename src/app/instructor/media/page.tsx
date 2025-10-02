"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
import { BulkTagModal } from "@/components/media/BulkTagModal"
import { MediaPageContentHeader } from "@/components/media/media-page-content-header"
import { MediaFiltersSection } from "@/components/media/media-filters-section"
import { MediaGrid } from "@/components/media/media-grid"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeaderSkeleton, FiltersSectionSkeleton, MediaCardSkeleton, Skeleton } from "@/components/common/universal-skeleton"
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [previewingFile, setPreviewingFile] = useState<any>(null)
  const [detailsFile, setDetailsFile] = useState<any>(null)
  const [showSingleTagModal, setShowSingleTagModal] = useState(false)
  const [singleTagFileId, setSingleTagFileId] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [allLoadedMedia, setAllLoadedMedia] = useState<any[]>([])

  // State for tracking files being deleted (for animation)
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [hiddenFiles, setHiddenFiles] = useState<Set<string>>(new Set())

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])
  
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
  const { data: mediaData, isLoading, error, isFetching } = useMediaFiles({
    page: currentPage,
    limit: 30
  })

  const { data: existingTags = [] } = useExistingTags()
  const deleteMutation = useDeleteMediaFile()
  const uploadMutation = useUploadMediaFile()
  const bulkDeleteMutation = useBulkDeleteFiles()

  // Accumulate all loaded media across pages
  useEffect(() => {
    if (mediaData?.media) {
      setAllLoadedMedia(prev => {
        // If it's page 1, replace all
        if (currentPage === 1) {
          return mediaData.media
        }
        // Otherwise, append new media
        const existingIds = new Set(prev.map(m => m.id))
        const newMedia = mediaData.media.filter(m => !existingIds.has(m.id))
        return [...prev, ...newMedia]
      })
    }
  }, [mediaData, currentPage])

  const mediaFiles = allLoadedMedia
  const hasMore = mediaData?.hasMore || false
  const totalCount = mediaData?.totalCount || 0

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

  const handleEditTags = (fileId: string) => {
    setSingleTagFileId(fileId)
    setShowSingleTagModal(true)
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


  // Memoized filtering - only recalculates when dependencies change
  const filteredMedia = useMemo(() => {
    return mediaFiles.filter(item => {
      const searchLower = debouncedSearchQuery.toLowerCase()
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
  }, [mediaFiles, debouncedSearchQuery, filterType, selectedInstructorCourse])

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
      <PageContainer>
        {/* Header Skeleton */}
        <PageHeaderSkeleton />

        {/* Upload Zone Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-32 rounded-lg" />
        </div>

        {/* Filters Skeleton */}
        <FiltersSectionSkeleton itemCount={5} />

        {/* Media Grid Skeleton */}
        <MediaCardSkeleton count={8} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load media files</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Header */}
      <MediaPageContentHeader 
        fileCount={filteredMedia.length}
      />

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

      {/* CHECKPOINT 2C: Complete Search + Course + Filter + Sort + Selection + View */}
      <MediaFiltersSection
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        showTagSuggestions={showTagSuggestions}
        onShowTagSuggestions={setShowTagSuggestions}
        tagSuggestions={tagSuggestions}
        onTagSuggestionClick={handleTagSuggestionClick}
        selectedCourse={selectedInstructorCourse}
        onSelectedCourseChange={setSelectedInstructorCourse}
        courses={realCourses}
        mediaFiles={mediaFiles}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        isSelectionMode={isSelectionMode}
        onSelectionModeChange={setIsSelectionMode}
        onClearSelection={clearSelection}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* CHECKPOINT 4: Media Grid/List with Selection Support */}
      <MediaGrid
        filteredMedia={filteredMedia}
        hiddenFiles={hiddenFiles}
        selectedFiles={selectedFiles}
        selectedDuringDrag={selectedDuringDrag}
        deletingFiles={deletingFiles}
        viewMode={viewMode}
        isSelectionMode={isSelectionMode}
        searchQuery={searchQuery}
        isDragActive={isDragActive}
        dragRectangle={dragRectangle}
        containerRef={containerRef}
        handleItemSelection={handleItemSelection}
        handlePreview={handlePreview}
        setDetailsFile={setDetailsFile}
        handleDelete={handleDelete}
        handleEditTags={handleEditTags}
        renderTagBadges={renderTagBadges}
      />

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-8 mb-8">
          <Button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={isFetching}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            {isFetching ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Loading...
              </>
            ) : (
              <>
                Load More ({totalCount - allLoadedMedia.length} remaining)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Showing count indicator */}
      {!isLoading && mediaFiles.length > 0 && (
        <div className="text-center text-sm text-muted-foreground mb-4">
          Showing {allLoadedMedia.length} of {totalCount} files
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

      {/* Single File Tag Edit Modal */}
      <BulkTagModal
        isOpen={showSingleTagModal}
        onClose={() => {
          setShowSingleTagModal(false)
          setSingleTagFileId(null)
        }}
        selectedFileIds={singleTagFileId ? [singleTagFileId] : []}
        selectedFileCount={1}
      />

      {/* Floating Upload Panel - Google Drive style */}
      <FloatingUploadPanel
        items={mediaFiles.filter(file => 
          file.status === 'uploading' || 
          file.status === 'processing' || 
          (file.status === 'ready' && typeof file.uploadProgress === 'number')
        )}
        position="bottom-right" // Can be changed to "top" or "bottom-center"
      />
    </PageContainer>
  )
}