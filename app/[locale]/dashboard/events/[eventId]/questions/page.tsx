import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ManageQuestionsContent } from './manage-questions-content'

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ManageQuestionsPage({ params }: { params: { eventId: string } }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
  })

  if (!event) {
    redirect('/dashboard')
  }

  if (event.ownerId !== session.user.id) {
    redirect('/dashboard')
  }

  const questions = await prisma.question.findMany({
    where: {
      eventId: params.eventId,
      // Include archived questions in admin view
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          upvotes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc', // Latest first by default
    },
  })

  return (
    <ManageQuestionsContent
      event={{ id: event.id, title: event.title }}
      questions={questions}
      userName={session.user.name}
      userEmail={session.user.email}
      userId={session.user.id!}
    />
  )
}

