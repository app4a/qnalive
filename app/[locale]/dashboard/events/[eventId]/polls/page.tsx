import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BarChart3, Plus } from 'lucide-react'
import { PollsList } from '@/components/events/polls-list'
import { CreatePollDialog } from '@/components/events/create-poll-dialog'
import { AppHeader } from '@/components/layout/app-header'
import { UserMenu } from '@/components/layout/user-menu'
import { getTranslations } from 'next-intl/server'

export default async function ManagePollsPage({ params }: { params: { locale: string; eventId: string } }) {
  const session = await auth()
  const t = await getTranslations({ locale: params.locale, namespace: 'events.polls' })
  const td = await getTranslations({ locale: params.locale, namespace: 'dashboard' })
  const tc = await getTranslations({ locale: params.locale, namespace: 'common' })

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
      <AppHeader 
        session={session}
        leftContent={
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href={`/dashboard/events/${params.eventId}`} className="flex-shrink-0">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <h1 className="text-sm md:text-lg font-bold truncate">{t('title')}</h1>
              </div>
              <p className="text-xs text-gray-600 truncate hidden sm:block">{event.title}</p>
            </div>
          </div>
        }
        rightContent={
          <>
            <UserMenu userName={session.user.name} userEmail={session.user.email} />
            <Link href="/dashboard">
              <Button size="sm">
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>
            </Link>
          </>
        }
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold flex items-center">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                {t('title')} ({polls.length})
              </h2>
              <CreatePollDialog eventId={params.eventId} />
            </div>
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

