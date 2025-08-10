"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CourseCardSkeletonProps {
  count?: number
  className?: string
}

export function CourseCardSkeleton({ count = 1, className }: CourseCardSkeletonProps) {
  return (
    <div className={cn('grid gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="p-0">
            {/* Thumbnail skeleton */}
            <div className="aspect-video bg-gray-200 animate-pulse" />
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
              
              {/* Description skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
              
              {/* Instructor and metadata skeleton */}
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                </div>
              </div>
              
              {/* Tags skeleton */}
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-14" />
              </div>
              
              {/* Stats and price skeleton */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Grid layout skeleton for course cards
export function CourseGridSkeleton({ count = 6, className }: CourseCardSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video bg-gray-200 animate-pulse" />
          
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 bg-gray-200 rounded animate-pulse w-4/5" />
              </div>
              
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Video player skeleton
export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Video area skeleton */}
      <div className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
      
      {/* Video info skeleton */}
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
        
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
        </div>
      </div>
    </div>
  )
}

// Chat message skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
      )}
      
      <div className={cn('max-w-xs lg:max-w-md space-y-2', isUser ? 'order-first' : '')}>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
      )}
    </div>
  )
}