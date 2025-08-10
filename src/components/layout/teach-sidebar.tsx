"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/stores/app-store"
import {
  Home,
  BookOpen,
  MessageCircle,
  Users,
  DollarSign,
  BarChart3,
  Video
} from "lucide-react"

export function TeachSidebar() {
  const pathname = usePathname()
  const { pendingConfusions, instructorStats } = useAppStore()

  const navItems = [
    {
      label: "Dashboard",
      href: "/instructor",
      icon: Home,
      badge: null
    },
    {
      label: "My Courses",
      href: "/instructor/courses",
      icon: BookOpen,
      badge: instructorStats?.totalCourses || 0
    },
    {
      label: "My Lessons",
      href: "/instructor/lessons",
      icon: Video,
      badge: null
    },
    {
      label: "Confusions",
      href: "/instructor/confusions",
      icon: MessageCircle,
      badge: pendingConfusions?.length || 0,
      badgeVariant: "destructive" as const
    },
    {
      label: "Students",
      href: "/instructor/students",
      icon: Users,
      badge: null
    },
    {
      label: "Analytics",
      href: "/instructor/analytics",
      icon: BarChart3,
      badge: null
    },
    {
      label: "Earnings",
      href: "/instructor/earnings",
      icon: DollarSign,
      badge: null
    }
  ]

  return (
    <div className="w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Top Section */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Instructor Mode</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/instructor" && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <Badge 
                    variant={item.badgeVariant || (isActive ? "secondary" : "outline")}
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}