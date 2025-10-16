"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { HelpWidget } from "@/components/help/HelpWidget"

export default function AdminLayout({
  children,
}: {
  children: React.NodeNode
}) {
  const pathname = usePathname()

  // Hide sidebar on fullscreen pages if needed
  const isFullscreenPage = false // Add specific paths if needed

  return (
    <div className="min-h-screen">
      {!isFullscreenPage && <Header />}
      {!isFullscreenPage && <Sidebar role="admin" />}
      <div className={isFullscreenPage ? "" : "md:pl-64 pt-16"}>
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>

      {/* Help Widget */}
      {!isFullscreenPage && <HelpWidget />}
    </div>
  )
}
