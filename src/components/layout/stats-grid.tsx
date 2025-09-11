import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StatsGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

/**
 * Phase 1: Layout Foundation - StatsGrid Component
 * Provides consistent grid layout for metric/stat cards across instructor pages
 * 
 * Usage:
 * <StatsGrid columns={4}>
 *   <StatCard title="Total Courses" value="12" />
 *   <StatCard title="Students" value="1,234" />
 * </StatsGrid>
 */
export function StatsGrid({ 
  children, 
  columns = 4, 
  className 
}: StatsGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      {
        "sm:grid-cols-2": columns >= 2,
        "lg:grid-cols-2": columns === 2,
        "lg:grid-cols-3": columns === 3,
        "lg:grid-cols-4": columns === 4,
      },
      className
    )}>
      {children}
    </div>
  )
}