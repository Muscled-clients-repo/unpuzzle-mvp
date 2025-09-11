import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FiltersSectionProps {
  children: ReactNode
  className?: string
}

/**
 * Standardized container for filter controls across instructor pages.
 * Extracts the repeated `flex flex-col sm:flex-row gap-4 mb-6` pattern
 * found in media, courses, students, and other list pages.
 */
export function FiltersSection({ 
  children, 
  className 
}: FiltersSectionProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-4 mb-6",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Skeleton version for loading states
 */
export function FiltersSectionSkeleton({ 
  itemCount = 4,
  className 
}: { 
  itemCount?: number
  className?: string
}) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-4 mb-6",
      className
    )}>
      {/* Search input skeleton - flex-1 */}
      <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded flex-1 animate-pulse" />
      
      {/* Additional filter skeletons */}
      {Array.from({ length: itemCount - 1 }, (_, i) => (
        <div 
          key={i}
          className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded w-36 animate-pulse" 
        />
      ))}
    </div>
  )
}