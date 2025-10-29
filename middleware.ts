import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { auth } from '@/auth';
import type { NextRequest } from 'next/server';

// Create i18n middleware
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export default auth(async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip i18n processing for API routes (including /api/auth/*)
  // API routes should never have locale prefixes
  if (pathname.startsWith('/api/')) {
    return;
  }
  
  // Handle i18n routing for all other routes
  const i18nResponse = handleI18nRouting(request);
  
  // If i18n middleware returned a response (redirect/rewrite), return it
  if (i18nResponse) {
    return i18nResponse;
  }
  
  // Continue with normal flow (auth checks happen via the auth() wrapper)
  return;
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - _next (Next.js internals)
    // - static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|socketio).*)',
  ],
};

