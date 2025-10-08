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

  // Hide sidebar only on studio editor page (not projects page) and video pages
  const isFullscreenPage = pathname === '/instructor/studio' || pathname.includes('/video/')
  
  return (
    <div className="min-h-screen">
      {!isFullscreenPage && <Header />}
      {!isFullscreenPage && <Sidebar role="instructor" />}
      <div className={isFullscreenPage ? "" : "md:pl-64 pt-16"}>
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>

      {/* Help Widget - only show on non-fullscreen pages */}
      {!isFullscreenPage && <HelpWidget />}
    </div>
  )
}