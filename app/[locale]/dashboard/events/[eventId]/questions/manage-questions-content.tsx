'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { QuestionsList } from '@/components/events/questions-list'
import { UserMenu } from '@/components/layout/user-menu'
import { useTranslations } from 'next-intl'

interface Question {
  id: string
  content: string
  authorName: string | null
  upvotesCount: number
  isAnswered: boolean
  isArchived: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string | Date
  author?: {
    id: string
    name: string | null
    image: string | null
  } | null
  _count: {
    upvotes: number
  }
}

interface ManageQuestionsContentProps {
  event: {
    id: string
    title: string
  }
  questions: Question[]
  userName: string | null | undefined
  userEmail: string | null | undefined
  userId: string
}

export function ManageQuestionsContent({ 
  event, 
  questions, 
  userName, 
  userEmail,
  userId 
}: ManageQuestionsContentProps) {
  const t = useTranslations('events.questions')
  const tCommon = useTranslations('common')
  const tDashboard = useTranslations('landing.header')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/events/${event.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {tCommon('back')}
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-sm text-gray-600">{event.title}</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <UserMenu userName={userName} userEmail={userEmail} />
              <Link href="/dashboard">
                <Button>{tDashboard('dashboard')}</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <QuestionsList 
              questions={questions}
              eventId={event.id}
              userId={userId}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

