"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, GraduationCap, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"

interface RoleSwitcherProps {
  currentRole: 'student' | 'instructor'
  userRole: 'student' | 'instructor' | 'admin' | null
  className?: string
}

export function RoleSwitcher({ currentRole, userRole, className }: RoleSwitcherProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Don't show switcher if user isn't an instructor
  if (userRole !== 'instructor') {
    return null
  }

  const switchRole = async (newRole: 'student' | 'instructor') => {
    if (newRole === currentRole || isPending) return

    startTransition(async () => {
      try {
        const response = await fetch('/api/switch-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole }),
        })

        if (response.ok) {
          // Get the appropriate home route for the new role
          const homeRoute = newRole === 'instructor' ? '/instructor' : '/student'
          
          // Force a hard refresh to ensure all components re-read the cookie
          // This is more reliable than router.push + router.refresh
          window.location.href = homeRoute
        } else {
          console.error('Failed to switch role')
        }
      } catch (error) {
        console.error('Error switching role:', error)
      }
    })
  }

  const otherRole = currentRole === 'instructor' ? 'student' : 'instructor'
  const otherRoleLabel = otherRole === 'instructor' ? 'Instructor' : 'Student'
  const OtherRoleIcon = otherRole === 'instructor' ? BookOpen : GraduationCap

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={className}
          disabled={isPending}
        >
          <span className="text-xs font-medium">
            Switch to {otherRoleLabel}
          </span>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => switchRole(otherRole)}
          disabled={isPending}
          className="cursor-pointer"
        >
          <OtherRoleIcon className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">Switch to {otherRoleLabel}</span>
            <span className="text-xs text-muted-foreground">
              {otherRole === 'instructor' 
                ? 'Access teaching tools and analytics'
                : 'Browse and take courses'
              }
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}