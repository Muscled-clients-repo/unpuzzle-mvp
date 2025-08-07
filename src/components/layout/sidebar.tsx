"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Home,
  BarChart3,
  Bookmark,
  MessageSquare,
  Settings,
  PlayCircle,
  Users,
  DollarSign,
  FileText,
  Upload,
  TrendingUp,
} from "lucide-react"

interface SidebarProps {
  role?: "learner" | "instructor" | "admin"
}

const learnerNavItems = [
  { href: "/learn", label: "Dashboard", icon: Home },
  { href: "/learn/courses", label: "My Courses", icon: BookOpen },
  { href: "/learn/metrics", label: "Learning Metrics", icon: BarChart3 },
  { href: "/learn/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/learn/reflections", label: "Reflections", icon: MessageSquare },
  { href: "/learn/settings", label: "Settings", icon: Settings },
]

const instructorNavItems = [
  { href: "/teach", label: "Dashboard", icon: Home },
  { href: "/teach/courses", label: "My Courses", icon: BookOpen },
  { href: "/teach/course/new", label: "Create Course", icon: Upload },
  { href: "/teach/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teach/students", label: "Students", icon: Users },
  { href: "/teach/earnings", label: "Earnings", icon: DollarSign },
  { href: "/teach/settings", label: "Settings", icon: Settings },
]

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/instructors", label: "Instructors", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ role = "learner" }: SidebarProps) {
  const pathname = usePathname()
  
  const navItems = 
    role === "admin" ? adminNavItems :
    role === "instructor" ? instructorNavItems :
    learnerNavItems

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background">
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== "/learn" && item.href !== "/teach" && item.href !== "/admin" && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {role === "learner" && (
        <div className="border-t p-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-sm font-medium">AI Interactions</p>
            <p className="text-2xl font-bold">7 / 10</p>
            <p className="text-xs text-muted-foreground">Free tier limit</p>
            <Link
              href="/pricing"
              className="mt-2 block text-xs font-medium text-primary hover:underline"
            >
              Upgrade for unlimited
            </Link>
          </div>
        </div>
      )}

      {role === "instructor" && (
        <div className="border-t p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Students</span>
              <span className="font-medium">2,543</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-medium text-green-600">+$3,240</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}