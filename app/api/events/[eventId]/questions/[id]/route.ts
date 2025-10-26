import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateQuestionSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isAnswered: z.boolean().optional(),
  isArchived: z.boolean().optional(),
})

// PUT /api/events/[eventId]/questions/[id] - Update question (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (event.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = updateQuestionSchema.parse(body)

    const question = await prisma.question.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        upvotes: {
          select: {
            userId: true,
            sessionId: true,
          },
        },
        _count: {
          select: { upvotes: true },
        },
      },
    })

    // Emit Socket.io events for real-time updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        // If status changed to APPROVED, broadcast to everyone
        if (validatedData.status === 'APPROVED') {
          io.to(params.eventId).emit('question:new', { question })
          // Also send update to author's personal room
          if (question.authorId) {
            io.to(`user:${question.authorId}`).emit('question:updated', { question })
          }
        }
        // If archived, emit update event (admins see it, participants filter it out)
        else if (validatedData.isArchived) {
          io.to(params.eventId).emit('question:updated', { question })
          // Also notify author that their question was archived
          if (question.authorId) {
            io.to(`user:${question.authorId}`).emit('question:updated', { question })
          }
        }
        // For status changes (PENDING, REJECTED) or other updates, emit update event
        else {
          // Broadcast to event room for admins
          io.to(params.eventId).emit('question:updated', { question })
          // Also send to author's personal room so they see status change
          if (question.authorId) {
            io.to(`user:${question.authorId}`).emit('question:updated', { question })
          }
        }
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(question)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to update question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[eventId]/questions/[id] - Delete question (admin or question author)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user is event owner OR question author
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    const isOwner = event.ownerId === session.user.id
    const isAuthor = question.authorId === session.user.id

    if (!isOwner && !isAuthor) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.question.delete({
      where: { id: params.id },
    })

    // Emit Socket.io event for real-time updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        io.to(params.eventId).emit('question:deleted', { questionId: params.id })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Failed to delete question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

