"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

// Grid layout skeleton that matches AICourseCard structure
export function CourseGridSkeleton({ count = 6, className }: CourseCardSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="group relative overflow-hidden">
          {/* AI Match Badge Skeleton */}
          <div className="absolute right-3 top-3 z-10">
            <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* Thumbnail Skeleton */}
          <div className="relative aspect-video bg-gray-200 animate-pulse" />

          {/* Header */}
          <CardHeader className="pb-3">
            <div className="space-y-2">
              {/* Title */}
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              {/* Description */}
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="pb-3">
            {/* Course Stats */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-6 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            {/* AI Features Preview */}
            <div className="space-y-2">
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>

            {/* Instructor and Price */}
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>

          {/* Footer */}
          <div className="p-6 pt-0">
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 h-9 bg-gray-200 rounded animate-pulse" />
                <div className="w-9 h-9 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-3 w-32 mx-auto bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// Course Filters Skeleton
export function CourseFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 mb-8', className)}>
      {/* Search and Sort */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

// Course Details Page Skeleton
export function CourseDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-0', className)}>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-background to-muted py-12">
        <div className="container px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Course Info - Left Column */}
            <div className="lg:col-span-2">
              {/* Badges */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-28 bg-gray-200 rounded-full animate-pulse" />
              </div>
              
              {/* Title */}
              <div className="mb-4 space-y-2">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
              
              {/* Description */}
              <div className="mb-6 space-y-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 bg-gray-200 rounded animate-pulse w-5/6" />
                <div className="h-5 bg-gray-200 rounded animate-pulse w-4/5" />
              </div>

              {/* Course Stats */}
              <div className="mb-6 flex flex-wrap items-center gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* AI Insights Panel */}
              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instructor */}
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment Card - Right Column */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                {/* Course Preview */}
                <div className="relative aspect-video bg-gray-200 animate-pulse" />

                <CardContent className="p-6">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3 mb-6">
                    <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                  </div>

                  {/* Course Includes */}
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Share Button */}
                  <div className="mt-6 flex justify-center">
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-12">
        <div className="container px-4">
          {/* Tab Navigation */}
          <div className="grid w-full grid-cols-4 gap-1 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>

          {/* Tab Content */}
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

// Student Courses Page Skeleton
export function StudentCoursesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Course Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="grid w-full grid-cols-3 gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>

        {/* Course Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StudentCourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Individual Student Course Card Skeleton
export function StudentCourseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-200 animate-pulse">
        <div className="absolute top-3 right-3">
          <div className="h-8 w-20 bg-gray-300 rounded-full animate-pulse" />
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Title and Description */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Current Progress Stats */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* AI Insights Box */}
        <div className="rounded-lg bg-gray-100 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Last Accessed */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
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

// Student Learn Page Skeleton - for /student/courses/learn/[id]
export function StudentLearnPageSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Player */}
          <div className="flex-1 bg-black p-4">
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Video Info & Features */}
          <div className="border-t bg-background p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3 mb-2" />
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
              
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-3/4" />
              
              {/* Course Video Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center gap-4">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
              </div>
              
              {/* Course Playlist */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg">
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* AI Chat Sidebar */}
        <div className="w-1 bg-border" />
        <div className="flex-shrink-0 h-full overflow-hidden border-l" style={{ width: '400px' }}>
          <div className="h-full bg-background">
            {/* Sidebar Header */}
            <div className="p-4 border-b">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  {i % 2 === 0 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  )}
                  <div className={`max-w-xs space-y-2 ${i % 2 === 1 ? 'order-first' : ''}`}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </div>
                  {i % 2 === 1 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Student Course Overview Skeleton - for /student/courses/[id]
export function StudentCourseOverviewSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Course Header */}
      <div className="mb-8">
        <div className="mb-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
          <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <div className="h-12 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Progress Card */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" disabled className="data-[state=active]:bg-gray-200">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          </TabsTrigger>
          <TabsTrigger value="curriculum" disabled className="data-[state=active]:bg-gray-200">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </TabsTrigger>
          <TabsTrigger value="reviews" disabled className="data-[state=active]:bg-gray-200">
            <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
          </TabsTrigger>
          <TabsTrigger value="resources" disabled className="data-[state=active]:bg-gray-200">
            <div className="h-4 w-18 bg-gray-200 rounded animate-pulse" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Chapter Videos Skeleton - for loading videos within a section
export function ChapterVideosSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border-b last:border-b-0">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            <div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </div>
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

