import { Button } from "@/components/ui/button"
import { Grid3X3, List } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = 'grid' | 'list'

interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

/**
 * Phase 2B: Reusable ViewModeToggle Component
 * Extracted from MediaFiltersSection for use across all instructor pages
 * 
 * Features:
 * - Toggle between grid and list view modes
 * - Connected button group styling
 * - Visual icons for each mode
 */
export function ViewModeToggle({
  mode,
  onChange,
  className
}: ViewModeToggleProps) {
  return (
    <div className={cn("flex border rounded-md", className)}>
      <Button
        variant={mode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="rounded-r-none border-r-0"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        variant={mode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('list')}
        className="rounded-l-none"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}