"use client"

import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AICourseCard } from "@/components/course/ai-course-card"
import { CourseFiltersComponent } from "@/components/course/course-filters"
import { useAppStore } from "@/stores/app-store"
import { CourseGridSkeleton, CourseFiltersSkeleton } from "@/components/common/CourseCardSkeleton"
import { ErrorFallback } from "@/components/common"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function CoursesPage() {
  const { 
    // Public course data
    courses,
    currentFilters,
    totalPages,
    currentPage,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    loadCourses,
    updateFilters,
    clearError,
    resetFilters
  } = useAppStore()

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const handleFiltersChange = (newFilters: Partial<typeof currentFilters>) => {
    updateFilters(newFilters)
  }

  const handleClearFilters = () => {
    resetFilters()
  }

  const handlePageChange = (page: number) => {
    updateFilters({ page })
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading && courses.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pt-16">
          <section className="border-b bg-muted/50 py-8">
            <div className="container px-4">
              <h1 className="mb-2 text-3xl font-bold">Browse All Courses</h1>
              <p className="text-muted-foreground">
                Discover courses that accelerate your learning with AI assistance
              </p>
            </div>
          </section>

          <section className="py-8">
            <div className="container px-4">
              <CourseFiltersSkeleton />
              <CourseGridSkeleton 
                count={8} 
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    )
  }
  
  if (error && courses.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <ErrorFallback error={error} onRetry={() => {
            clearError()
            loadCourses()
          }} />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        <section className="border-b bg-muted/50 py-8">
          <div className="container px-4">
            <h1 className="mb-2 text-3xl font-bold">Browse All Courses</h1>
            <p className="text-muted-foreground">
              Discover courses that accelerate your learning with AI assistance
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="container px-4">
            {/* Filters */}
            <CourseFiltersComponent
              filters={currentFilters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              totalCount={totalCount}
            />

            {/* Error State */}
            {error ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">Unable to Load Courses</h3>
                <p className="text-muted-foreground mb-4">
                  {error === 'Authentication required' 
                    ? 'Some courses may require authentication to view.'
                    : error === 'Network connection failed. Please check your internet connection.'
                    ? 'Please check your internet connection and try again.'
                    : 'There was a problem loading courses. Please try again.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => {
                    clearError()
                    loadCourses()
                  }}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={clearError}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <CourseGridSkeleton 
                count={8} 
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              />
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No courses found with the current filters.
                </p>
                <Button onClick={handleClearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {courses.map((course) => (
                    <AICourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button 
                      variant="outline" 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPreviousPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {/* Show page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Calculate which pages to show
                        let startPage = Math.max(1, currentPage - 2)
                        const endPage = Math.min(totalPages, startPage + 4)
                        
                        // Adjust start if we're near the end
                        if (endPage - startPage < 4) {
                          startPage = Math.max(1, endPage - 4)
                        }
                        
                        const page = startPage + i
                        if (page > endPage) return null
                        
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            disabled={loading}
                          >
                            {page}
                          </Button>
                        )
                      }).filter(Boolean)}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* Results Summary */}
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount.toLocaleString()} courses
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}