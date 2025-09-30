import { MediaCard } from "./media-card"
import { FileVideo } from "lucide-react"

interface MediaFile {
  id: string
  name: string
  size: string
  uploadedAt: string
  type: string
  usage: string
  tags?: string[] | null
  // Raw database fields for UI formatting
  file_size: number | null
  duration_seconds: number | null
}

interface DragRectangle {
  left: number
  top: number
  width: number
  height: number
}

interface MediaGridProps {
  filteredMedia: MediaFile[]
  hiddenFiles: Set<string>
  selectedFiles: Set<string>
  selectedDuringDrag: Set<string>
  deletingFiles: Set<string>
  viewMode: 'grid' | 'list'
  isSelectionMode: boolean
  searchQuery: string
  
  // Drag selection
  isDragActive: boolean
  dragRectangle: DragRectangle | null
  containerRef: React.RefObject<HTMLDivElement>
  
  // Event handlers
  handleItemSelection: (id: string, event: React.MouseEvent) => void
  handlePreview: (item: MediaFile) => void
  setDetailsFile: (item: MediaFile) => void
  handleDelete: (id: string) => void
  handleEditTags: (fileId: string) => void
  renderTagBadges: (tags: string[] | null | undefined, maxVisible: number) => React.ReactNode
}

/**
 * CHECKPOINT 4: MediaGrid component
 * Handles the container, drag selection, empty states, and renders MediaCard components
 */
export function MediaGrid({
  filteredMedia,
  hiddenFiles,
  selectedFiles,
  selectedDuringDrag,
  deletingFiles,
  viewMode,
  isSelectionMode,
  searchQuery,
  isDragActive,
  dragRectangle,
  containerRef,
  handleItemSelection,
  handlePreview,
  setDetailsFile,
  handleDelete,
  handleEditTags,
  renderTagBadges
}: MediaGridProps) {
  // Empty state
  if (filteredMedia.length === 0) {
    return (
      <div className="text-center py-12">
        <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No media files found</h3>
        <p className="text-muted-foreground">
          {searchQuery ? 'Try adjusting your search terms' : 'Upload some files to get started'}
        </p>
      </div>
    )
  }

  return (
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
            .filter(item => !hiddenFiles.has(item.id))
            .map((item) => {
            const isSelected = selectedFiles.has(item.id) || selectedDuringDrag.has(item.id)
            const isDeleting = deletingFiles.has(item.id)
            
            return (
              <MediaCard
                key={item.id}
                item={item}
                viewMode="grid"
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isDeleting={isDeleting}
                onItemSelection={handleItemSelection}
                onPreview={handlePreview}
                onShowDetails={setDetailsFile}
                onDelete={handleDelete}
                onEditTags={handleEditTags}
                renderTagBadges={renderTagBadges}
              />
            )
          })}
        </div>
      ) : (
        <div className="space-y-2 transition-all duration-700 ease-out">
          {filteredMedia
            .filter(item => !hiddenFiles.has(item.id))
            .map((item) => {
            const isSelected = selectedFiles.has(item.id) || selectedDuringDrag.has(item.id)
            const isDeleting = deletingFiles.has(item.id)
            
            return (
              <MediaCard
                key={item.id}
                item={item}
                viewMode="list"
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isDeleting={isDeleting}
                onItemSelection={handleItemSelection}
                onPreview={handlePreview}
                onShowDetails={setDetailsFile}
                onDelete={handleDelete}
                onEditTags={handleEditTags}
                renderTagBadges={renderTagBadges}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}