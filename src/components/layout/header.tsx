"use client"

import Link from "next/link"
import { useAppStore } from "@/stores/app-store"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Bell, Search, User, Menu, Eye, LogOut, ChevronLeft, GraduationCap, BookOpen
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  getUserRole, getUserDatabaseRole, getUserInfo, getHomeRoute, getSearchPlaceholder, 
  getRoleSpecificMenuItems, getIconComponent, UserRole 
} from "./header-utils"

interface HeaderProps {
  backButton?: {
    href: string
    label?: string
  }
}

interface HeaderLeftProps {
  backButton?: HeaderProps['backButton']
  userRole: UserRole
}

interface HeaderActionsProps {
  user: { name: string; email: string; avatar?: string } | null
  userRole: UserRole
  userDatabaseRole: UserRole
  onSignOut: () => void
}

export function Header({ backButton }: HeaderProps) {
  const { user, profile, signOut, authLoading } = useAppStore()
  const [hydrated, setHydrated] = useState(false)
  
  useEffect(() => {
    setHydrated(true)
  }, [])
  
  // Show loading skeleton only during initial auth check
  if (!hydrated || authLoading) {
    return (
      <header className="fixed top-0 z-50 w-full border-b bg-background">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Unpuzzle
              </span>
            </Link>
          </div>
          <div className="flex-1 max-w-xl mx-8">
            <div className="animate-pulse bg-muted rounded h-9 w-full" />
          </div>
          <div className="flex items-center gap-3 justify-end">
            <div className="animate-pulse bg-muted rounded h-6 w-6" />
            <div className="animate-pulse bg-muted rounded h-6 w-6" />
            <div className="animate-pulse bg-muted rounded h-6 w-6" />
          </div>
        </div>
      </header>
    )
  }
  
  // Derive user role and info from auth context
  // For active role, check cookie first
  const userRole = getUserRole(user)
  // For database role, use the profile data OR fallback to user metadata
  // This handles the case where profile hasn't loaded yet
  const userDatabaseRole: UserRole = profile?.role || 
                                     user?.user_metadata?.role || 
                                     user?.app_metadata?.role || 
                                     null
  const userInfo = getUserInfo(user)

  
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4">
        
        {/* Left Section - Logo + Mobile Menu */}
        <HeaderLeft 
          backButton={backButton}
          userRole={userRole}
        />
        
        {/* Center Section - Role-specific Search */}
        <HeaderSearch userRole={userRole} />
        
        {/* Right Section - Role-specific Actions */}
        <HeaderActions 
          user={user ? userInfo : null}
          userRole={userRole}
          userDatabaseRole={userDatabaseRole}
          onSignOut={signOut}
        />
        
      </div>
    </header>
  )
}

// Internal Components (not exported)
function HeaderLeft({ backButton, userRole }: HeaderLeftProps) {
  const homeRoute = getHomeRoute(userRole)
  
  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          {/* Mobile navigation - role-specific sidebar content will be rendered here */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Role: {userRole || 'Guest'}
            </p>
            {/* Sidebar navigation items will be imported and rendered here */}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Back button */}
      {backButton && (
        <Button asChild variant="ghost" size="icon">
          <Link href={backButton.href} title={backButton.label || "Go back"}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
      )}
      
      {/* Logo */}
      <Link href={homeRoute} className="flex items-center space-x-2 font-bold text-xl">
        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Unpuzzle
        </span>
      </Link>
    </div>
  )
}

function HeaderSearch({ userRole }: { userRole: UserRole }) {
  const placeholder = getSearchPlaceholder(userRole)
  
  return (
    <div className="flex-1 max-w-xl mx-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          className="w-full pl-10 pr-4 h-9 bg-secondary/50 border-input hover:bg-secondary/70 focus:bg-background transition-colors"
        />
      </div>
    </div>
  )
}

function HeaderActions({ user, userRole, userDatabaseRole, onSignOut }: HeaderActionsProps) {
  const menuItems = getRoleSpecificMenuItems(userRole)
  const [currentPath, setCurrentPath] = useState<string>('')
  
  useEffect(() => {
    // Set path only on client side to avoid hydration mismatch
    setCurrentPath(window.location.pathname)
  }, [])
  
  // Function to handle role switching
  const handleRoleSwitch = async (newRole: 'student' | 'instructor') => {
    try {
      const response = await fetch('/api/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        const homeRoute = newRole === 'instructor' ? '/instructor' : '/student'
        window.location.href = homeRoute
      }
    } catch (error) {
      console.error('Error switching role:', error)
    }
  }
  
  return (
    <div className="flex items-center gap-3 justify-end">
      
      <ThemeToggle />
      
      {user ? (
        <>
          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Role Switching Option - Only show for instructors */}
              {userDatabaseRole === 'instructor' && currentPath && (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium"
                    onSelect={(e) => {
                      e.preventDefault()
                      const isInInstructorMode = currentPath.startsWith('/instructor')
                      const targetRole = isInInstructorMode ? 'student' : 'instructor'
                      handleRoleSwitch(targetRole)
                    }}
                  >
                    {currentPath.startsWith('/instructor') ? (
                      <>
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Switch to Student
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Switch to Instructor
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {menuItems.map((item) => {
                const IconComponent = getIconComponent(item.icon)
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <IconComponent className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer"
                onClick={onSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      )}
    </div>
  )
}