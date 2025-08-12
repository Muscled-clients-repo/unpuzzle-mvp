"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { InstructorVideoView } from "@/components/video/views/InstructorVideoView"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestInstructorVideoPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to instructor video view with proper instructor flag
    router.push('/learn/test-lesson-1?instructor=true&student=sarah_chen&from=test')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to instructor video test...</p>
      </div>
    </div>
  )
}