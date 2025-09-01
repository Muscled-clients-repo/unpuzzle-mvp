"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { CourseSelector } from "@/components/instructor/course-selector"
import { useAuth } from "@/contexts/AuthContext"

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const pathname = usePathname()
  
  // Hide sidebar on studio page and video pages
  const isFullscreenPage = pathname.includes('/studio') || pathname.includes('/video/')
  
  return (
    <div className="min-h-screen">
      {!isFullscreenPage && (
        <Header 
          user={{ 
            name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Instructor', 
            email: user?.email || '', 
            role: 'instructor' 
          }} 
        />
      )}
      {!isFullscreenPage && <Sidebar role="instructor" />}
      <div className={isFullscreenPage ? "" : "md:pl-64 pt-16"}>
        {!isFullscreenPage && <CourseSelector />}
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>
    </div>
  )
}