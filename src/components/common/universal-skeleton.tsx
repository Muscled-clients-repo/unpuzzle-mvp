import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton building block
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "bg-gradient-to-r from-muted to-muted/50 rounded animate-pulse",
      className
    )} />
  )
}

/**
 * Media card skeleton for grid layouts
 */
export function MediaCardSkeleton({ count = 8, className }: { count?: number, className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card border rounded-lg overflow-hidden">
          <div className="aspect-video bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * List item skeleton for list layouts  
 */
export function ListItemSkeleton({ count = 6, className }: { count?: number, className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-card border rounded-lg">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="aspect-video w-16 h-12">
            <Skeleton className="w-full h-full" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Table skeleton
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Table header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Form skeleton
 */
export function FormSkeleton({ 
  fields = 4, 
  className 
}: { 
  fields?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" /> {/* Cancel button */}
        <Skeleton className="h-10 w-16" /> {/* Save button */}
      </div>
    </div>
  )
}

/**
 * Stats cards skeleton
 */
export function StatsCardsSkeleton({ 
  count = 4, 
  className 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-4 h-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Page header skeleton
 */
export function PageHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex justify-between items-center mb-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" /> {/* Title */}
        <Skeleton className="h-4 w-64" /> {/* Description */}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-12 rounded-full" /> {/* Badge */}
        <Skeleton className="h-10 w-24" /> {/* Button */}
      </div>
    </div>
  )
}

/**
 * Filters section skeleton
 */
export function FiltersSectionSkeleton({ 
  itemCount = 5, 
  className 
}: { 
  itemCount?: number
  className?: string 
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 mb-6", className)}>
      {/* Search input skeleton - flex-1 */}
      <Skeleton className="h-10 flex-1" />
      
      {/* Additional filter skeletons */}
      {Array.from({ length: itemCount - 1 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-36" />
      ))}
    </div>
  )
}