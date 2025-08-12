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
  PlayCircle,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FeatureGate } from "@/config/features"

interface StudentSidebarProps {
  className?: string
}

const studentNavItems = [
  { href: "/student", label: "Dashboard", icon: Home },
  { href: "/student/courses", label: "My Courses", icon: BookOpen },
  { href: "/student/reflections", label: "Reflections", icon: MessageSquare },
]

export function StudentSidebar({ className }: StudentSidebarProps) {
  const pathname = usePathname()
  const profile = useAppStore((state) => state.profile)
  
  // Get AI usage info
  const subscription = profile?.subscription
  const dailyUsed = subscription?.dailyAiInteractions || 0
  const isBasic = subscription?.plan === 'basic'
  const isPremium = subscription?.plan === 'premium'

  return (
    <aside className={cn("hidden md:flex w-64 flex-col border-r bg-background fixed left-0 top-16 bottom-0 z-40", className)}>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {studentNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== "/student" && pathname.startsWith(item.href))
            
            // Feature gate certain navigation items
            if (item.href === "/student/reflections") {
              return (
                <FeatureGate key={item.href} role="student" feature="reflections">
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
              </Link>
            )
          })}
        </nav>
      </div>

      {/* AI Interactions Counter - Fixed at bottom for students */}
      <FeatureGate role="student" feature="aiChat">
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
      </FeatureGate>
    </aside>
  )
}