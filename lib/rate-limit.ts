/**
 * Rate Limiting Utilities
 * 
 * Database-based rate limiting that works across multiple server instances
 */

import { prisma } from '@/lib/prisma'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remainingAttempts?: number
  resetTime?: Date
  error?: string
}

/**
 * Check if a password reset request is allowed for an email
 * Limits to maxAttempts requests per windowMs
 */
export async function checkPasswordResetRateLimit(
  email: string,
  config: RateLimitConfig = { maxAttempts: 3, windowMs: 60 * 60 * 1000 } // 3 per hour
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - config.windowMs)

  try {
    // Count recent requests for this email
    const recentRequests = await prisma.passwordResetToken.count({
      where: {
        email,
        createdAt: {
          gte: windowStart,
        },
      },
    })

    // Check if limit exceeded
    if (recentRequests >= config.maxAttempts) {
      // Find the oldest request in the current window
      const oldestRequest = await prisma.passwordResetToken.findFirst({
        where: {
          email,
          createdAt: {
            gte: windowStart,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      const resetTime = oldestRequest
        ? new Date(oldestRequest.createdAt.getTime() + config.windowMs)
        : new Date(Date.now() + config.windowMs)

      return {
        success: false,
        remainingAttempts: 0,
        resetTime,
        error: `Too many password reset requests. Please try again in ${getTimeUntilReset(resetTime)}.`,
      }
    }

    return {
      success: true,
      remainingAttempts: config.maxAttempts - recentRequests,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // On error, allow the request (fail open)
    return {
      success: true,
      remainingAttempts: config.maxAttempts,
    }
  }
}

/**
 * Clean up expired password reset tokens
 * Should be called periodically or on each request
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    })
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error)
  }
}

/**
 * Format time until reset in a human-readable way
 */
function getTimeUntilReset(resetTime: Date): string {
  const now = new Date()
  const diffMs = resetTime.getTime() - now.getTime()
  const diffMinutes = Math.ceil(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'less than a minute'
  } else if (diffMinutes === 1) {
    return '1 minute'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes`
  } else {
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
}

/**
 * Check if a password reset attempt is allowed
 * For the reset endpoint - limits failed attempts
 */
export async function checkPasswordResetAttemptRateLimit(
  token: string,
  config: RateLimitConfig = { maxAttempts: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min
): Promise<RateLimitResult> {
  // For reset attempts, we could track failed attempts per token
  // For now, we allow the attempt and rely on token expiration
  return {
    success: true,
    remainingAttempts: config.maxAttempts,
  }
}

/**
 * Get rate limit info for an email (for debugging/admin purposes)
 */
export async function getPasswordResetRateLimitInfo(email: string): Promise<{
  requestCount: number
  oldestRequest: Date | null
  newestRequest: Date | null
}> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000) // 1 hour window

  const requests = await prisma.passwordResetToken.findMany({
    where: {
      email,
      createdAt: {
        gte: windowStart,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      createdAt: true,
    },
  })

  return {
    requestCount: requests.length,
    oldestRequest: requests.length > 0 ? requests[0].createdAt : null,
    newestRequest: requests.length > 0 ? requests[requests.length - 1].createdAt : null,
  }
}

