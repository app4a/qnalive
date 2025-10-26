import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const questionSchema = z.object({
  content: z.string().min(10).max(500),
  authorName: z.string().min(2).max(100).optional(),
  sessionId: z.string().optional(),
})

// POST /api/events/[eventId]/questions - Submit question
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()
    const body = await req.json()
    const validatedData = questionSchema.parse(body)

    // Verify event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
    })

    if (!event || !event.isActive) {
      return NextResponse.json(
        { error: 'Event not found or inactive' },
        { status: 404 }
      )
    }

    const settings = event.settings as { moderationEnabled?: boolean; allowAnonymous?: boolean }

    // Check if anonymous questions are allowed
    if (!settings.allowAnonymous && !session?.user?.id) {
      return NextResponse.json(
        { error: 'Anonymous questions are not allowed for this event' },
        { status: 403 }
      )
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        eventId: params.eventId,
        content: validatedData.content,
        authorId: session?.user?.id,
        authorName: validatedData.authorName || session?.user?.name || 'Anonymous',
        status: settings.moderationEnabled ? 'PENDING' : 'APPROVED',
      },
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
        io.to(params.eventId).emit('question:new', { question })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
      // Continue anyway - question was saved
    }

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/events/[eventId]/questions - List questions
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'popular' // popular, recent, answered
    const status = searchParams.get('status') // PENDING, APPROVED, REJECTED

    const session = await auth()
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const isOwner = session?.user?.id === event.ownerId

    // Build query
    const where: any = {
      eventId: params.eventId,
      isArchived: false,
    }

    // Non-owners can only see approved questions
    if (!isOwner) {
      where.status = 'APPROVED'
    } else if (status) {
      where.status = status
    }

    let orderBy: any = {}
    switch (sortBy) {
      case 'recent':
        orderBy = { createdAt: 'desc' }
        break
      case 'answered':
        orderBy = { isAnswered: 'desc' }
        break
      case 'popular':
      default:
        orderBy = { upvotesCount: 'desc' }
        break
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { upvotes: true },
        },
      },
      orderBy,
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error('Failed to fetch questions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

