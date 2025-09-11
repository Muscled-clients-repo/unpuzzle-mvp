import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FiltersSection } from "@/components/layout"
import { SearchInput, FilterDropdown, SortButton, ViewModeToggle } from "@/components/ui/filters"
import { CheckSquare, Square, Filter } from "lucide-react"
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
      <SearchInput
        placeholder="Search by name or tags..."
        value={searchQuery}
        onChange={onSearchQueryChange}
        showSuggestions={showTagSuggestions}
        onShowSuggestions={onShowTagSuggestions}
        suggestions={tagSuggestions}
        onSuggestionClick={onTagSuggestionClick}
        suggestionsLabel="Tag suggestions:"
      />

      {/* Course Filter */}
      <FilterDropdown
        value={selectedCourse}
        onChange={onSelectedCourseChange}
        placeholder="All Courses"
        width="w-[180px]"
        options={[
          { value: "all", label: "All Courses" },
          { value: "unused", label: "Unused Files", divider: true },
          ...courses.map(course => ({
            value: course.id,
            label: course.title,
            count: mediaFiles.filter(file => 
              file.media_usage?.some(usage => usage.course_id === course.id)
            ).length
          }))
        ]}
      />

      {/* Filter by Type */}
      <FilterDropdown
        value={filterType}
        onChange={onFilterTypeChange}
        placeholder="All Files"
        width="w-[140px]"
        icon={<Filter className="h-4 w-4" />}
        options={[
          { value: "all", label: "All Files" },
          { value: "video", label: "Videos" },
          { value: "image", label: "Images" },
          { value: "document", label: "Documents" }
        ]}
      />

      {/* Sort Button */}
      <SortButton
        order={sortOrder}
        onToggle={onSortOrderChange}
        label="Date"
      />

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

      {/* View Mode Toggle */}
      <ViewModeToggle
        mode={viewMode}
        onChange={onViewModeChange}
      />
    </FiltersSection>
  )
}