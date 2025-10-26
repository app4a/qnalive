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

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Check if already upvoted
    if (session?.user?.id) {
      const existing = await prisma.questionUpvote.findUnique({
        where: {
          questionId_userId: {
            questionId: params.id,
            userId: session.user.id,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Already upvoted' },
          { status: 400 }
        )
      }

      // Create upvote
      await prisma.questionUpvote.create({
        data: {
          questionId: params.id,
          userId: session.user.id,
        },
      })
    } else if (sessionId) {
      const existing = await prisma.questionUpvote.findUnique({
        where: {
          questionId_sessionId: {
            questionId: params.id,
            sessionId: sessionId,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Already upvoted' },
          { status: 400 }
        )
      }

      // Create upvote
      await prisma.questionUpvote.create({
        data: {
          questionId: params.id,
          sessionId: sessionId,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Increment upvote count
    const updated = await prisma.question.update({
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

    // Emit Socket.io event for real-time updates
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
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

    if (session?.user?.id) {
      const existing = await prisma.questionUpvote.findUnique({
        where: {
          questionId_userId: {
            questionId: params.id,
            userId: session.user.id,
          },
        },
      })

      if (!existing) {
        return NextResponse.json(
          { error: 'Upvote not found' },
          { status: 404 }
        )
      }

      await prisma.questionUpvote.delete({
        where: {
          questionId_userId: {
            questionId: params.id,
            userId: session.user.id,
          },
        },
      })
    } else if (sessionId) {
      const existing = await prisma.questionUpvote.findUnique({
        where: {
          questionId_sessionId: {
            questionId: params.id,
            sessionId: sessionId,
          },
        },
      })

      if (!existing) {
        return NextResponse.json(
          { error: 'Upvote not found' },
          { status: 404 }
        )
      }

      await prisma.questionUpvote.delete({
        where: {
          questionId_sessionId: {
            questionId: params.id,
            sessionId: sessionId,
          },
        },
      })
    } else {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Decrement upvote count
    const updated = await prisma.question.update({
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to remove upvote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

