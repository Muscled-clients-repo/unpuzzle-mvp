"use client"

import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { AICourseCard } from "@/components/course/ai-course-card"
import { mockCourses } from "@/data/mock"

export default function CoursesPage() {

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
                {mockCourses.length} courses available
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mockCourses.map((course) => (
                <AICourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}