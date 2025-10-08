"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useStudioProjects, useDeleteStudioProject, useProjectTags, useBulkDeleteProjects } from "@/hooks/use-studio-queries"
import { useProjectsSelectionStore } from "@/stores/projects-selection-store"
import { useUnifiedDragSelection } from "@/hooks/use-unified-drag-selection"
import { ErrorBoundary, LoadingSpinner, ErrorFallback } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Clock,
  AlertCircle,
  Video,
  PlayCircle,
  Film,
  Tag,
  CheckSquare,
  Square
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageContainer } from "@/components/layout/page-container"
import { PageContentHeader } from "@/components/layout/page-content-header"
import { StatsGrid } from "@/components/layout/stats-grid"
import { StatsCardsSkeleton } from "@/components/common/universal-skeleton"
import { FiltersSection } from "@/components/layout"
import { SearchInput, FilterDropdown } from "@/components/ui/filters"
import { BulkProjectSelectionToolbar } from "@/components/studio/BulkProjectSelectionToolbar"
import { cn } from "@/lib/utils"

export default function StudioProjectsPage() {
  const router = useRouter()
  const { data: projects, isLoading, error } = useStudioProjects()
  const { data: allTags = [] } = useProjectTags()
  const { mutate: deleteProject } = useDeleteStudioProject()
  const { mutate: bulkDeleteProjects } = useBulkDeleteProjects()

  // Selection store
  const selectionStore = useProjectsSelectionStore()
  const {
    selectedProjects,
    lastSelectedId,
    toggleProjectSelection,
    selectRange,
    clearProjectSelection,
    dragSelection,
    startDragSelection,
    updateDragSelection,
    finalizeDragSelection,
    cancelDragSelection
  } = selectionStore

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tagFilter, setTagFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Container ref for drag selection
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter projects
  const filteredProjects = (projects || []).filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "draft" && project.is_draft) ||
      (statusFilter === "published" && !project.is_draft)
    const matchesTag = tagFilter === "all" ||
      (project.tags && project.tags.includes(tagFilter))
    return matchesSearch && matchesStatus && matchesTag
  })

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'lastUpdated':
        return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'clips':
        return (b.timeline_state?.clips?.length || 0) - (a.timeline_state?.clips?.length || 0)
      default:
        return 0
    }
  })

  // All project IDs for range selection
  const allProjectIds = sortedProjects.map(p => p.id)

  // Unified drag selection hook
  const { isDragActive, dragRectangle, selectedDuringDrag } = useUnifiedDragSelection({
    containerRef,
    allItemIds: allProjectIds,
    enabled: isSelectionMode, // Only enable when in selection mode
    dataAttribute: 'data-selectable-project',
    store: {
      dragSelection,
      startDragSelection,
      updateDragSelection,
      finalizeDragSelection,
      cancelDragSelection
    }
  })

  // Handle single delete confirmation
  const handleDelete = (projectId: string) => {
    deleteProject(projectId, {
      onSuccess: () => {
        setProjectToDelete(null)
      }
    })
  }

  // Handle bulk delete
  const handleBulkDelete = (projectIds: string[]) => {
    bulkDeleteProjects(projectIds, {
      onSuccess: () => {
        clearProjectSelection()
      }
    })
  }

  // Handle project card click (with selection support) - matches media route pattern exactly
  const handleProjectClick = useCallback((projectId: string, event?: React.MouseEvent) => {
    // Only handle selection if in selection mode and not currently dragging
    if (!isSelectionMode || isDragActive) return

    if (event) {
      if (event.shiftKey && lastSelectedId && allProjectIds.length > 0) {
        // Range selection with Shift+click
        selectRange(lastSelectedId, projectId, allProjectIds)
      } else if (event.ctrlKey || event.metaKey) {
        // Add/remove from selection with Ctrl/Cmd+click
        toggleProjectSelection(projectId)
      } else {
        // Normal click - replace selection
        clearProjectSelection()
        toggleProjectSelection(projectId)
      }
    } else {
      // Fallback for direct calls without event
      toggleProjectSelection(projectId)
    }
  }, [isSelectionMode, isDragActive, toggleProjectSelection, selectRange, clearProjectSelection, lastSelectedId, allProjectIds])

  // Handle opening project in editor (when not in selection mode)
  const handleOpenProject = useCallback((e: React.MouseEvent, projectId: string) => {
    if (!isSelectionMode) {
      e.stopPropagation()
      router.push(`/instructor/studio?projectId=${projectId}`)
    }
  }, [isSelectionMode, router])

  // Show error state
  if (error) return <ErrorFallback error={error} />

  // Stats calculations
  const totalProjects = projects?.length || 0
  const draftProjects = projects?.filter(p => p.is_draft)?.length || 0
  const publishedProjects = projects?.filter(p => !p.is_draft)?.length || 0
  const totalClips = projects?.reduce((acc, p) => acc + (p.timeline_state?.clips?.length || 0), 0) || 0

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <ErrorBoundary>
      <PageContainer>
        {/* Header */}
        <PageContentHeader
          title="Video Projects"
          description="Manage your video editing projects and timelines"
        >
          <Button onClick={() => router.push('/instructor/studio')}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </PageContentHeader>

        {/* Stats Overview */}
        {isLoading ? (
          <StatsCardsSkeleton count={4} />
        ) : (
          <StatsGrid columns={4}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {publishedProjects} published, {draftProjects} drafts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClips}</div>
                <p className="text-xs text-muted-foreground">
                  Across all projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Projects</CardTitle>
                <Edit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draftProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Work in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exported Videos</CardTitle>
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects?.filter(p => p.last_export_id)?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Saved to media library
                </p>
              </CardContent>
            </Card>
          </StatsGrid>
        )}

        {/* Filters and Search */}
        <FiltersSection className="mt-6 mb-6">
          <SearchInput
            placeholder="Search projects..."
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
            width="w-[180px]"
            icon={<Filter className="h-4 w-4" />}
            options={[
              { value: "all", label: "All Projects" },
              { value: "draft", label: "Drafts" },
              { value: "published", label: "Published" }
            ]}
          />

          <FilterDropdown
            value={tagFilter}
            onChange={setTagFilter}
            placeholder="Filter by tag"
            width="w-[180px]"
            icon={<Tag className="h-4 w-4" />}
            options={[
              { value: "all", label: "All Tags" },
              ...allTags.map(tag => ({ value: tag, label: tag }))
            ]}
          />

          <FilterDropdown
            value={sortBy}
            onChange={setSortBy}
            placeholder="Sort by"
            width="w-[180px]"
            options={[
              { value: "lastUpdated", label: "Last Updated" },
              { value: "title", label: "Project Name" },
              { value: "clips", label: "Most Clips" }
            ]}
          />

          {/* Selection Mode Button */}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={() => {
              if (isSelectionMode) {
                clearProjectSelection()
              }
              setIsSelectionMode(!isSelectionMode)
            }}
          >
            {isSelectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            Select
          </Button>
        </FiltersSection>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || tagFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first video project"}
              </p>
              {!searchQuery && statusFilter === "all" && tagFilter === "all" && (
                <Button onClick={() => router.push('/instructor/studio')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            ref={containerRef}
            className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
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

            {sortedProjects.map((project) => {
              const isSelected = selectedProjects.has(project.id) || selectedDuringDrag.has(project.id)

              return (
                <Card
                  key={project.id}
                  data-selectable-project={project.id}
                  className={cn(
                    "flex flex-col hover:shadow-lg transition-all relative group cursor-pointer",
                    isSelected && "ring-2 ring-primary",
                    !isSelectionMode && "hover:ring-1 hover:ring-border",
                    isSelectionMode && "select-none"
                  )}
                  onClick={(e) => handleProjectClick(project.id, e)}
                >
                  {/* Selection checkbox - only show in selection mode */}
                  {isSelectionMode && (
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={isSelected}
                        className="h-5 w-5 border-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <CardHeader className={cn(isSelectionMode && "pl-12")}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {project.description || 'No description'}
                        </CardDescription>
                      </div>
                      {!isSelectionMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleOpenProject(e, project.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Open in Editor
                            </DropdownMenuItem>
                            {project.last_export_id && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                router.push('/instructor/media')
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Export
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setProjectToDelete(project.id)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      {/* Project stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          <span>{project.timeline_state?.clips?.length || 0} clips</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(project.updated_at)}</span>
                        </div>
                      </div>

                      {/* Tags display */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex items-center gap-2">
                        <Badge variant={project.is_draft ? "secondary" : "default"}>
                          {project.is_draft ? "Draft" : "Published"}
                        </Badge>
                        {project.last_export_id && (
                          <Badge variant="outline" className="text-green-600">
                            <PlayCircle className="mr-1 h-3 w-3" />
                            Exported
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {!isSelectionMode && (
                    <CardFooter className="border-t pt-4">
                      <Button
                        className="w-full"
                        onClick={(e) => handleOpenProject(e, project.id)}
                      >
                        Open Project
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </PageContainer>

      {/* Bulk Selection Toolbar */}
      <BulkProjectSelectionToolbar
        onBulkDelete={handleBulkDelete}
        allProjectIds={sortedProjects.map(p => p.id)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              Exported videos in your media library will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => projectToDelete && handleDelete(projectToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  )
}
