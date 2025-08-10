"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, Search, User, Menu, Settings, LogOut, UserCircle, GraduationCap, Shield } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export function ModeratorHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()

  // Mock user data - in real app this would come from auth state
  const user = {
    name: "John Doe",
    email: "john@example.com",
    currentRole: "moderator" as const
  }

  const handleRoleSwitch = (role: string) => {
    // Navigate to the appropriate route based on role
    switch(role) {
      case 'student':
        router.push('/student')
        break
      case 'moderator':
        router.push('/moderator')
        break
      case 'instructor':
        router.push('/instructor')
        break
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <nav className="flex flex-col space-y-4 mt-6">
              <Link href="/moderator" className="text-lg font-medium">
                Moderator Dashboard
              </Link>
              <Link href="/student" className="text-lg font-medium">
                Switch to Student
              </Link>
              <Link href="/instructor" className="text-lg font-medium">
                Switch to Instructor
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Unpuzzle
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 ml-6">
          <Link
            href="/moderator"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Dashboard
          </Link>
          <Link
            href="/moderator/queue"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Queue
          </Link>
          <Link
            href="/moderator/assignments"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Assignments
          </Link>
          <Link
            href="/moderator/leaderboard"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <div className="relative">
            {searchOpen ? (
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pr-8"
                autoFocus
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>

          <ThemeToggle />
          
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
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
                  <Badge variant="secondary" className="mt-1 w-fit">
                    Moderator
                  </Badge>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch Role
              </DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => handleRoleSwitch('student')}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Student
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleRoleSwitch('instructor')}>
                <UserCircle className="mr-2 h-4 w-4" />
                Instructor
              </DropdownMenuItem>
              
              <DropdownMenuItem disabled>
                <Shield className="mr-2 h-4 w-4" />
                Moderator
                <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/moderator/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/help">
                  Help & Support
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}