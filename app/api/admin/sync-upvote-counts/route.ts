import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/sync-upvote-counts - Sync upvote counts with actual upvote records
// This endpoint can be called periodically (e.g., via cron job) to fix any drift
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    // Only allow authenticated admins (you can add a specific admin check here)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all questions with their actual upvote counts
    const questions = await prisma.question.findMany({
      select: {
        id: true,
        upvotesCount: true,
        _count: {
          select: { upvotes: true },
        },
      },
    })

    let fixed = 0
    const errors = []

    // Update any questions where count doesn't match
    for (const question of questions) {
      const actualCount = question._count.upvotes
      const storedCount = question.upvotesCount

      if (actualCount !== storedCount) {
        try {
          await prisma.question.update({
            where: { id: question.id },
            data: { upvotesCount: actualCount },
          })
          fixed++
        } catch (error: any) {
          errors.push({ questionId: question.id, error: error.message })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced upvote counts. Fixed ${fixed} questions out of ${questions.length} total.`,
      fixed,
      total: questions.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Failed to sync upvote counts:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

