import { Button } from "@/components/ui/button"
import { SortAsc, SortDesc } from "lucide-react"
import { cn } from "@/lib/utils"

type SortOrder = 'asc' | 'desc'

interface SortButtonProps {
  order: SortOrder
  onToggle: (order: SortOrder) => void
  label?: string
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

/**
 * Phase 2B: Reusable SortButton Component
 * Extracted from MediaFiltersSection for use across all instructor pages
 * 
 * Features:
 * - Toggle between ascending/descending
 * - Visual icons for sort direction
 * - Configurable label and styling
 */
export function SortButton({
  order,
  onToggle,
  label = "Sort",
  className,
  variant = "outline"
}: SortButtonProps) {
  const handleToggle = () => {
    onToggle(order === 'asc' ? 'desc' : 'asc')
  }

  return (
    <Button 
      variant={variant}
      onClick={handleToggle}
      className={className}
    >
      {order === 'asc' ? 
        <SortAsc className="h-4 w-4 mr-2" /> : 
        <SortDesc className="h-4 w-4 mr-2" />
      }
      {label}
    </Button>
  )
}