import { ModeratorHeader } from "@/components/layout/moderator-header"
import { Sidebar } from "@/components/layout/sidebar"

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <ModeratorHeader />
      <Sidebar role="moderator" />
      <div className="md:pl-64 pt-16">
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}