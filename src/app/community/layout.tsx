"use client"

import { Header } from "@/components/layout/header"

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}