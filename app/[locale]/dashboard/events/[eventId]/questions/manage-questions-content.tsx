'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { QuestionsList } from '@/components/events/questions-list'
import { AppHeader } from '@/components/layout/app-header'
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
      <AppHeader 
        session={{ user: { name: userName, email: userEmail } }}
        leftContent={
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href={`/dashboard/events/${event.id}`} className="flex-shrink-0">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <h1 className="text-sm md:text-lg font-bold truncate">{t('title')}</h1>
              </div>
              <p className="text-xs text-gray-600 truncate hidden sm:block">{event.title}</p>
            </div>
          </div>
        }
        rightContent={
          <>
            <UserMenu userName={userName} userEmail={userEmail} />
            <Link href="/dashboard">
              <Button size="sm">
                <span className="hidden sm:inline">{tDashboard('dashboard')}</span>
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

