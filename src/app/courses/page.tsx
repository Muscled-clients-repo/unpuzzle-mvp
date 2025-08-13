"use client"

import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AICourseCard } from "@/components/course/ai-course-card"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common"
import { ErrorFallback } from "@/components/common"

export default function CoursesPage() {
  const { 
    recommendedCourses,
    loading,
    error,
    loadAllCourses
  } = useAppStore()

  useEffect(() => {
    loadAllCourses()
  }, [loadAllCourses])

  if (loading) return <LoadingSpinner />
  
  if (error) return <ErrorFallback error={error} />

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
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
            <div className="mb-6">
              <span className="text-sm text-muted-foreground">
                {recommendedCourses.length} courses available
              </span>
            </div>

            {recommendedCourses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No courses available at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendedCourses.map((course) => (
                  <AICourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}