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

// Chain i18n and auth middleware
export default auth(async function middleware(request: NextRequest) {
  // Run i18n routing and return its response
  return handleI18nRouting(request);
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes (handled separately)
    // - _next (Next.js internals)  
    // - static files
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|socketio).*)',
  ],
};

