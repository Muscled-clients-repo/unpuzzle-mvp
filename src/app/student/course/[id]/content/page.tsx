"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorBoundary } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner, ErrorFallback } from "@/components/common"
import { PageHeaderSkeleton, Skeleton } from "@/components/common/universal-skeleton"
import {
  BookOpen,
  Clock,
  Play,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  List
} from "lucide-react"
import Link from "next/link"
import { useAppStore } from "@/stores/app-store"
import { getCourseWithChaptersAndVideos } from '@/app/actions/student-course-actions'
import { CourseThumbnail } from '@/components/ui/course-thumbnail'
import { useState, useEffect } from 'react'

interface Chapter {
  id: string
  title: string
  order: number
  videos: Video[]
}

interface Video {
  id: string
  title: string
  duration_seconds: number
  order: number
  chapter_id: string
}

interface CourseWithContent {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor_id: string
  chapters: Chapter[]
  total_videos: number
  total_duration_minutes: number
}

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