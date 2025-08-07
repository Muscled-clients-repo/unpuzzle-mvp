"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, Search, User, Menu } from "lucide-react"
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

interface HeaderProps {
  user?: {
    name: string
    email: string
    role: "learner" | "instructor" | "admin"
  }
}

export function Header({ user }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

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
              <Link href="/courses" className="text-lg font-medium">
                Browse Courses
              </Link>
              {user?.role === "learner" && (
                <Link href="/learn" className="text-lg font-medium">
                  My Learning
                </Link>
              )}
              {user?.role === "instructor" && (
                <Link href="/teach" className="text-lg font-medium">
                  Instructor Dashboard
                </Link>
              )}
              {user?.role === "admin" && (
                <Link href="/admin" className="text-lg font-medium">
                  Admin Panel
                </Link>
              )}
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
            href="/courses"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Browse Courses
          </Link>
          {user?.role === "learner" && (
            <Link
              href="/learn"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              My Learning
            </Link>
          )}
          {user?.role === "instructor" && (
            <Link
              href="/teach"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Teach
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <div className="relative">
            {searchOpen ? (
              <Input
                type="search"
                placeholder="Search courses..."
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
          
          {user ? (
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
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={user.role === "learner" ? "/learn/settings" : "/teach/settings"}>
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help">Help & Support</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Sign Out</DropdownMenuItem>
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
      </div>
    </header>
  )
}