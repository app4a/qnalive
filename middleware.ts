import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

// Create i18n middleware
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export default auth(async function middleware(request: NextRequest) {
  // Apply i18n routing
  return handleI18nRouting(request);
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - api routes
    // - _next (Next.js internals)
    // - static files
    '/((?!api|_next/static|_next/image|favicon.ico|socketio).*)',
  ],
};

