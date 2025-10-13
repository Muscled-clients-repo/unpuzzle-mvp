"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { HelpWidget } from "@/components/help/HelpWidget"
export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Hide sidebar only on studio editor page (not projects page)
  const isFullscreenPage = pathname === '/instructor/studio'

  // Detect video pages and provide back button
  const isVideoPage = pathname.includes('/video/')

  const getCourseIdFromPath = () => {
    const match = pathname.match(/\/instructor\/course\/([^\/]+)\/video/)
    return match ? match[1] : null
  }

  const courseId = getCourseIdFromPath()
  const backButton = isVideoPage && courseId
    ? {
        href: `/instructor/course/${courseId}/analytics`,
        label: "Back to Analytics"
      }
    : undefined

  return (
    <div className="min-h-screen">
      {!isFullscreenPage && <Header backButton={backButton} />}
      {!isFullscreenPage && !isVideoPage && <Sidebar role="instructor" />}
      <div className={isFullscreenPage ? "" : isVideoPage ? "pt-16" : "md:pl-64 pt-16"}>
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>

      {/* Help Widget - only show on non-fullscreen pages */}
      {!isFullscreenPage && <HelpWidget />}
    </div>
  )
}