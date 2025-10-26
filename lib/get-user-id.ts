"use client"

/**
 * Get the current user ID from the session if available
 * This should be called client-side only
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/session')
    const session = await response.json()
    return session?.user?.id || null
  } catch {
    return null
  }
}

