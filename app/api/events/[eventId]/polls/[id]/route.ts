import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/events/[eventId]/polls/[id] - Get poll details
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string; id: string } }
) {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
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

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Failed to fetch poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[eventId]/polls/[id] - Update poll
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

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Only event owner or poll creator can update
    if (event.ownerId !== session.user.id && poll.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()

    const updatedPoll = await prisma.poll.update({
      where: { id: params.id },
      data: body,
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
        console.log(`Emitting poll:updated event for poll ${params.id} to event room ${params.eventId}`)
        io.to(params.eventId).emit('poll:updated', { poll: updatedPoll })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json(updatedPoll)
  } catch (error) {
    console.error('Failed to update poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[eventId]/polls/[id] - Delete poll
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

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
    })

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Only event owner or poll creator can delete
    if (event.ownerId !== session.user.id && poll.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.poll.delete({
      where: { id: params.id },
    })

    // Emit Socket.io event for real-time updates
    try {
      const { getIO } = await import('@/lib/socket')
      const io = getIO()
      if (io) {
        console.log(`Emitting poll:deleted event for poll ${params.id} to event room ${params.eventId}`)
        io.to(params.eventId).emit('poll:deleted', { pollId: params.id })
      }
    } catch (error) {
      console.error('Failed to emit socket event:', error)
    }

    return NextResponse.json({ message: 'Poll deleted successfully' })
  } catch (error) {
    console.error('Failed to delete poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

