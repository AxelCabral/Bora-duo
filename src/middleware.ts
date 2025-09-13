import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  console.log('Middleware - Path:', req.nextUrl.pathname, 'Session:', session ? 'Present' : 'None', 'Error:', error)

  // Rotas que precisam de autenticação
  const protectedRoutes = ['/perfil']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Se for uma rota protegida e não há sessão, redirecionar para login
  if (isProtectedRoute && !session) {
    console.log('Redirecting to login - no session for protected route')
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se estiver logado e tentar acessar login/signup, redirecionar para perfil
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    console.log('Redirecting to profile - user already logged in')
    return NextResponse.redirect(new URL('/perfil', req.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
