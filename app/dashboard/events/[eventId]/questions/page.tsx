import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { QuestionsList } from '@/components/events/questions-list'
import { UserMenu } from '@/components/layout/user-menu'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/events/${params.eventId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Event
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Manage Questions</h1>
                <p className="text-sm text-gray-600">{event.title}</p>
              </div>
            </div>
            <UserMenu userName={session.user.name} userEmail={session.user.email} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <QuestionsList 
              questions={questions}
              eventId={params.eventId}
              userId={session.user.id}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

