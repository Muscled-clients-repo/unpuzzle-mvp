"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface AIInteractionsCounterProps {
  used: number
  limit: number
  isFloating?: boolean
  className?: string
}

export function AIInteractionsCounter({ 
  used = 7, 
  limit = 10, 
  isFloating = true,
  className 
}: AIInteractionsCounterProps) {
  const percentage = (used / limit) * 100
  const isNearLimit = percentage >= 70
  
  if (isFloating) {
    return (
      <div className={cn(
        "fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-2 duration-300",
        "rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        "border shadow-lg p-3 min-w-[160px]",
        className
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">AI Interactions</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-2xl font-bold",
              isNearLimit && "text-orange-500"
            )}>
              {used}
            </span>
            <span className="text-lg text-muted-foreground">/ {limit}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isNearLimit ? "bg-orange-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {limit - used} interactions left
          </p>
          {isNearLimit && (
            <Link
              href="/pricing"
              className="block text-xs font-medium text-primary hover:underline text-center mt-2 p-2 bg-primary/10 rounded"
            >
              Upgrade for unlimited
            </Link>
          )}
        </div>
      </div>
    )
  }
  
  // Non-floating version for sidebar
  return (
    <div className={cn("rounded-lg bg-primary/10 p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">AI Interactions</p>
      </div>
      <p className="text-2xl font-bold">{used} / {limit}</p>
      <p className="text-xs text-muted-foreground">Free tier limit</p>
      <Link
        href="/pricing"
        className="mt-2 block text-xs font-medium text-primary hover:underline"
      >
        Upgrade for unlimited
      </Link>
    </div>
  )
}