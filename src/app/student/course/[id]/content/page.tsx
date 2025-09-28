"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from 'react'

export default function StudentCourseContentPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  // Redirect to main course page since the logic has been moved there
  useEffect(() => {
    router.replace(`/student/course/${courseId}`)
  }, [courseId, router])

  // Return null while redirecting
  return null
}