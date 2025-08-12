"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Home,
  BarChart3,
  MessageSquare,
  Settings,
  PlayCircle,
  Users,
  DollarSign,
  FileText,
  Upload,
  TrendingUp,
  Sparkles,
  UsersRound,
  Shield,
  GraduationCap,
  Trophy,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  role?: "learner" | "instructor" | "admin" | "moderator"
}

const learnerNavItems = [
  { href: "/student", label: "Dashboard", icon: Home },
  { href: "/student/courses", label: "My Courses", icon: BookOpen },
  { href: "/student/reflections", label: "Reflections", icon: MessageSquare },
]

const instructorNavItems = [
  { href: "/instructor", label: "Dashboard", icon: Home },
  { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
  { href: "/instructor/lessons", label: "My Lessons", icon: PlayCircle },
  { href: "/instructor/confusions", label: "Confusions", icon: MessageSquare },
  { href: "/instructor/students", label: "Students", icon: Users },
  { href: "/instructor/engagement", label: "Engagement", icon: TrendingUp },
]

const moderatorNavItems = [
  { href: "/moderator", label: "Dashboard", icon: Home },
  { href: "/moderator/queue", label: "Queue", icon: MessageSquare },
  { href: "/moderator/assignments", label: "My Assignments", icon: Target },
  { href: "/moderator/responses", label: "Responses", icon: MessageSquare },
  { href: "/moderator/leaderboard", label: "Leaderboard", icon: Trophy },
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
  const profile = useAppStore((state) => state.profile)
  const { pendingConfusions, instructorStats, moderationQueue, myAssignments } = useAppStore()
  
  const navItems = 
    role === "admin" ? adminNavItems :
    role === "instructor" ? instructorNavItems :
    role === "moderator" ? moderatorNavItems :
    learnerNavItems

  // Get AI usage info
  const subscription = profile?.subscription
  const dailyUsed = subscription?.dailyAiInteractions || 0
  const isBasic = subscription?.plan === 'basic'
  const isPremium = subscription?.plan === 'premium'
  
  // Check if user can access multiple modes
  const userRole = profile?.role
  const isModerator = userRole === 'moderator' || userRole === 'instructor'
  const isInstructor = userRole === 'instructor'

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background fixed left-0 top-16 bottom-0 z-40">
      {/* Mode Indicator */}
      {(role === "instructor" || role === "moderator") && (
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              role === "instructor" ? "bg-green-500" : "bg-purple-500"
            )} />
            <span className="text-sm font-medium">
              {role === "instructor" ? "Instructor Mode" : "Moderator Mode"}
            </span>
          </div>
        </div>
      )}
      
      {/* Role Switcher for instructors and moderators */}
      {isModerator && role === "learner" && (
        <div className="border-b p-3">
          <p className="text-xs text-muted-foreground mb-2">Switch Mode:</p>
          <div className="space-y-1">
            {isInstructor && (
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/instructor">
                  <GraduationCap className="mr-2 h-3 w-3" />
                  Instructor
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/moderator">
                <Shield className="mr-2 h-3 w-3" />
                Moderator
              </Link>
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== "/student" && item.href !== "/instructor" && item.href !== "/admin" && pathname.startsWith(item.href))
            
            // Get badge info for instructor and moderator items
            let badgeContent = null
            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
            
            if (role === "instructor") {
              if (item.href === "/instructor/courses" && instructorStats) {
                badgeContent = instructorStats.totalCourses
              } else if (item.href === "/instructor/confusions" && pendingConfusions) {
                badgeContent = pendingConfusions.length
                badgeVariant = "destructive"
              }
            } else if (role === "moderator") {
              if (item.href === "/moderator/queue" && moderationQueue) {
                const pendingCount = moderationQueue.filter(q => q.status === 'pending').length
                badgeContent = pendingCount
                badgeVariant = pendingCount > 0 ? "destructive" : "secondary"
              } else if (item.href === "/moderator/assignments" && myAssignments) {
                badgeContent = myAssignments.length
              }
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

      {/* AI Interactions Counter - Fixed at bottom for learners */}
      {role === "learner" && (
        <div className="border-t bg-primary/10">
          <div className="p-4">
            <p className="text-sm font-medium">AI Interactions</p>
            {isPremium ? (
              <>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Premium - Unlimited</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">{dailyUsed} / 3</p>
                <p className="text-xs text-muted-foreground">Daily limit ({isBasic ? 'Basic plan' : 'Free tier'})</p>
              </>
            )}
            
            {!isPremium && (
              <Link
                href="/#pricing"
                className="mt-2 block text-xs font-medium text-primary hover:underline"
              >
                {isBasic ? 'Upgrade to Premium' : 'Upgrade for unlimited'}
              </Link>
            )}
            
            {/* Warning when close to limit */}
            {isBasic && dailyUsed >= 2 && (
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  {dailyUsed >= 3 ? '🚫 Daily limit reached' : '⚠️ 1 AI interaction left today'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}