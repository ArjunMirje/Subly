import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { REQUIRE_EMAIL_VERIFICATION } from './lib/config';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  console.log(`[PROXY] Incoming request: ${pathname}`);

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          console.log('[PROXY] Propagating session cookies to request and response.');
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[PROXY] Error retrieving user:', error.message);
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isLandingPage = pathname === '/';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = isAuthPage || isLandingPage || pathname.startsWith('/api/auth');

  console.log(`[PROXY] Path: ${pathname} | User: ${user ? user.email : 'Anonymous'} | IsPublicRoute: ${isPublicRoute} | IsApiRoute: ${isApiRoute}`);

  // 1. Unauthenticated users trying to access private routes
  if (!user && !isPublicRoute) {
    if (isApiRoute) {
      console.log(`[PROXY] API request to private route ${pathname} by unauthenticated user. Let API handle 401 auth response.`);
      // Allow the API route itself to handle auth verification and return JSON.
    } else {
      console.log(`[PROXY] Redirecting unauthenticated user from private route ${pathname} to /login.`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Email verification check
  if (REQUIRE_EMAIL_VERIFICATION && user && !user.email_confirmed_at && !isPublicRoute && pathname !== '/verify-email') {
    if (isApiRoute) {
      console.log(`[PROXY] API request to private route ${pathname} by unverified user ${user.email}. Returning 403 JSON.`);
      return NextResponse.json({ error: 'Please verify your email address.' }, { status: 403 });
    } else {
      console.log(`[PROXY] Redirecting unverified user ${user.email} from private route ${pathname} to verification prompt.`);
      return NextResponse.redirect(new URL('/login?error=verify', request.url));
    }
  }

  // 3. Authenticated users trying to access login/signup pages
  if (user && isAuthPage) {
    console.log(`[PROXY] Redirecting authenticated user ${user.email} from auth page ${pathname} to /dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
