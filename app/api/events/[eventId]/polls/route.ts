import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPollSchema = z.object({
  title: z.string().min(5).max(255),
  type: z.enum(['MULTIPLE_CHOICE', 'YES_NO', 'RATING', 'WORD_CLOUD']),
  options: z.array(z.string().min(1).max(255)).min(2).max(10),
  allowMultipleVotes: z.boolean().optional().default(false),
  settings: z.object({
    showResultsImmediately: z.boolean().optional(),
  }).optional(),
})

// POST /api/events/[eventId]/polls - Create poll
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
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

    // Check if user is owner or if participant polls are allowed
    const settings = event.settings as { allowParticipantPolls?: boolean }
    if (event.ownerId !== session.user.id && !settings.allowParticipantPolls) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = createPollSchema.parse(body)

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        eventId: params.eventId,
        createdById: session.user.id,
        title: validatedData.title,
        type: validatedData.type,
        allowMultipleVotes: validatedData.allowMultipleVotes,
        settings: validatedData.settings || {},
        options: {
          create: validatedData.options.map((optionText, index) => ({
            optionText,
            displayOrder: index,
          })),
        },
      },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
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
        console.log(`Emitting poll:new event for poll ${poll.id} to event room ${params.eventId}`)
        io.to(params.eventId).emit('poll:new', { poll })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
      // Continue anyway - poll was saved
    }

    return NextResponse.json(poll, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/events/[eventId]/polls - List polls
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const sessionId = searchParams.get('sessionId')
    const userId = session?.user?.id

    const where: any = {
      eventId: params.eventId,
    }

    if (activeOnly) {
      where.isActive = true
    }

    const polls = await prisma.poll.findMany({
      where,
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // If user is authenticated or has sessionId, include their votes
    if (userId || sessionId) {
      const userVotes = await prisma.pollVote.findMany({
        where: {
          pollId: { in: polls.map(p => p.id) },
          ...(userId ? { userId } : { sessionId }),
        },
        select: {
          pollId: true,
          optionId: true,
        },
      })

      // Add userVote field to polls
      const pollsWithUserVotes = polls.map(poll => ({
        ...poll,
        userVote: userVotes.find(v => v.pollId === poll.id)?.optionId || null,
      }))

      return NextResponse.json(pollsWithUserVotes)
    }

    return NextResponse.json(polls)
  } catch (error) {
    console.error('Failed to fetch polls:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

