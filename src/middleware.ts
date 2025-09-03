import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/role-utils.server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/student', '/instructor', '/admin']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect to login if trying to access protected route without auth
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based route protection
  if (user && isProtectedPath) {
    // Check active role cookie first
    const activeRoleCookie = request.cookies.get('active-role')
    let activeRole = activeRoleCookie?.value
    
    // Get user's database role from profile for permission validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const databaseRole = profile.role
      
      // Validate active role against database permissions
      if (activeRole) {
        // If trying to use instructor mode, must have instructor permissions
        if (activeRole === 'instructor' && databaseRole !== 'instructor' && databaseRole !== 'admin') {
          activeRole = 'student'
          // Clear the invalid cookie
          response.cookies.delete('active-role')
        }
      } else {
        // No active role cookie, use database role
        activeRole = databaseRole
      }
      
      // Check route access based on active role - STRICT MODE ENFORCEMENT
      // Like Upwork: when in one mode, you cannot access the other mode's routes
      
      if (request.nextUrl.pathname.startsWith('/instructor')) {
        if (activeRole !== 'instructor') {
          return NextResponse.redirect(new URL('/student', request.url))
        }
        // Also verify they have instructor permissions in database
        if (databaseRole !== 'instructor' && databaseRole !== 'admin') {
          return NextResponse.redirect(new URL('/student', request.url))
        }
      }
      
      // STRICT: When in instructor mode, cannot access student routes
      if (request.nextUrl.pathname.startsWith('/student')) {
        if (activeRole === 'instructor') {
          return NextResponse.redirect(new URL('/instructor', request.url))
        }
      }
      
      if (request.nextUrl.pathname.startsWith('/admin')) {
        if (activeRole !== 'admin') {
          return NextResponse.redirect(new URL('/student', request.url))
        }
        // Also verify they have admin permissions in database
        if (databaseRole !== 'admin') {
          return NextResponse.redirect(new URL('/student', request.url))
        }
      }
    }
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/student', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}