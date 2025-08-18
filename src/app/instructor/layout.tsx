"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { CourseSelector } from "@/components/instructor/course-selector"
import { mockUsers } from "@/data/mock"

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const instructor = mockUsers.instructors[0]
  const pathname = usePathname()
  
  // Hide sidebar on studio page
  const isStudioPage = pathname.includes('/studio')
  
  return (
    <div className="min-h-screen">
      {!isStudioPage && <Header user={{ name: instructor.name, email: instructor.email, role: instructor.role }} />}
      {!isStudioPage && <Sidebar role="instructor" />}
      <div className={isStudioPage ? "" : "md:pl-64 pt-16"}>
        {!isStudioPage && <CourseSelector />}
        <main className={isStudioPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>
    </div>
  )
}