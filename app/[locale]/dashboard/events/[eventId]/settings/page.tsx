import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Settings } from 'lucide-react'
import { EventSettingsForm } from '@/components/events/event-settings-form'
import { UserMenu } from '@/components/layout/user-menu'
import { getTranslations } from 'next-intl/server'

export default async function EventSettingsPage({ params }: { params: { locale: string; eventId: string } }) {
  const session = await auth()
  const t = await getTranslations({ locale: params.locale, namespace: 'events.settings' })
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
                  {tc('back')}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-sm text-gray-600">{event.title}</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <UserMenu userName={session.user.name} userEmail={session.user.email} />
              <Link href="/dashboard">
                <Button>{td('title')}</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {t('cardTitle')}
            </CardTitle>
            <CardDescription>
              {t('cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventSettingsForm event={event} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

