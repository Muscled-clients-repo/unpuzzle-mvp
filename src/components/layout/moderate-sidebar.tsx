"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAppStore } from "@/stores/app-store"
import {
  Home,
  MessageCircle,
  Trophy,
  Shield,
  BookOpen,
  Target,
  HelpCircle,
  Brain
} from "lucide-react"

export function ModerateSidebar() {
  const pathname = usePathname()
  const { moderationQueue, myAssignments, moderatorStats, profile } = useAppStore()

  const pendingCount = moderationQueue?.filter(q => q.status === 'pending').length || 0
  const trustScore = profile?.moderatorStats?.trustScore || 85

  const navItems = [
    {
      label: "Dashboard",
      href: "/moderator",
      icon: Home,
      badge: null
    },
    {
      label: "Queue",
      href: "/moderator/queue",
      icon: MessageCircle,
      badge: pendingCount,
      badgeVariant: pendingCount > 0 ? "destructive" as const : "secondary" as const
    },
    {
      label: "My Assignments",
      href: "/moderator/assignments",
      icon: Target,
      badge: myAssignments?.length || 0
    },
    {
      label: "Responses",
      href: "/moderator/responses",
      icon: MessageCircle,
      badge: null
    },
    {
      label: "Leaderboard",
      href: "/moderator/leaderboard",
      icon: Trophy,
      badge: null
    },
    {
      label: "Student Mode",
      href: "/student",
      icon: BookOpen,
      badge: null
    }
  ]

  const bottomItems = [
    {
      label: "Guidelines",
      href: "/moderator/guidelines",
      icon: HelpCircle
    }
  ]

  return (
    <div className="w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Moderator Badge */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Moderator Mode</span>
            <Badge className="ml-auto bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
              <Shield className="h-3 w-3 mr-1" />
              Trusted
            </Badge>
          </div>
          
          {/* Trust Score */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trust Score</span>
              <span className="font-bold">{trustScore}/100</span>
            </div>
            <Progress value={trustScore} className="h-2" />
          </div>

          {/* Specializations */}
          {profile?.moderatorStats?.specialization && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Your Expertise:</p>
              <div className="flex flex-wrap gap-1">
                {profile.moderatorStats.specialization.slice(0, 3).map(spec => (
                  <Badge key={spec} variant="outline" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/moderator" && pathname.startsWith(item.href))
            
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
                {item.badge !== null && item.badge > 0 && (
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


        {/* Bottom Navigation */}
        <div className="p-4 border-t space-y-1">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          
          {/* Mode Switcher */}
          <div className="space-y-2 mt-2">
            {profile?.role === 'instructor' && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/instructor">
                  <Brain className="mr-2 h-4 w-4" />
                  Switch to Instructor
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/student">
                <BookOpen className="mr-2 h-4 w-4" />
                Switch to Learning
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}