"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Clock, 
  Eye,
  Sparkles,
  Lock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RelatedLesson {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  duration: string
  views: number
  isFree: boolean
  tags: string[]
}

interface RelatedLessonsCarouselProps {
  currentLessonId: string
  lessons: RelatedLesson[]
  title?: string
}

export function RelatedLessonsCarousel({ 
  currentLessonId, 
  lessons, 
  title = "Related Lessons" 
}: RelatedLessonsCarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  
  // Filter out current lesson
  const relatedLessons = lessons.filter(l => l.id !== currentLessonId)
  
  useEffect(() => {
    const container = document.getElementById('lessons-carousel')
    if (container) {
      const handleScroll = () => {
        setCanScrollLeft(container.scrollLeft > 0)
        setCanScrollRight(
          container.scrollLeft < container.scrollWidth - container.clientWidth - 10
        )
      }
      container.addEventListener('scroll', handleScroll)
      handleScroll() // Check initial state
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('lessons-carousel')
    if (container) {
      const scrollAmount = 320 // Width of one card plus gap
      const newPosition = direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount
      
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      })
    }
  }
  
  if (relatedLessons.length === 0) return null
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <div 
          id="lessons-carousel"
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {relatedLessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/student/courses/learn/${lesson.id}`}
              className="flex-none w-[300px] group"
            >
              <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                <div className="aspect-video relative bg-muted">
                  {lesson.thumbnailUrl ? (
                    <Image
                      src={lesson.thumbnailUrl}
                      alt={lesson.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white rounded-full p-3">
                      <Play className="h-6 w-6 text-black fill-black" />
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    {lesson.isFree ? (
                      <Badge className="bg-green-500 text-white">
                        Free
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Lock className="mr-1 h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration}
                  </div>
                </div>
                
                {/* Content */}
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {lesson.description}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {lesson.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Enhanced
                    </span>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {lesson.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}