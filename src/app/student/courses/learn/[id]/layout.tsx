import { Metadata } from 'next'

interface LayoutProps {
  children: React.ReactNode
  params: { id: string }
}

// Check if ID is a lesson or course based on the pattern
const isLessonId = (id: string) => {
  // Lessons typically have format like 'lesson-1', 'lesson-2', etc.
  // Courses have UUID format like '4fdf396a-6f3e-4c7c-bfe2-691e6e04f90a'
  return id.startsWith('lesson-') || id === 'lesson'
}

// Get lesson data for standalone lessons
const getLessonData = (id: string) => {
  // Mock data - replace with actual data fetching
  const lessons = {
    'lesson-1': {
      title: 'React Hooks in 10 Minutes',
      description: 'Quick introduction to React Hooks with practical examples',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      tags: ['React', 'Hooks', 'JavaScript']
    },
    'lesson-2': {
      title: 'CSS Grid Explained',
      description: 'Master CSS Grid in this single comprehensive lesson',
      thumbnailUrl: '/thumbnails/lesson-2.jpg',
      tags: ['CSS', 'Grid', 'Web Design']
    },
    'lesson-3': {
      title: 'TypeScript Basics',
      description: 'Get started with TypeScript in your React projects',
      thumbnailUrl: '/thumbnails/lesson-3.jpg',
      tags: ['TypeScript', 'React']
    }
  }
  
  return lessons[id as keyof typeof lessons] || null
}

// Get course data for course learning mode
const getCourseData = async (id: string) => {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://dev1.nazmulcodes.org'}/api/v1/courses/${id}`
    console.log('Fetching course metadata from:', apiUrl)
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Ensure this works in server-side context
      cache: 'no-store'
    })
    console.log('Course metadata response status:', response.status)
    
    if (!response.ok) {
      console.log('Course metadata fetch failed:', response.statusText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Course metadata response data keys:', Object.keys(data))
    
    // Handle the response structure - it might be wrapped
    const courseData = data.data || data
    console.log('Course data after unwrapping:', { 
      title: courseData.title, 
      description: courseData.description,
      hasData: !!courseData 
    })
    
    return {
      title: courseData.title || courseData.name || 'Learn',
      description: courseData.description || courseData.short_description || 'Interactive learning experience with AI-powered features',
      thumbnailUrl: courseData.thumbnail || courseData.image || '/default-course-thumbnail.jpg',
      tags: ['Course', 'Online Learning']
    }
  } catch (error) {
    console.error('Error fetching course data for metadata:', error)
    
    // Return a specific fallback title to make debugging easier
    return {
      title: 'Learn',
      description: 'Interactive learning experience with AI-powered features and engaging content.',
      thumbnailUrl: '/default-course-thumbnail.jpg',
      tags: ['Course', 'Learning']
    }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  // Check if this is a lesson or course
  if (isLessonId(id)) {
    // Handle standalone lesson
    const lesson = getLessonData(id)
    
    if (!lesson) {
      return {
        title: 'Lesson Not Found | Unpuzzle',
        description: 'This lesson could not be found.'
      }
    }
    
    const title = `${lesson.title} | Free Lesson | Unpuzzle`
    const description = `${lesson.description} Learn with AI-powered features. ${lesson.tags.join(', ')}.`
    const url = `https://unpuzzle.com/lesson/${id}`
    
    return {
      title,
      description,
      keywords: lesson.tags.join(', '),
      authors: [{ name: 'Unpuzzle' }],
      creator: 'Unpuzzle',
      publisher: 'Unpuzzle',
      
      openGraph: {
        title,
        description,
        url,
        siteName: 'Unpuzzle',
        type: 'video.other',
        videos: [
          {
            url: `https://unpuzzle.com/api/video/${id}`,
            width: 1280,
            height: 720,
          }
        ],
        images: [
          {
            url: lesson.thumbnailUrl,
            width: 1280,
            height: 720,
            alt: lesson.title,
          }
        ],
        locale: 'en_US',
      },
      
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [lesson.thumbnailUrl],
        creator: '@unpuzzle',
        site: '@unpuzzle',
      },
      
      alternates: {
        canonical: url,
      },
      
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      
      other: {
        'og:video:duration': '600',
        'og:video:release_date': new Date().toISOString(),
        'twitter:player': `https://unpuzzle.com/embed/${id}`,
        'twitter:player:width': '1280',
        'twitter:player:height': '720',
      }
    }
  } else {
    // Handle course learning
    const course = await getCourseData(id)
    
    // getCourseData now always returns a course object (with fallbacks), so this shouldn't happen
    // but keeping this as a safety net
    if (!course) {
      return {
        title: 'Course Not Found | Unpuzzle',
        description: 'This course could not be found.'
      }
    }
    
    // Additional safety checks for title
    const courseTitle = course?.title || 'Learn'
    const courseDescription = course?.description || 'Interactive learning experience with AI-powered features and engaging content.'
    const title = `${courseTitle} | Course | Unpuzzle`
    const description = courseDescription
    const url = `https://unpuzzle.com/course/${id}`
    
    console.log('Final metadata for course:', { title, description, courseTitle })
  
    return {
      title,
      description,
      keywords: course.tags.join(', '),
      authors: [{ name: 'Unpuzzle' }],
      creator: 'Unpuzzle',
      publisher: 'Unpuzzle',
      
      openGraph: {
        title,
        description,
        url,
        siteName: 'Unpuzzle',
        type: 'video.other',
        images: [
          {
            url: course.thumbnailUrl,
            width: 1280,
            height: 720,
            alt: course.title,
          }
        ],
        locale: 'en_US',
      },
      
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [course.thumbnailUrl],
        creator: '@unpuzzle',
        site: '@unpuzzle',
      },
      
      alternates: {
        canonical: url,
      },
      
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  }
}

export default function LessonLayout({ children }: LayoutProps) {
  return <>{children}</>
}