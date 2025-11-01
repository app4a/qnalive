import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/events/[eventId]/participants - Debug endpoint to see all participants
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params
  try {
    const participants = await prisma.eventParticipant.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    const count = await prisma.eventParticipant.count({
      where: { eventId },
    })

    return NextResponse.json({ count, participants })
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

