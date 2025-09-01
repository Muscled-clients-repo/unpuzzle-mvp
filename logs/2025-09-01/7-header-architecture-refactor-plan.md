# Header Architecture Refactor Plan
**Date**: September 1, 2025  
**Issue**: Unoptimized header architecture with code duplication and inconsistent data sources  
**Goal**: Single unified header with role-based logic for optimal performance and maintainability

---

## Current Problems

### Architecture Issues
```
❌ CURRENT STATE:
├── /src/components/layout/header.tsx (USED - generic, handles both roles poorly)
├── /src/components/instructor/layout/InstructorHeader.tsx (UNUSED - specialized but ignored)
├── /src/components/student/layout/StudentHeader.tsx (UNUSED - specialized but ignored)
└── Layouts handling auth data inconsistently
```

### Specific Problems
1. **Code Duplication**: 3 header components with overlapping functionality
2. **Inconsistent Auth**: Student layout used `useAuth()`, instructor used mock data
3. **Unused Components**: Specialized headers exist but aren't imported/used
4. **Maintenance Burden**: Changes require updates in multiple places
5. **Poor Performance**: Multiple similar components loaded in bundle
6. **Inconsistent UX**: Different behaviors for same functionality across roles

---

## Recommended Architecture: Single Unified Header

### ✅ PROPOSED STATE:
```
/src/components/layout/Header.tsx (NEW - single component with role-based logic)
├── Internal role detection via useAuth()
├── Conditional rendering based on user role
├── Role-specific features handled internally
├── Consistent auth data source
└── Single source of truth for all header functionality
```

### Benefits
1. **Single Source of Truth**: One component handles all header logic
2. **Consistent Auth**: Always uses `useAuth()` for real data
3. **Better Performance**: One component vs multiple unused ones
4. **Easier Maintenance**: Changes in one place affect all routes
5. **Type Safety**: Single interface covers all role variations
6. **Better Testing**: Test one component thoroughly vs testing three

---

## Implementation Plan

### Phase 1: Create Unified Header Component

**File**: `/src/components/layout/Header.tsx`

```typescript
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Bell, Search, User, Menu, Eye, LogOut, ChevronLeft
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  getUserRole, getUserInfo, getHomeRoute, getSearchPlaceholder, 
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
  onSignOut: () => void
}

export function Header({ backButton }: HeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  // Derive user role and info from auth context
  const userRole = getUserRole(user)
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
          user={userInfo}
          userRole={userRole}
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

function HeaderActions({ user, userRole, onSignOut }: HeaderActionsProps) {
  const menuItems = getRoleSpecificMenuItems(userRole)
  
  return (
    <div className="flex items-center gap-3 justify-end">
      
      {/* Role-specific badge */}
      {userRole === "instructor" && (
        <Badge variant="default" className="gap-1">
          <Eye className="h-3 w-3" />
          INSTRUCTOR MODE
        </Badge>
      )}
      
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
```

### Phase 2: Role-specific Logic Utilities

**File**: `/src/components/layout/header-utils.ts`

```typescript
import { Settings, BarChart3, GraduationCap, TrendingUp, MessageCircle } from 'lucide-react'

export type UserRole = 'student' | 'instructor' | 'admin' | null

type IconName = 'Settings' | 'BarChart3' | 'GraduationCap' | 'TrendingUp' | 'MessageCircle'

export function getUserRole(user: any): UserRole {
  if (!user) return null
  
  // Get from user metadata or profile
  return user.user_metadata?.role || 
         user.app_metadata?.role || 
         'student' // default fallback
}

export function getUserInfo(user: any) {
  if (!user) return null
  
  return {
    name: user.user_metadata?.full_name || 
          user.email?.split('@')[0] || 
          'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url
  }
}

export function getHomeRoute(role: UserRole): string {
  switch (role) {
    case 'instructor': return '/instructor'
    case 'student': return '/student'
    case 'admin': return '/admin'
    default: return '/'
  }
}

export function getSearchPlaceholder(role: UserRole): string {
  switch (role) {
    case 'instructor': return 'Search students, courses, analytics...'
    case 'student': return 'Search courses, lessons, topics...'
    case 'admin': return 'Search users, system data...'
    default: return 'Search...'
  }
}

export function getRoleSpecificMenuItems(role: UserRole) {
  const base: Array<{ href: string; label: string; icon: IconName }> = [
    { href: '/help', label: 'Help & Support', icon: 'MessageCircle' }
  ]
  
  switch (role) {
    case 'instructor':
      return [
        { href: '/instructor/settings', label: 'Instructor Settings', icon: 'Settings' },
        { href: '/instructor/analytics', label: 'Analytics Dashboard', icon: 'BarChart3' },
        { href: '/student', label: 'Switch to Student Mode', icon: 'GraduationCap' },
        ...base
      ]
    
    case 'student':
      return [
        { href: '/student/settings', label: 'Settings', icon: 'Settings' },
        { href: '/student/progress', label: 'My Progress', icon: 'TrendingUp' },
        ...base
      ]
    
    default:
      return base
  }
}

// Icon mapping utility - centralized icon management
export function getIconComponent(iconName: IconName) {
  const iconMap = {
    Settings,
    BarChart3,
    GraduationCap,
    TrendingUp,
    MessageCircle,
  } as const
  
  return iconMap[iconName] || Settings // fallback to Settings if icon not found
}
```

### Phase 3: Update Layouts

**Instructor Layout**: `/src/app/instructor/layout.tsx`
```typescript
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/sidebar"
import { CourseSelector } from "@/components/instructor/course-selector"

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullscreenPage = pathname.includes('/studio') || pathname.includes('/video/')
  
  return (
    <div className="min-h-screen">
      {!isFullscreenPage && <Header />}
      {!isFullscreenPage && <Sidebar role="instructor" />}
      <div className={isFullscreenPage ? "" : "md:pl-64 pt-16"}>
        {!isFullscreenPage && <CourseSelector />}
        <main className={isFullscreenPage ? "min-h-screen" : "min-h-[calc(100vh-4rem)]"}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Student Layout**: `/src/app/student/layout.tsx`
```typescript
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/sidebar"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isVideoPage = pathname.includes('/video/')
  
  // Extract course ID from video page URL for back navigation
  const getCourseIdFromPath = () => {
    const match = pathname.match(/\/student\/course\/([^\/]+)\/video/)
    return match ? match[1] : null
  }
  
  const courseId = getCourseIdFromPath()
  const backButton = isVideoPage && courseId 
    ? { href: `/student/course/${courseId}`, label: "Back to course" }
    : undefined
  
  return (
    <div className="min-h-screen">
      <Header backButton={backButton} />
      {!isVideoPage && <Sidebar role="student" />}
      <div className={isVideoPage ? "pt-16" : "md:pl-64 pt-16"}>
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Phase 4: Cleanup

**Files to Remove**:
- `/src/components/layout/header.tsx` (current generic header - will be completely replaced)
- `/src/components/instructor/layout/InstructorHeader.tsx` (unused specialized header)
- `/src/components/student/layout/StudentHeader.tsx` (unused specialized header)

**Implementation Strategy**:
1. Create new `/src/components/layout/Header.tsx` (capitalized H)
2. Create new `/src/components/layout/header-utils.ts`  
3. Update layouts to import from new files
4. Remove old files after confirming everything works

---

## Alternative Architectures Considered

### Option 2: Composition-based Headers
```typescript
// NOT RECOMMENDED - More complex
<Header>
  <Header.Left role={userRole} />
  <Header.Search role={userRole} />
  <Header.Actions role={userRole} />
</Header>
```
**Rejected**: More complex API, harder to maintain

### Option 3: Keep Separate Headers
```typescript
// NOT RECOMMENDED - Maintains current problems
{userRole === 'instructor' ? <InstructorHeader /> : <StudentHeader />}
```
**Rejected**: Still requires duplicate code maintenance

---

## Implementation Checklist

### Development Tasks
- [ ] Create `Header` component with role detection
- [ ] Create header utility functions for role-specific logic
- [ ] Update instructor layout to use Header
- [ ] Update student layout to use Header  
- [ ] Remove old header components
- [ ] Update any imports across codebase
- [ ] Test all role-specific features work correctly

### Testing Requirements
- [ ] Test instructor role shows instructor badge and menu items
- [ ] Test student role shows appropriate search and navigation
- [ ] Test role switching works correctly
- [ ] Test auth data consistency across all routes
- [ ] Test mobile menu works for both roles
- [ ] Test unauthenticated state shows login/signup buttons
- [ ] Performance test - ensure single header loads faster

### Verification
- [ ] No unused header components in codebase
- [ ] Consistent auth data source everywhere
- [ ] Role-specific features work as expected
- [ ] Bundle size reduced (removed duplicate components)
- [ ] Type safety maintained across all role variations

---

## Expected Results

### Performance Improvements
- **Bundle Size**: ~30% reduction in header-related code
- **Load Time**: Single component loads faster than multiple unused ones
- **Memory**: Less React component instances in memory

### Developer Experience
- **Maintenance**: Single file to update for header changes
- **Consistency**: Same auth data source everywhere
- **Type Safety**: Single interface covers all variations
- **Testing**: One comprehensive test suite vs three separate ones

### User Experience
- **Consistency**: Same header behavior across all routes
- **Performance**: Faster initial load and navigation
- **Features**: Role-specific optimizations work reliably

---

## Migration Strategy

### Phase 1: Parallel Implementation (Safe)
1. Create Header alongside existing headers
2. Test thoroughly in development
3. Verify all role-specific functionality

### Phase 2: Gradual Rollout
1. Switch instructor layout to Header first
2. Verify production stability
3. Switch student layout to Header
4. Remove old components

### Phase 3: Optimization
1. Bundle analysis to confirm size reduction
2. Performance testing
3. Code cleanup and documentation

This architecture will give us **optimal performance**, **easier maintenance**, and **consistent behavior** across all user roles while eliminating code duplication.