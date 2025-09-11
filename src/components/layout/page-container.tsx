import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: "7xl" | "6xl" | "5xl" | "4xl" | "full"
}

/**
 * Standardized page container for instructor pages.
 * Extracts the repeated `container mx-auto p-6 max-w-7xl` pattern
 * found across all instructor routes.
 */
export function PageContainer({ 
  children, 
  className,
  maxWidth = "7xl"
}: PageContainerProps) {
  const maxWidthClasses = {
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl", 
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    "full": "max-w-full"
  }

  return (
    <div className={cn(
      "container mx-auto p-6",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  )
}