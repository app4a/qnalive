'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, BarChart3, Users, ExternalLink, Settings } from 'lucide-react'
import { EventCodeCard } from '@/components/events/event-code-card'
import { DeleteEventButton } from '@/components/events/delete-event-button'
import { UserMenu } from '@/components/layout/user-menu'
import { useTranslations } from 'next-intl'

type EventDetailContentProps = {
  event: {
    id: string
    title: string
    description: string | null
    eventCode: string
    isActive: boolean
    _count: {
      questions: number
      polls: number
      participants: number
    }
  }
  userName: string | null | undefined
  userEmail: string | null | undefined
  participantUrl: string
}

export function EventDetailContent({ event, userName, userEmail, participantUrl }: EventDetailContentProps) {
  const t = useTranslations('events')
  const tc = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{tc('appName')}</span>
          </Link>
          <nav className="flex items-center space-x-4">
            <UserMenu userName={userName} userEmail={userEmail} />
            <Link href="/dashboard">
              <Button>{t('detail.dashboard')}</Button>
            </Link>
          </nav>
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
                {event.isActive ? tc('active') : tc('inactive')}
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
                {t('detail.stats.participants')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.participants}</div>
              <p className="text-xs text-gray-500 mt-1">{t('detail.stats.activeParticipants')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center text-gray-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('detail.stats.questions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.questions}</div>
              <p className="text-xs text-gray-500 mt-1">{t('detail.stats.questionsSubmitted')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center text-gray-600">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('detail.stats.polls')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{event._count.polls}</div>
              <p className="text-xs text-gray-500 mt-1">{t('detail.stats.pollsCreated')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                {t('detail.actions.questions.title')}
              </CardTitle>
              <CardDescription>
                {t('detail.actions.questions.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/questions`}>
                <Button className="w-full">
                  {t('detail.actions.questions.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                {t('detail.actions.polls.title')}
              </CardTitle>
              <CardDescription>
                {t('detail.actions.polls.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/polls`}>
                <Button className="w-full">
                  {t('detail.actions.polls.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                {t('detail.actions.settings.title')}
              </CardTitle>
              <CardDescription>
                {t('detail.actions.settings.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/events/${event.id}/settings`}>
                <Button className="w-full" variant="outline">
                  {t('detail.actions.settings.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                {t('detail.actions.participantView.title')}
              </CardTitle>
              <CardDescription>
                {t('detail.actions.participantView.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/e/${event.eventCode}`} target="_blank">
                <Button className="w-full" variant="outline">
                  {t('detail.actions.participantView.button')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('detail.instructions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('detail.instructions.step1.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('detail.instructions.step1.description')} <span className="font-mono font-bold">{event.eventCode}</span> {t('detail.instructions.step1.or')} <span className="font-mono text-xs">{participantUrl}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('detail.instructions.step2.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('detail.instructions.step2.description')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('detail.instructions.step3.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('detail.instructions.step3.description')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('detail.instructions.step4.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('detail.instructions.step4.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

