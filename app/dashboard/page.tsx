import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Plus, Users, BarChart3, User } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QnALive</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {session.user.name || session.user.email}
              </span>
            </div>
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Events</h1>
          <p className="text-gray-600">
            Manage your interactive events and view analytics
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No events yet</h2>
              <p className="text-gray-600 mb-6">
                Create your first event to start engaging with your audience
              </p>
              <Link href="/dashboard/events/new">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Code: <span className="font-mono font-bold">{event.eventCode}</span>
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {event.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold">{event._count.participants}</div>
                        <div className="text-xs text-gray-500">Participants</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold">{event._count.questions}</div>
                        <div className="text-xs text-gray-500">Questions</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold">{event._count.polls}</div>
                        <div className="text-xs text-gray-500">Polls</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Created {formatRelativeTime(event.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

