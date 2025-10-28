import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkPasswordResetRateLimit, cleanupExpiredPasswordResetTokens } from '@/lib/rate-limit'
import crypto from 'crypto'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // Clean up expired tokens (opportunistic cleanup)
    cleanupExpiredPasswordResetTokens().catch(err => 
      console.error('Failed to cleanup expired tokens:', err)
    )

    // Check rate limit (3 requests per hour per email)
    const rateLimitResult = await checkPasswordResetRateLimit(validatedData.email)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: rateLimitResult.error || 'Too many requests. Please try again later.',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // Always return success to prevent email enumeration
    // (Don't reveal whether email exists or not)
    if (!user || !user.passwordHash) {
      // User doesn't exist or uses OAuth only
      return NextResponse.json(
        { 
          message: 'If an account exists with that email, you will receive a password reset link.',
        },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    // Token expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000)

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: validatedData.email },
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        email: validatedData.email,
        token: hashedToken,
        expires,
      },
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Send password reset email (automatically switches between console/email based on config)
    try {
      await sendPasswordResetEmail(validatedData.email, resetUrl)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Don't fail the request - still return success to prevent email enumeration
    }

    return NextResponse.json(
      { 
        message: 'If an account exists with that email, you will receive a password reset link.',
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}

