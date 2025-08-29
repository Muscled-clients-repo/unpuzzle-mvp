"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, User, Menu, Eye, Settings as SettingsIcon, LogOut, MessageCircle, GraduationCap, UserCheck, ChevronLeft } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  backButton?: {
    href: string
    label?: string
  }
}

export function Header({ backButton }: HeaderProps) {
  const router = useRouter()
  const { profile, isAuthenticated, logout, isLoading } = useAppStore()
  
  // Get user from store
  const user = isAuthenticated() ? profile : null
  
  const handleLogout = () => {
    logout()
    router.push('/login')
  }
  
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4">
        {/* Left section - Logo and mobile menu */}
        <div className="flex items-center gap-4 flex-1">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              {/* Mobile navigation handled by sidebar */}
            </SheetContent>
          </Sheet>

          {/* Back button if provided */}
          {backButton && (
            <Button asChild variant="ghost" size="icon">
              <Link href={backButton.href} title={backButton.label || "Go back"}>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}

          <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Unpuzzle
            </span>
          </Link>
        </div>

        {/* Center section - Search bar */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses, students, lessons..."
              className="w-full pl-10 pr-4 h-9 bg-secondary/50 border-input hover:bg-secondary/70 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-3 justify-end">
          {/* Mode Badge for Instructor */}
          {user?.role === "instructor" && (
            <Badge variant="default" className="gap-1">
              <Eye className="h-3 w-3" />
              INSTRUCTOR MODE
            </Badge>
          )}

          <ThemeToggle />
          
          {isLoading ? (
            // Show nothing or a skeleton while loading
            <div className="w-20 h-8" />
          ) : user ? (
            <>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email || 'user@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Mode Switching for Instructors */}
                  {user.role === "instructor" && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => router.push('/student')}
                        className="cursor-pointer"
                      >
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Switch to Student Mode
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem asChild>
                    <Link href={user.role === "student" ? "/student/settings" : "/instructor/settings"}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout}>
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
                <Link href="/login">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}