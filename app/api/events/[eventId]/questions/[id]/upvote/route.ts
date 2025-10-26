import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const upvoteSchema = z.object({
  sessionId: z.string().optional(),
})

// POST /api/events/[eventId]/questions/[id]/upvote - Upvote question
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()
    const body = await req.json()
    const { sessionId } = upvoteSchema.parse(body)

    const userId = session?.user?.id
    
    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const updated = await prisma.$transaction(async (tx) => {
      // Verify question exists
      const question = await tx.question.findUnique({
        where: { id: params.id },
      })

      if (!question) {
        throw new Error('Question not found')
      }

      // Try to create upvote - will fail if duplicate due to unique constraint
      try {
        await tx.questionUpvote.create({
          data: {
            questionId: params.id,
            userId: userId || null,
            sessionId: !userId ? sessionId : null,
          },
        })
      } catch (error: any) {
        // P2002 is Prisma's unique constraint violation code
        if (error.code === 'P2002') {
          throw new Error('Already upvoted')
        }
        throw error
      }

      // Increment upvote count atomically
      const updatedQuestion = await tx.question.update({
        where: { id: params.id },
        data: { upvotesCount: { increment: 1 } },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { upvotes: true },
          },
        },
      })

      return updatedQuestion
    })

    // Emit Socket.io event for real-time updates (outside transaction)
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        io.to(params.eventId).emit('question:upvoted', {
          questionId: params.id,
          upvotesCount: updated.upvotesCount,
        })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Question not found') {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    if (error.message === 'Already upvoted') {
      return NextResponse.json(
        { error: 'Already upvoted' },
        { status: 400 }
      )
    }

    console.error('Failed to upvote question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[eventId]/questions/[id]/upvote - Remove upvote
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    const userId = session?.user?.id

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const updated = await prisma.$transaction(async (tx) => {
      // Try to delete upvote - will fail if not found
      let deleteResult
      try {
        if (userId) {
          deleteResult = await tx.questionUpvote.delete({
            where: {
              questionId_userId: {
                questionId: params.id,
                userId: userId,
              },
            },
          })
        } else {
          deleteResult = await tx.questionUpvote.delete({
            where: {
              questionId_sessionId: {
                questionId: params.id,
                sessionId: sessionId!,
              },
            },
          })
        }
      } catch (error: any) {
        // P2025 is Prisma's "Record not found" code
        if (error.code === 'P2025') {
          throw new Error('Upvote not found')
        }
        throw error
      }

      // Decrement upvote count atomically
      const updatedQuestion = await tx.question.update({
        where: { id: params.id },
        data: { upvotesCount: { decrement: 1 } },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { upvotes: true },
          },
        },
      })

      return updatedQuestion
    })

    // Emit Socket.io event for real-time updates (outside transaction)
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        io.to(params.eventId).emit('question:upvoted', {
          questionId: params.id,
          upvotesCount: updated.upvotesCount,
        })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.message === 'Upvote not found') {
      return NextResponse.json(
        { error: 'Upvote not found' },
        { status: 404 }
      )
    }

    console.error('Failed to remove upvote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

