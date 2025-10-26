import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const voteSchema = z.object({
  optionId: z.string(),
  sessionId: z.string().optional(),
})

// POST /api/events/[eventId]/polls/[id]/vote - Submit vote
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()
    const body = await req.json()
    const { optionId, sessionId } = voteSchema.parse(body)

    // Verify poll exists and is active
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: true,
      },
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    if (!poll.isActive) {
      return NextResponse.json(
        { error: 'Poll is not active' },
        { status: 403 }
      )
    }

    // Verify option belongs to poll
    const option = poll.options.find(o => o.id === optionId)
    if (!option) {
      return NextResponse.json(
        { error: 'Invalid option' },
        { status: 400 }
      )
    }

    // Check if already voted (unless multiple votes allowed)
    if (!poll.allowMultipleVotes) {
      if (session?.user?.id) {
        const existingVote = await prisma.pollVote.findFirst({
          where: {
            pollId: params.id,
            userId: session.user.id,
          },
        })

        if (existingVote) {
          // If clicking the same option, allow unvoting
          if (existingVote.optionId === optionId) {
            return NextResponse.json(
              { error: 'Already voted', allowUnvote: true },
              { status: 400 }
            )
          }
          return NextResponse.json(
            { error: 'Already voted on a different option' },
            { status: 400 }
          )
        }
      } else if (sessionId) {
        const existingVote = await prisma.pollVote.findFirst({
          where: {
            pollId: params.id,
            sessionId: sessionId,
          },
        })

        if (existingVote) {
          // If clicking the same option, allow unvoting
          if (existingVote.optionId === optionId) {
            return NextResponse.json(
              { error: 'Already voted', allowUnvote: true },
              { status: 400 }
            )
          }
          return NextResponse.json(
            { error: 'Already voted on a different option' },
            { status: 400 }
          )
        }
      }
    }

    // Create vote
    if (session?.user?.id) {
      await prisma.pollVote.create({
        data: {
          pollId: params.id,
          optionId: optionId,
          userId: session.user.id,
        },
      })
    } else if (sessionId) {
      await prisma.pollVote.create({
        data: {
          pollId: params.id,
          optionId: optionId,
          sessionId: sessionId,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Increment vote count
    const updatedOption = await prisma.pollOption.update({
      where: { id: optionId },
      data: { votesCount: { increment: 1 } },
    })

    // Get updated poll with all votes
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { votes: true },
        },
      },
    })

    // Emit Socket.io event for real-time updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        io.to(params.eventId).emit('poll:voted', {
          pollId: params.id,
          optionId: optionId,
          votesCount: updatedOption.votesCount,
        })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(updatedPoll)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to submit vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[eventId]/polls/[id]/vote - Remove vote (unvote)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const optionId = searchParams.get('optionId')

    if (!optionId) {
      return NextResponse.json(
        { error: 'Option ID required' },
        { status: 400 }
      )
    }

    // Verify poll exists
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Find and delete the vote
    let deletedVote
    if (session?.user?.id) {
      deletedVote = await prisma.pollVote.deleteMany({
        where: {
          pollId: params.id,
          optionId: optionId,
          userId: session.user.id,
        },
      })
    } else if (sessionId) {
      deletedVote = await prisma.pollVote.deleteMany({
        where: {
          pollId: params.id,
          optionId: optionId,
          sessionId: sessionId,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    if (deletedVote.count === 0) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    // Decrement vote count
    const updatedOption = await prisma.pollOption.update({
      where: { id: optionId },
      data: { votesCount: { decrement: 1 } },
    })

    // Get updated poll
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { votes: true },
        },
      },
    })

    // Emit Socket.io event for real-time updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        io.to(params.eventId).emit('poll:voted', {
          pollId: params.id,
          optionId: optionId,
          votesCount: updatedOption.votesCount,
        })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(updatedPoll)
  } catch (error) {
    console.error('Failed to remove vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

