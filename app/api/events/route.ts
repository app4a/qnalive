import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateEventCode } from '@/lib/utils'
import { z } from 'zod'

const createEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  settings: z.object({
    allowAnonymous: z.boolean().default(true),
    moderationEnabled: z.boolean().default(false),
    showResultsImmediately: z.boolean().default(true),
    allowParticipantPolls: z.boolean().default(false),
  }).optional(),
})

// POST /api/events - Create new event
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Creating event for user:', session.user.id, session.user.email)

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!userExists) {
      console.error('User not found in database:', session.user.id)
      return NextResponse.json(
        { error: 'User not found. Please sign out and sign in again.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = createEventSchema.parse(body)

    // Generate unique event code
    let eventCode = generateEventCode()
    let codeExists = await prisma.event.findUnique({
      where: { eventCode },
    })

    // Regenerate if code already exists
    while (codeExists) {
      eventCode = generateEventCode()
      codeExists = await prisma.event.findUnique({
        where: { eventCode },
      })
    }

    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        eventCode,
        ownerId: session.user.id,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
        settings: validatedData.settings || {
          allowAnonymous: true,
          moderationEnabled: false,
          showResultsImmediately: true,
          allowParticipantPolls: false,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            questions: true,
            polls: true,
            participants: true,
          },
        },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/events - List user's events
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const events = await prisma.event.findMany({
      where: {
        ownerId: session.user.id,
      },
      include: {
        _count: {
          select: {
            questions: true,
            polls: true,
            participants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

