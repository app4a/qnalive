import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BarChart3, Plus } from 'lucide-react'
import { PollsList } from '@/components/events/polls-list'
import { CreatePollDialog } from '@/components/events/create-poll-dialog'
import { UserMenu } from '@/components/layout/user-menu'

export default async function ManagePollsPage({ params }: { params: { eventId: string } }) {
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

  const polls = await prisma.poll.findMany({
    where: {
      eventId: params.eventId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      options: {
        orderBy: { displayOrder: 'asc' },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
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
                <h1 className="text-2xl font-bold">Manage Polls</h1>
                <p className="text-sm text-gray-600">{event.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <UserMenu userName={session.user.name} userEmail={session.user.email} />
              <CreatePollDialog eventId={params.eventId} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Polls ({polls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PollsList 
              polls={polls}
              eventId={params.eventId}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

