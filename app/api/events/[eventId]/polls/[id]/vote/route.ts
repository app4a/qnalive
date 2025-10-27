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

    const userId = session?.user?.id

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check if already voted (unless multiple votes allowed)
      if (!poll.allowMultipleVotes) {
        if (userId) {
          const existingVote = await tx.pollVote.findFirst({
            where: {
              pollId: params.id,
              userId: userId,
            },
          })

          if (existingVote) {
            // If clicking the same option, allow unvoting
            if (existingVote.optionId === optionId) {
              throw new Error('ALLOW_UNVOTE')
            }
            throw new Error('Already voted on a different option')
          }
        } else if (sessionId) {
          const existingVote = await tx.pollVote.findFirst({
            where: {
              pollId: params.id,
              sessionId: sessionId,
            },
          })

          if (existingVote) {
            // If clicking the same option, allow unvoting
            if (existingVote.optionId === optionId) {
              throw new Error('ALLOW_UNVOTE')
            }
            throw new Error('Already voted on a different option')
          }
        }
      }

      // Create vote - will fail with P2002 if duplicate due to unique constraint
      try {
        if (userId) {
          await tx.pollVote.create({
            data: {
              pollId: params.id,
              optionId: optionId,
              userId: userId,
            },
          })
        } else {
          await tx.pollVote.create({
            data: {
              pollId: params.id,
              optionId: optionId,
              sessionId: sessionId!,
            },
          })
        }
      } catch (error: any) {
        // P2002 is Prisma's unique constraint violation code
        if (error.code === 'P2002') {
          throw new Error('Already voted')
        }
        throw error
      }

      // Increment vote count atomically
      const updatedOption = await tx.pollOption.update({
        where: { id: optionId },
        data: { votesCount: { increment: 1 } },
      })

      // Get updated poll with all votes
      const updatedPoll = await tx.poll.findUnique({
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

      return { updatedOption, updatedPoll }
    })

    const { updatedOption, updatedPoll } = result

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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'ALLOW_UNVOTE') {
      return NextResponse.json(
        { error: 'Already voted', allowUnvote: true },
        { status: 400 }
      )
    }

    if (error.message === 'Already voted' || error.message === 'Already voted on a different option') {
      return NextResponse.json(
        { error: error.message },
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

    const userId = session?.user?.id

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'User ID or Session ID required' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Find and delete the vote
      let deletedVote
      if (userId) {
        deletedVote = await tx.pollVote.deleteMany({
          where: {
            pollId: params.id,
            optionId: optionId,
            userId: userId,
          },
        })
      } else {
        deletedVote = await tx.pollVote.deleteMany({
          where: {
            pollId: params.id,
            optionId: optionId,
            sessionId: sessionId!,
          },
        })
      }

      if (deletedVote.count === 0) {
        throw new Error('Vote not found')
      }

      // Decrement vote count atomically
      const updatedOption = await tx.pollOption.update({
        where: { id: optionId },
        data: { votesCount: { decrement: 1 } },
      })

      // Get updated poll
      const updatedPoll = await tx.poll.findUnique({
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

      return { updatedOption, updatedPoll }
    })

    const { updatedOption, updatedPoll } = result

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
  } catch (error: any) {
    if (error.message === 'Vote not found') {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    console.error('Failed to remove vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

