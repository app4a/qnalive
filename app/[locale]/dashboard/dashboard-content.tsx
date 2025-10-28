'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Plus, Users, BarChart3 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { UserMenu } from '@/components/layout/user-menu'
import { useTranslations, useLocale } from 'next-intl'

interface Event {
  id: string
  title: string
  description: string | null
  eventCode: string
  isActive: boolean
  createdAt: Date
  _count: {
    questions: number
    polls: number
    participants: number
  }
}

interface DashboardContentProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  events: Event[]
}

export function DashboardContent({ userName, userEmail, events }: DashboardContentProps) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{tCommon('appName')}</span>
          </Link>
          <div className="flex items-center gap-4">
            <UserMenu userName={userName} userEmail={userEmail} />
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('newEvent')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">{t('noEvents.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('noEvents.description')}
              </p>
              <Link href="/dashboard/events/new">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  {t('noEvents.button')}
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
                          {t('eventCard.code')}: <span className="font-mono font-bold">{event.eventCode}</span>
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.isActive ? tCommon('active') : tCommon('inactive')}
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
                        <div className="text-xs text-gray-500">{t('eventCard.participants')}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold">{event._count.questions}</div>
                        <div className="text-xs text-gray-500">{t('eventCard.questions')}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold">{event._count.polls}</div>
                        <div className="text-xs text-gray-500">{t('eventCard.polls')}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      {t('eventCard.created')} {formatRelativeTime(event.createdAt, locale)}
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

