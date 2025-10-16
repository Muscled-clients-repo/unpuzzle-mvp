"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Extract headings from markdown content
    const extractHeadings = () => {
      const lines = content.split('\n')
      const extracted: Heading[] = []

      lines.forEach((line, index) => {
        if (line.startsWith('## ')) {
          const text = line.replace('## ', '').trim()
          const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          extracted.push({ id, text, level: 2 })
        } else if (line.startsWith('### ')) {
          const text = line.replace('### ', '').trim()
          const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          extracted.push({ id, text, level: 3 })
        }
      })

      return extracted
    }

    setHeadings(extractHeadings())
  }, [content])

  useEffect(() => {
    // Track scroll position and update active heading
    const handleScroll = () => {
      const headingElements = headings.map(h => document.getElementById(h.id))
      const scrollPosition = window.scrollY + 100

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i]
        if (element && element.offsetTop <= scrollPosition) {
          setActiveId(headings[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Set initial active heading

    return () => window.removeEventListener('scroll', handleScroll)
  }, [headings])

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80 // Header offset
      const elementPosition = element.offsetTop - offset
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }

  // Only show TOC for longer articles (3+ headings)
  if (headings.length < 3) {
    return null
  }

  return (
    <aside className="hidden lg:block sticky top-24 h-fit">
      <div className="pr-8 border-r">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <List className="h-4 w-4" />
          Table of Contents
        </h3>
        <nav>
          <ul className="space-y-2">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={cn(
                  "text-sm transition-colors",
                  heading.level === 3 && "ml-4"
                )}
              >
                <button
                  onClick={() => handleClick(heading.id)}
                  className={cn(
                    "text-left hover:text-primary transition-colors w-full",
                    activeId === heading.id
                      ? "text-primary font-medium border-l-2 border-primary pl-3 -ml-3"
                      : "text-muted-foreground pl-3"
                  )}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
