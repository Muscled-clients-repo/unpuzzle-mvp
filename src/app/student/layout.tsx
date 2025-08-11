import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { mockUsers } from "@/data/mock"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const learner = mockUsers.learners[0]
  
  return (
    <div className="min-h-screen">
      <Header user={{ name: learner.name, email: learner.email, role: learner.role }} />
      <Sidebar role="learner" />
      <div className="md:pl-64 pt-16">
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}