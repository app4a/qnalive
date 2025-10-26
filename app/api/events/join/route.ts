import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const joinEventSchema = z.object({
  eventCode: z.string().length(6),
  sessionId: z.string().optional(),
})

// POST /api/events/join - Join event by code
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const body = await req.json()
    const { eventCode, sessionId } = joinEventSchema.parse(body)

    // Find event
    const event = await prisma.event.findUnique({
      where: { eventCode: eventCode.toUpperCase() },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 403 }
      )
    }

    // Create or update participant record
    const participantData: any = {
      eventId: event.id,
      lastActive: new Date(),
    }

    if (session?.user?.id) {
      participantData.userId = session.user.id
      
      await prisma.eventParticipant.upsert({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: session.user.id,
          },
        },
        create: {
          eventId: event.id,
          userId: session.user.id,
          lastActive: new Date(),
        },
        update: {
          lastActive: new Date(),
        },
      })
    } else if (sessionId) {
      await prisma.eventParticipant.upsert({
        where: {
          eventId_sessionId: {
            eventId: event.id,
            sessionId: sessionId,
          },
        },
        create: {
          eventId: event.id,
          sessionId: sessionId,
          lastActive: new Date(),
        },
        update: {
          lastActive: new Date(),
        },
      })
    }

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventCode: event.eventCode,
        settings: event.settings,
      },
      message: 'Successfully joined event',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to join event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

