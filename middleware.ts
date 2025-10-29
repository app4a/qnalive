import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { auth } from '@/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Create i18n middleware
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for API routes - let NextAuth handle them
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle i18n routing first
  const i18nResponse = handleI18nRouting(req);

  // Extract pathname without locale prefix for auth checks
  const pathWithoutLocale = pathname.replace(/^\/(en|ko)/, '') || '/';

  // Don't check auth for non-protected routes
  if (pathWithoutLocale.startsWith('/auth/') || !pathWithoutLocale.startsWith('/dashboard')) {
    return i18nResponse;
  }

  // Check authentication for dashboard routes
  const session = await auth();
  if (!session?.user) {
    // Redirect to sign in, preserving the locale
    const localePrefix = pathname.match(/^\/(ko)/)?.[1] ? '/ko' : '';
    const signInUrl = new URL(`${localePrefix}/auth/signin`, req.url);
    return NextResponse.redirect(signInUrl);
  }

  return i18nResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes (handled separately)
    // - _next (Next.js internals)  
    // - static files
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|socketio).*)',
  ],
};

