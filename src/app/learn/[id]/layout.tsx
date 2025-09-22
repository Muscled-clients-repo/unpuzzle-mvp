import { Metadata } from 'next'
import { Header } from "@/components/layout/header"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

// This would normally fetch from a database
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
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
      'og:video:duration': '600', // Duration in seconds
      'og:video:release_date': new Date().toISOString(),
      'twitter:player': `https://unpuzzle.com/embed/${id}`,
      'twitter:player:width': '1280',
      'twitter:player:height': '720',
    }
  }
}

export default function LessonLayout({ children }: LayoutProps) {
  return (
    <>
      <Header />
      <div className="pt-16">
        {children}
      </div>
    </>
  )
}