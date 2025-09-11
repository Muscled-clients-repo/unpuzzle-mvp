import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FiltersSection } from "@/components/layout"
import { Search, Filter, SortAsc, SortDesc, CheckSquare, Square, Grid3X3, List } from "lucide-react"
import { cn } from "@/lib/utils"

interface Course {
  id: string
  title: string
}

interface MediaFile {
  media_usage?: Array<{ course_id: string }>
}

interface MediaFiltersSectionProps {
  // Search props
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  showTagSuggestions: boolean
  onShowTagSuggestions: (show: boolean) => void
  tagSuggestions: string[]
  onTagSuggestionClick: (tag: string) => void
  
  // Course filter props
  selectedCourse: string
  onSelectedCourseChange: (courseId: string) => void
  courses: Course[]
  mediaFiles: MediaFile[]
  
  // CHECKPOINT 2B: Filter and sort props
  filterType: string
  onFilterTypeChange: (type: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
  
  // CHECKPOINT 2C: Selection and view mode props
  isSelectionMode: boolean
  onSelectionModeChange: (mode: boolean) => void
  onClearSelection: () => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

/**
 * CHECKPOINT 2B: Search + Course dropdown + Filter + Sort
 * Extracts search with tag autocomplete, course filtering, type filter, and sort from media page
 */
export function MediaFiltersSection({
  searchQuery,
  onSearchQueryChange,
  showTagSuggestions,
  onShowTagSuggestions,
  tagSuggestions,
  onTagSuggestionClick,
  selectedCourse,
  onSelectedCourseChange,
  courses,
  mediaFiles,
  filterType,
  onFilterTypeChange,
  sortOrder,
  onSortOrderChange,
  // CHECKPOINT 2C: Selection and view mode props
  isSelectionMode,
  onSelectionModeChange,
  onClearSelection,
  viewMode,
  onViewModeChange
}: MediaFiltersSectionProps) {
  return (
    <FiltersSection>
      {/* Search with Tag Autocomplete */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or tags..."
          value={searchQuery}
          onChange={(e) => {
            onSearchQueryChange(e.target.value)
            onShowTagSuggestions(e.target.value.length > 0)
          }}
          onFocus={() => onShowTagSuggestions(searchQuery.length > 0)}
          onBlur={() => setTimeout(() => onShowTagSuggestions(false), 200)}
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
                  onClick={() => onTagSuggestionClick(tag)}
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

      {/* Course Filter */}
      <Select value={selectedCourse} onValueChange={onSelectedCourseChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Courses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Courses</SelectItem>
          <SelectItem value="unused">Unused Files</SelectItem>
          <div className="my-1 h-px bg-border" />
          {courses.map(course => {
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

      {/* CHECKPOINT 2B: Filter by Type */}
      <Select value={filterType} onValueChange={onFilterTypeChange}>
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

      {/* CHECKPOINT 2B: Sort Button */}
      <Button 
        variant="outline" 
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
        Date
      </Button>

      {/* CHECKPOINT 2C: Selection Mode Toggle */}
      <Button
        variant={isSelectionMode ? "default" : "outline"}
        onClick={() => {
          if (isSelectionMode) {
            onClearSelection()
          }
          onSelectionModeChange(!isSelectionMode)
        }}
      >
        {isSelectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
        Select
      </Button>

      {/* CHECKPOINT 2C: View Mode Toggle */}
      <div className="flex border rounded-md">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="rounded-r-none border-r-0"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </FiltersSection>
  )
}