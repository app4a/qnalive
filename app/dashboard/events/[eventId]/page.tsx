import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, BarChart3, Users, ExternalLink, Settings } from 'lucide-react'
import { EventCodeCard } from '@/components/events/event-code-card'
import { DeleteEventButton } from '@/components/events/delete-event-button'
import { UserMenu } from '@/components/layout/user-menu'

export default async function EventAdminPage({ params }: { params: { eventId: string } }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (event.ownerId !== session.user.id) {
    redirect('/dashboard')
  }

  const participantUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${event.eventCode}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QnALive</span>
          </Link>
          <UserMenu userName={session.user.name} userEmail={session.user.email} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Event Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              {event.description && (
                <p className="text-gray-600">{event.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {event.isActive ? 'Active' : 'Inactive'}
              </span>
              <DeleteEventButton eventId={event.id} eventTitle={event.title} />
            </div>
          </div>

          {/* Event Code Card */}
          <EventCodeCard 
            eventCode={event.eventCode}
            participantUrl={participantUrl}
          />
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.participants}</div>
              <p className="text-xs text-gray-500 mt-1">Active participants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center text-gray-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.questions}</div>
              <p className="text-xs text-gray-500 mt-1">Questions submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center text-gray-600">
                <BarChart3 className="h-4 w-4 mr-2" />
                Polls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.polls}</div>
              <p className="text-xs text-gray-500 mt-1">Polls created</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Questions
              </CardTitle>
              <CardDescription>
                View and moderate questions from participants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/questions`}>
                <Button className="w-full">
                  Manage Questions
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Polls
              </CardTitle>
              <CardDescription>
                Create and manage live polls for your event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/polls`}>
                <Button className="w-full">
                  Manage Polls
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure event settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/settings`}>
                <Button className="w-full" variant="outline">
                  Event Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                Participant View
              </CardTitle>
              <CardDescription>
                See what participants see during the event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/e/${event.eventCode}`} target="_blank">
                <Button className="w-full" variant="outline">
                  Open Participant View
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Run Your Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Share the Event Code</h3>
                <p className="text-sm text-gray-600">
                  Give participants the code <span className="font-mono font-bold">{event.eventCode}</span> or 
                  share the link: <span className="font-mono text-xs">{participantUrl}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Monitor Participation</h3>
                <p className="text-sm text-gray-600">
                  Watch as participants join and submit questions. You can moderate questions if enabled.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Create Polls</h3>
                <p className="text-sm text-gray-600">
                  Launch live polls to gather instant feedback from your audience.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">View Participant Screen</h3>
                <p className="text-sm text-gray-600">
                  Open the participant view in another window to see what your audience sees in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

