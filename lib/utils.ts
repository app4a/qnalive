import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate unique 6-character event code
 * Excludes ambiguous characters (0, O, I, 1, etc.)
 */
export function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Generate or retrieve session ID for anonymous users
 * Stores in localStorage for persistent tracking
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

/**
 * Format date to relative time (e.g., "2m ago", "5h ago")
 * Supports i18n through Intl.RelativeTimeFormat
 */
export function formatRelativeTime(date: Date, locale: string = 'en'): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
    
    if (seconds < 60) {
      return rtf.format(-Math.floor(seconds), 'second')
    }
    if (seconds < 3600) {
      return rtf.format(-Math.floor(seconds / 60), 'minute')
    }
    if (seconds < 86400) {
      return rtf.format(-Math.floor(seconds / 3600), 'hour')
    }
    return rtf.format(-Math.floor(seconds / 86400), 'day')
  } catch {
    // Fallback for unsupported browsers
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
}

/**
 * Validate event code format
 */
export function isValidEventCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}

