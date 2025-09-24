"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { HelpWidget } from "@/components/help/HelpWidget"
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Hide sidebar on video pages for better viewing experience
  const isVideoPage = pathname.includes('/video/')
  
  // Extract course ID from video page URL for back navigation
  const getCourseIdFromPath = () => {
    const match = pathname.match(/\/student\/course\/([^\/]+)\/video/)
    return match ? match[1] : null
  }
  
  const courseId = getCourseIdFromPath()
  const backButton = isVideoPage && courseId 
    ? { 
        href: `/student/course/${courseId}`, 
        label: "Back to course" 
      }
    : undefined
  
  return (
    <div className="min-h-screen">
      <Header backButton={backButton} />
      {!isVideoPage && <Sidebar role="student" />}
      <div className={isVideoPage ? "pt-16" : "md:pl-64 pt-16"}>
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Help Widget */}
      <HelpWidget />
    </div>
  )
}