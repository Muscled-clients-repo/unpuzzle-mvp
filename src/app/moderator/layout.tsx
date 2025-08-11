import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // For now using a mock moderator user - in production this would come from auth
  const moderator = {
    name: "Moderator User",
    email: "moderator@example.com",
    role: "instructor" as const // Using instructor role since moderator isn't in the type yet
  }
  
  return (
    <div className="min-h-screen">
      <Header user={moderator} />
      <Sidebar role="moderator" />
      <div className="md:pl-64 pt-16">
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}