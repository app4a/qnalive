import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
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

  return (
    <DashboardContent
      userName={session.user.name}
      userEmail={session.user.email}
      events={events}
    />
  )
}

