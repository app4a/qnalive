import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEventSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional().nullable(), // Allow null for empty descriptions
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  settings: z.object({
    allowAnonymous: z.boolean().optional(),
    moderationEnabled: z.boolean().optional(),
    showResultsImmediately: z.boolean().optional(),
    allowParticipantPolls: z.boolean().optional(),
  }).optional(),
})

// GET /api/events/[eventId] - Get event details
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
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

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[eventId] - Update event
export async function PUT(
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

    if (event.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    console.log('Received update event request:', JSON.stringify(body, null, 2))
    
    const validatedData = updateEventSchema.parse(body)
    console.log('Validated data:', JSON.stringify(validatedData, null, 2))

    // Check if moderation is being disabled
    const previousSettings = event.settings as { moderationEnabled?: boolean }
    const newSettings = validatedData.settings
    const moderationBeingDisabled = 
      previousSettings?.moderationEnabled === true && 
      newSettings?.moderationEnabled === false

    const updatedEvent = await prisma.event.update({
      where: { id: params.eventId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.startTime !== undefined && { 
          startTime: validatedData.startTime ? new Date(validatedData.startTime) : null 
        }),
        ...(validatedData.endTime !== undefined && { 
          endTime: validatedData.endTime ? new Date(validatedData.endTime) : null 
        }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.settings && { 
          settings: { ...event.settings as object, ...validatedData.settings } 
        }),
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

    // If moderation was just disabled, auto-approve all pending questions
    let pendingQuestions: any[] = []
    if (moderationBeingDisabled) {
      console.log('Moderation disabled - auto-approving pending questions')
      
      // Find all pending questions for this event
      pendingQuestions = await prisma.question.findMany({
        where: {
          eventId: params.eventId,
          status: 'PENDING',
        },
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

      if (pendingQuestions.length > 0) {
        // Auto-approve all pending questions
        await prisma.question.updateMany({
          where: {
            eventId: params.eventId,
            status: 'PENDING',
          },
          data: {
            status: 'APPROVED',
          },
        })

        console.log(`Auto-approved ${pendingQuestions.length} pending questions`)

        // Emit Socket.io events for newly approved questions
        try {
          const { getIO } = await import('@/lib/socket')
          const io = getIO()
          if (io) {
            // Update the questions to have APPROVED status for the event
            const approvedQuestions = pendingQuestions.map(q => ({
              ...q,
              status: 'APPROVED' as const,
            }))
            
            // Broadcast each newly approved question to everyone
            approvedQuestions.forEach(question => {
              io.to(params.eventId).emit('question:new', { question })
            })
          }
        } catch (error) {
          console.error('Failed to emit socket events for auto-approved questions:', error)
        }
      }
    }

    // Emit Socket.io event for event settings updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        console.log(`Emitting event:updated for event ${params.eventId}`)
        io.to(params.eventId).emit('event:updated', { 
          event: updatedEvent 
        })
      }
    } catch (error) {
      console.error('Failed to emit event:updated socket event:', error)
    }

    // Return updated event with info about auto-approved questions
    const response: any = { ...updatedEvent }
    if (moderationBeingDisabled && pendingQuestions && pendingQuestions.length > 0) {
      response.autoApprovedCount = pendingQuestions.length
    }
    
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2))
      
      // Format errors for better readability
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? `received ${(err as any).received}` : undefined
      }))
      
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors,
          message: formattedErrors.map(e => 
            `${e.field}: ${e.message}${e.received ? ` (${e.received})` : ''}`
          ).join('; ')
        },
        { status: 400 }
      )
    }

    console.error('Failed to update event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[eventId] - Delete event
export async function DELETE(
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

    if (event.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.event.delete({
      where: { id: params.eventId },
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

