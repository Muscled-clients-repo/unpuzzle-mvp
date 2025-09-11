import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContentHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PageContentHeader({
  title,
  description,
  children,
  className
}: PageContentHeaderProps) {
  return (
    <div className={cn("flex justify-between items-center mb-6", className)}>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}