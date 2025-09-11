"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Hide sidebar on studio page and video pages
  const isFullscreenPage = pathname.includes('/studio') || pathname.includes('/video/')
  
  return (
    <div className="min-h-screen">
      {!isFullscreenPage && <Header />}
      {!isFullscreenPage && <Sidebar role="instructor" />}
      <div className={isFullscreenPage ? "" : "md:pl-64 pt-16"}>
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>
    </div>
  )
}