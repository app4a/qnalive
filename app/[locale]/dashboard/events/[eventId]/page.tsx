import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EventDetailContent } from './event-detail-content'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EventAdminPage({ params }: { params: { locale: string; eventId: string } }) {
  const session = await auth()
  const t = await getTranslations({ locale: params.locale, namespace: 'events' })

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
            <CardTitle>{t('detail.notFound.title')}</CardTitle>
            <CardDescription>
              {t('detail.notFound.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>{t('detail.notFound.backButton')}</Button>
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
    <EventDetailContent 
      event={event}
      userName={session.user.name}
      userEmail={session.user.email}
      participantUrl={participantUrl}
    />
  )
}

