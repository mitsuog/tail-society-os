import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Recuperar la sesión del usuario
  const { data: { user } } = await supabase.auth.getUser()

  // --- REGLAS DE SEGURIDAD ---

  // 1. Si el usuario NO está logueado y trata de entrar a cualquier página que NO sea login...
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    // ...redirigirlo al Login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Si el usuario SÍ está logueado y trata de entrar al login...
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    // ...redirigirlo al Dashboard (Home)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (icono de la pestaña)
     * - Archivos de imágenes (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}