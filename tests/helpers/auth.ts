/**
 * Authentication Test Helpers
 * 
 * Helpers for managing authentication state in Playwright tests
 */

import { Page, BrowserContext } from '@playwright/test'
import { prisma } from '../fixtures'

/**
 * Sign in a user in Playwright
 * This simulates a user session by setting the appropriate cookies
 */
export async function signIn(
  page: Page,
  user: { id: string; email: string; name: string | null }
) {
  // For Playwright tests, we'll use a simple approach:
  // Navigate to a special test endpoint that sets up the session
  // Or use cookie injection
  
  // Note: This is a simplified version. In a real implementation,
  // you would need to work with NextAuth's session mechanism
  
  // For now, we'll use localStorage to store user info
  // (This would need to be adapted based on how your auth works)
  await page.evaluate((userData) => {
    localStorage.setItem('test-user', JSON.stringify(userData))
  }, user)
}

/**
 * Sign out a user in Playwright
 */
export async function signOut(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('test-user')
  })
}

/**
 * Get a unique session ID for anonymous users
 */
export function getSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get the current session from the page
 */
export async function getSession(page: Page): Promise<any> {
  return page.evaluate(() => {
    const userStr = localStorage.getItem('test-user')
    return userStr ? JSON.parse(userStr) : null
  })
}

/**
 * Set up a test user session by actually signing in
 * This works with NextAuth JWT sessions
 */
export async function setupTestSession(
  context: BrowserContext,
  userEmail: string,
  password: string = 'testpassword123'
) {
  const bcrypt = require('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 10)
  
  // Get or create the user with credentials
  let user = await prisma.user.findUnique({
    where: { email: userEmail },
  })
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: userEmail.split('@')[0],
        emailVerified: new Date(),
        passwordHash,
      },
    })
  } else if (!user.passwordHash) {
    // Update existing user to have a password
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })
  }
  
  // Create a new page to sign in
  const page = await context.newPage()
  
  try {
    // Navigate to sign-in page
    await page.goto('/auth/signin', { waitUntil: 'networkidle' })
    
    // Wait for the form to be visible
    await page.waitForSelector('input#email', { timeout: 5000 })
    
    // Fill in credentials using the specific IDs from the sign-in page
    await page.fill('input#email', userEmail)
    await page.fill('input#password', password)
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait a bit for the submission
    await page.waitForTimeout(2000)
    
    // Check if we're still on sign-in page (sign-in failed)
    const currentUrl = page.url()
    if (currentUrl.includes('/auth/signin')) {
      // Check for error messages
      const hasError = await page.locator('text=/Invalid email or password|Error/i').isVisible().catch(() => false)
      if (hasError) {
        throw new Error(`Sign-in failed - invalid credentials or other error`)
      }
      // Otherwise wait a bit more for redirect
      await page.waitForURL(/\/dashboard|^\/$|\/e\//, { timeout: 10000 }).catch(() => {
        throw new Error(`Sign-in timed out - no redirect from ${currentUrl}`)
      })
    }
    
    return { user, password }
  } finally {
    // Always close the page, keeping the context with the session cookie
    await page.close()
  }
}

/**
 * Clear all authentication state
 */
export async function clearAuth(context: BrowserContext) {
  await context.clearCookies()
}

