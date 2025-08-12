"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Home,
  MessageSquare,
  PlayCircle,
  Users,
  TrendingUp,
  GraduationCap,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeatureGate } from "@/config/features"

interface InstructorSidebarProps {
  className?: string
}

const instructorNavItems = [
  { href: "/instructor", label: "Dashboard", icon: Home },
  { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
  { href: "/instructor/lessons", label: "My Lessons", icon: PlayCircle },
  { href: "/instructor/confusions", label: "Confusions", icon: MessageSquare },
  { href: "/instructor/students", label: "Students", icon: Users },
  { href: "/instructor/engagement", label: "Engagement", icon: TrendingUp },
]

export function InstructorSidebar({ className }: InstructorSidebarProps) {
  const pathname = usePathname()
  const profile = useAppStore((state) => state.profile)
  const { pendingConfusions, instructorStats } = useAppStore()
  
  // Check if user can access multiple modes
  const userRole = profile?.role
  const isModerator = userRole === 'moderator' || userRole === 'instructor'

  return (
    <aside className={cn("hidden md:flex w-64 flex-col border-r bg-background fixed left-0 top-16 bottom-0 z-40", className)}>
      {/* Mode Indicator */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full animate-pulse bg-green-500" />
          <span className="text-sm font-medium">Instructor Mode</span>
        </div>
      </div>
      
      {/* Mode Switcher */}
      {isModerator && (
        <div className="border-b p-3">
          <p className="text-xs text-muted-foreground mb-2">Switch Mode:</p>
          <div className="space-y-1">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/student">
                <GraduationCap className="mr-2 h-3 w-3" />
                Student
              </Link>
            </Button>
            {userRole === 'instructor' && (
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/moderator">
                  <Shield className="mr-2 h-3 w-3" />
                  Moderator
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {instructorNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== "/instructor" && pathname.startsWith(item.href))
            
            // Get badge info for instructor items
            let badgeContent = null
            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
            
            if (item.href === "/instructor/courses" && instructorStats) {
              badgeContent = instructorStats.totalCourses
            } else if (item.href === "/instructor/confusions" && pendingConfusions) {
              badgeContent = pendingConfusions.length
              badgeVariant = "destructive"
            }

            // Feature gate certain navigation items
            if (item.href === "/instructor/engagement") {
              return (
                <FeatureGate key={item.href} role="instructor" feature="engagementDashboard">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    {badgeContent !== null && badgeContent > 0 && (
                      <Badge variant={badgeVariant} className="ml-auto">
                        {badgeContent}
                      </Badge>
                    )}
                  </Link>
                </FeatureGate>
              )
            }

            if (item.href === "/instructor/confusions") {
              return (
                <FeatureGate key={item.href} role="instructor" feature="confusionTracking">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    {badgeContent !== null && badgeContent > 0 && (
                      <Badge variant={badgeVariant} className="ml-auto">
                        {badgeContent}
                      </Badge>
                    )}
                  </Link>
                </FeatureGate>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                {badgeContent !== null && badgeContent > 0 && (
                  <Badge variant={badgeVariant} className="ml-auto">
                    {badgeContent}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Instructor Analytics Summary */}
      <FeatureGate role="instructor" feature="analytics">
        <div className="border-t bg-secondary/20">
          <div className="p-4">
            <p className="text-sm font-medium">Quick Stats</p>
            {instructorStats ? (
              <>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Total Students</span>
                    <span className="font-medium">{instructorStats.totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Active This Week</span>
                    <span className="font-medium">{instructorStats.activeStudentsThisWeek}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Avg. Engagement</span>
                    <span className="font-medium">{Math.round(instructorStats.averageEngagement * 100)}%</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Loading stats...</p>
            )}
          </div>
        </div>
      </FeatureGate>
    </aside>
  )
}