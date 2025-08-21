# Existing Media Library Implementation Plan

## Date: August 21, 2025
## Feature: Add Existing Media Files to Course Sections
## Status: 📋 PLANNING

---

## Overview

This implementation adds the ability for instructors to browse and add their existing unassigned media files to course sections, creating a media library experience within the course editor.

## Key Features

1. **Media Library Modal** - Browse all unassigned media files
2. **Filter & Search** - Filter by file type, search by name
3. **Bulk Selection** - Select multiple files to add at once
4. **Preview** - Preview media before adding
5. **Smart Assignment** - Auto-assign to selected chapter/section

---

## Implementation Architecture

### 1. New API Endpoints to Integrate

```typescript
// Get user's unassigned video files
GET /api/v1/media/user/unassigned-videos

// Get all user's media files  
GET /api/v1/media/user/media

// Existing assignment endpoint
POST /api/v1/content/sections/{section_id}/media
```

### 2. Component Structure

```
course/[id]/edit/
├── page.tsx (main edit page)
├── components/
│   ├── MediaLibraryModal.tsx (new)
│   ├── MediaCard.tsx (new)
│   ├── MediaPreview.tsx (new)
│   └── MediaFilters.tsx (new)
```

### 3. Store Updates

```typescript
// course-creation-slice.ts additions
interface MediaLibraryState {
  isLibraryOpen: boolean
  selectedChapterForLibrary: string | null
  libraryMedia: MediaFile[]
  libraryLoading: boolean
  libraryError: string | null
  selectedMediaIds: Set<string>
  libraryFilters: {
    type: 'all' | 'video' | 'audio' | 'document' | 'image'
    search: string
  }
  libraryPagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
```

---

## Detailed Implementation Tasks

### Task 1: Update API Client
**File**: `src/lib/api-client.ts`

```typescript
// Add new methods for media library
async getUserUnassignedVideos(params?: {
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', params.page.toString())
  if (params?.limit) query.append('limit', params.limit.toString())
  
  return this.get(`/api/v1/media/user/unassigned-videos?${query}`)
}

async getUserMedia(params?: {
  page?: number
  limit?: number
  type?: 'video' | 'audio' | 'document' | 'image'
}) {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', params.page.toString())
  if (params?.limit) query.append('limit', params.limit.toString())
  if (params?.type) query.append('type', params.type)
  
  return this.get(`/api/v1/media/user/media?${query}`)
}
```

### Task 2: Update Store with Library Functions
**File**: `src/stores/slices/course-creation-slice.ts`

```typescript
// Add media library state
mediaLibrary: {
  isOpen: false,
  targetChapterId: null,
  media: [],
  loading: false,
  error: null,
  selectedIds: new Set(),
  filters: {
    type: 'all',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  }
}

// Add media library actions
openMediaLibrary: (chapterId: string) => {
  set(state => ({
    mediaLibrary: {
      ...state.mediaLibrary,
      isOpen: true,
      targetChapterId: chapterId,
      selectedIds: new Set()
    }
  }))
  // Load media on open
  get().loadUnassignedMedia()
},

closeMediaLibrary: () => {
  set(state => ({
    mediaLibrary: {
      ...state.mediaLibrary,
      isOpen: false,
      targetChapterId: null,
      selectedIds: new Set()
    }
  }))
},

loadUnassignedMedia: async (page = 1) => {
  set(state => ({
    mediaLibrary: {
      ...state.mediaLibrary,
      loading: true,
      error: null
    }
  }))
  
  try {
    const { mediaLibrary } = get()
    const response = mediaLibrary.filters.type === 'all' 
      ? await apiClient.getUserUnassignedVideos({ page, limit: 20 })
      : await apiClient.getUserMedia({ 
          page, 
          limit: 20, 
          type: mediaLibrary.filters.type 
        })
    
    if (!response.error && response.data) {
      const mediaData = response.data.data
      set(state => ({
        mediaLibrary: {
          ...state.mediaLibrary,
          media: mediaData.videos || mediaData.mediaFiles || [],
          pagination: mediaData.pagination,
          loading: false
        }
      }))
    }
  } catch (error) {
    set(state => ({
      mediaLibrary: {
        ...state.mediaLibrary,
        loading: false,
        error: 'Failed to load media library'
      }
    }))
  }
},

toggleMediaSelection: (mediaId: string) => {
  set(state => {
    const newSelected = new Set(state.mediaLibrary.selectedIds)
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId)
    } else {
      newSelected.add(mediaId)
    }
    return {
      mediaLibrary: {
        ...state.mediaLibrary,
        selectedIds: newSelected
      }
    }
  })
},

assignSelectedMedia: async () => {
  const { mediaLibrary, courseCreation } = get()
  if (!mediaLibrary.targetChapterId || mediaLibrary.selectedIds.size === 0) {
    return
  }
  
  const selectedMedia = Array.from(mediaLibrary.selectedIds)
  const results = await Promise.allSettled(
    selectedMedia.map(mediaId => 
      get().assignMediaToSection(mediaId, mediaLibrary.targetChapterId!, {
        isPublished: true
      })
    )
  )
  
  // Check results
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  if (successful > 0) {
    // Reload course media to reflect changes
    if (courseCreation?.id) {
      await get().loadCourseMedia(courseCreation.id)
    }
  }
  
  // Close modal and reset
  get().closeMediaLibrary()
  
  return { successful, failed }
},

setMediaFilters: (filters: Partial<MediaLibraryFilters>) => {
  set(state => ({
    mediaLibrary: {
      ...state.mediaLibrary,
      filters: {
        ...state.mediaLibrary.filters,
        ...filters
      }
    }
  }))
  // Reload with new filters
  get().loadUnassignedMedia(1)
}
```

### Task 3: Create Media Library Modal Component
**File**: `src/app/instructor/course/[id]/edit/components/MediaLibraryModal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Video, Music, FileText, Image, Play, X } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { formatFileSize, formatDuration } from '@/lib/utils'
import { MediaFile } from '@/types/media'

export function MediaLibraryModal() {
  const {
    mediaLibrary,
    openMediaLibrary,
    closeMediaLibrary,
    loadUnassignedMedia,
    toggleMediaSelection,
    assignSelectedMedia,
    setMediaFilters
  } = useStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setMediaFilters({ search: searchQuery })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  const handleAssign = async () => {
    setIsAssigning(true)
    try {
      const result = await assignSelectedMedia()
      if (result?.successful) {
        // Show success toast
        console.log(`✅ Added ${result.successful} media files`)
      }
      if (result?.failed) {
        // Show error toast
        console.error(`❌ Failed to add ${result.failed} media files`)
      }
    } finally {
      setIsAssigning(false)
    }
  }
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'audio': return <Music className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }
  
  return (
    <Dialog open={mediaLibrary.isOpen} onOpenChange={closeMediaLibrary}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Type Filter */}
            <Tabs
              value={mediaLibrary.filters.type}
              onValueChange={(value) => setMediaFilters({ type: value as any })}
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
        </DialogHeader>
        
        <div className="flex-1 min-h-[400px]">
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
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {mediaLibrary.media.map((media) => (
                  <MediaCard
                    key={media.id}
                    media={media}
                    isSelected={mediaLibrary.selectedIds.has(media.id)}
                    onToggle={() => toggleMediaSelection(media.id)}
                  />
                ))}
              </div>
              
              {/* Pagination */}
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
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Media Card Component
function MediaCard({ 
  media, 
  isSelected, 
  onToggle 
}: {
  media: MediaFile
  isSelected: boolean
  onToggle: () => void
}) {
  const [showPreview, setShowPreview] = useState(false)
  
  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
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
              <h4 className="font-medium truncate">{media.title || media.originalFilename}</h4>
              <div className="flex items-center gap-2 mt-1">
                {getFileIcon(media.fileType)}
                <span className="text-sm text-gray-500">
                  {media.fileSizeFormatted}
                  {media.durationFormatted && ` • ${media.durationFormatted}`}
                </span>
              </div>
              {media.resolution && (
                <Badge variant="outline" className="mt-2">
                  {media.resolution}
                </Badge>
              )}
            </div>
            
            {media.thumbnailUrl && (
              <div className="relative ml-2">
                <img
                  src={media.thumbnailUrl}
                  alt={media.title}
                  className="w-20 h-20 object-cover rounded"
                />
                {media.fileType === 'video' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPreview(true)
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded"
                  >
                    <Play className="h-8 w-8 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          {media.processingStatus !== 'completed' && (
            <Badge variant={media.processingStatus === 'failed' ? 'destructive' : 'secondary'} className="mt-2">
              {media.processingStatus}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Preview Modal */}
      {showPreview && media.bestUrl && (
        <MediaPreview
          media={media}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

// Media Preview Component
function MediaPreview({ 
  media, 
  onClose 
}: {
  media: MediaFile
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{media.title || media.originalFilename}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {media.fileType === 'video' ? (
            <video
              src={media.bestUrl}
              controls
              className="w-full h-full"
              autoPlay
            />
          ) : media.fileType === 'image' ? (
            <img
              src={media.bestUrl}
              alt={media.title}
              className="w-full h-full object-contain"
            />
          ) : media.fileType === 'audio' ? (
            <div className="flex items-center justify-center h-full">
              <audio src={media.bestUrl} controls autoPlay />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <FileText className="h-16 w-16" />
              <p className="ml-4">Preview not available</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Task 4: Update Edit Page UI
**File**: `src/app/instructor/course/[id]/edit/page.tsx`

Add button to open media library in each chapter:

```typescript
// Add to chapter section
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => openMediaLibrary(chapter.id)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Add from Library
  </Button>
  
  <Button
    variant="outline"
    size="sm"
    onClick={() => /* existing upload handler */}
  >
    <Upload className="h-4 w-4 mr-2" />
    Upload New
  </Button>
</div>

// Add modal component at the end
<MediaLibraryModal />
```

---

## Implementation Steps

### Phase 1: API Integration (30 minutes)
1. Add new API methods to api-client.ts
2. Test endpoints with actual API
3. Handle response types properly

### Phase 2: Store Setup (45 minutes)
1. Add media library state to store
2. Implement all library actions
3. Connect to API client
4. Handle pagination and filters

### Phase 3: UI Components (60 minutes)
1. Create MediaLibraryModal component
2. Create MediaCard component
3. Create MediaPreview component
4. Add search and filter functionality
5. Implement selection logic

### Phase 4: Integration (30 minutes)
1. Add library button to edit page
2. Connect modal to store
3. Test assignment flow
4. Handle success/error states

### Phase 5: Polish (30 minutes)
1. Add loading states
2. Add error handling
3. Add success notifications
4. Optimize performance
5. Add keyboard shortcuts

---

## User Experience Flow

1. **Open Library**
   - Click "Add from Library" button in any chapter
   - Modal opens showing all unassigned media

2. **Browse & Filter**
   - Search by filename or title
   - Filter by media type
   - Preview media before selecting

3. **Select Media**
   - Click to select/deselect individual files
   - Use checkbox for explicit selection
   - See selection count at bottom

4. **Assign to Chapter**
   - Click "Add X File(s)" button
   - Media is assigned to the chapter
   - Modal closes automatically

5. **View Results**
   - Media appears in chapter immediately
   - Can reorder or remove as needed
   - Success notification shown

---

## Testing Checklist

### Functionality Tests
- [ ] Library modal opens and closes properly
- [ ] Media files load from API
- [ ] Pagination works correctly
- [ ] Search filters results in real-time
- [ ] Type filter switches content
- [ ] Selection state persists during browsing
- [ ] Multiple files can be selected
- [ ] Assignment works for single file
- [ ] Assignment works for multiple files
- [ ] Assigned files appear in chapter
- [ ] Error states display correctly

### UI/UX Tests
- [ ] Loading states show during API calls
- [ ] Empty state shows when no media
- [ ] Preview works for different file types
- [ ] Responsive design on mobile
- [ ] Keyboard navigation works
- [ ] Visual feedback for selection
- [ ] Smooth animations and transitions

### Edge Cases
- [ ] Handle API failures gracefully
- [ ] Handle large media lists (100+ items)
- [ ] Handle slow network connections
- [ ] Prevent duplicate assignments
- [ ] Handle processing/failed media
- [ ] Memory cleanup on unmount

---

## Performance Optimizations

1. **Lazy Loading**
   - Load media on modal open, not page load
   - Paginate results (20 per page)
   - Load thumbnails on demand

2. **Caching**
   - Cache media list for session
   - Invalidate after assignment
   - Reuse thumbnails across views

3. **Optimistic Updates**
   - Show assigned media immediately
   - Rollback on error
   - Queue API calls

4. **Bundle Size**
   - Lazy load modal component
   - Code split preview component
   - Tree shake unused icons

---

## Error Handling

```typescript
const errorMessages = {
  load: 'Failed to load media library. Please try again.',
  assign: 'Failed to assign some media files. Please try again.',
  network: 'Network error. Please check your connection.',
  permission: 'You don\'t have permission to assign these files.',
  processing: 'Some files are still processing. Please wait.',
}
```

---

## Future Enhancements

1. **Bulk Operations**
   - Select all/none buttons
   - Assign to multiple chapters
   - Bulk delete unassigned media

2. **Advanced Filters**
   - Date range filter
   - File size filter
   - Processing status filter
   - Sort options (name, date, size)

3. **Drag & Drop**
   - Drag from library to chapter
   - Reorder during selection
   - Drop zones in chapters

4. **Smart Features**
   - Recently used media
   - Suggested media based on course
   - Auto-organize by type
   - Duplicate detection

5. **Enhanced Preview**
   - Full-screen preview
   - Metadata display
   - Edit title/description in preview
   - Download option

---

## Success Metrics

- ✅ Users can browse all their unassigned media
- ✅ Search and filters work instantly
- ✅ Multiple files can be selected efficiently
- ✅ Assignment completes in < 2 seconds
- ✅ UI provides clear feedback at all times
- ✅ No performance degradation with 100+ files
- ✅ Works on mobile devices
- ✅ Accessible with keyboard navigation

---

## Notes

- Media library only shows files owned by the current user
- Only unassigned media or media from other courses can be added
- Processing status affects whether media can be assigned
- Use `bestUrl` for all previews (CDN preferred)
- Consider bandwidth when auto-playing previews
- Implement virtual scrolling for large lists
- Add analytics to track usage patterns