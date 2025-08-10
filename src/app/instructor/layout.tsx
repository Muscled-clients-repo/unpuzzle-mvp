import { InstructorHeader } from "@/components/layout/instructor-header"
import { Sidebar } from "@/components/layout/sidebar"
import { CourseSelector } from "@/components/instructor/course-selector"

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <InstructorHeader />
      <Sidebar role="instructor" />
      <div className="md:pl-64 pt-16">
        <CourseSelector />
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}