import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CheckSquare, MoreHorizontal, Play, Info, Trash2, FileVideo, Image, File, Clock, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration, formatFileSize } from "@/lib/format-utils"

interface MediaFile {
  id: string
  name: string
  size: string
  uploadedAt: string
  type: string
  usage: string
  tags?: string[] | null
  // Raw database fields
  file_size: number | null
  duration_seconds: number | null
}

interface MediaCardProps {
  item: MediaFile
  viewMode: 'grid' | 'list'
  isSelectionMode: boolean
  isSelected: boolean
  isDeleting: boolean
  onItemSelection: (id: string, event: React.MouseEvent) => void
  onPreview: (item: MediaFile) => void
  onShowDetails: (item: MediaFile) => void
  onDelete: (id: string) => void
  renderTagBadges: (tags: string[] | null | undefined, maxVisible: number) => React.ReactNode
}

/**
 * CHECKPOINT 3: Unified MediaCard component
 * Renders media files in both grid and list view modes with selection support
 */
export function MediaCard({
  item,
  viewMode,
  isSelectionMode,
  isSelected,
  isDeleting,
  onItemSelection,
  onPreview,
  onShowDetails,
  onDelete,
  renderTagBadges
}: MediaCardProps) {

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only handle selection clicks when in selection mode
    if (!isDeleting && isSelectionMode) {
      onItemSelection(item.id, e)
    }
  }

  if (viewMode === 'grid') {
    return (
      <div
        data-selectable={item.id}
        className={cn(
          "group relative bg-card border rounded-lg overflow-hidden hover:shadow-md cursor-pointer",
          "transform",
          isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
          isDeleting && "opacity-0 scale-90 pointer-events-none transition-all duration-700 ease-out"
        )}
        onClick={handleClick}
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

          {/* File info with icons */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              <span>{formatFileSize(item.file_size)}</span>
            </div>
            {item.type === 'video' && item.duration_seconds && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(item.duration_seconds)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <Badge
              variant={item.usage === 'Unused' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {item.usage}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.uploadedAt}</span>
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
                onPreview(item)
              }}>
                <Play className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onShowDetails(item)
              }}>
                <Info className="h-4 w-4 mr-2" />
                Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.id)
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
  }

  // List view
  return (
    <div
      data-selectable={item.id}
      className={cn(
        "flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-accent/50 cursor-pointer",
        "transform",
        isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
        isDeleting && "opacity-0 scale-90 pointer-events-none transition-all duration-700 ease-out"
      )}
      onClick={handleClick}
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
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{formatFileSize(item.file_size)}</span>
          </div>
          {item.type === 'video' && item.duration_seconds && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(item.duration_seconds)}</span>
            </div>
          )}
          <span>{item.uploadedAt}</span>
        </div>
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
            onPreview(item)
          }}>
            <Play className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onShowDetails(item)
          }}>
            <Info className="h-4 w-4 mr-2" />
            Details
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}