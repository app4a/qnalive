'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowUp, Check, X, Archive, Trash2, CheckCircle, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSocket } from '@/lib/socket-client'
import { formatDateTime } from '@/lib/date-utils'
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
}

interface QuestionsListProps {
  questions: Question[]
  eventId: string
  userId?: string
}

export function QuestionsList({ questions: initialQuestions, eventId, userId }: QuestionsListProps) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'latest' | 'votes'>('latest')
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('events.questions')
  const tc = useTranslations('common')
  const tCommon = useTranslations('common')

  // Force refresh server data on mount and when navigating back
  useEffect(() => {
    router.refresh()
  }, [router])

  // Sync local state when server data changes (e.g., navigation back to page)
  useEffect(() => {
    setQuestions(initialQuestions)
  }, [initialQuestions])

  // Set up Socket.io for real-time updates
  useEffect(() => {
    const socketInstance = getSocket()

    console.log('[Admin] Setting up socket connection for event:', eventId)

    // Join event room with userId if available (for admins)
    socketInstance.emit('event:join', { eventId, userId, sessionId: 'admin' })

    // Listen for question events
    const handleQuestionNew = (data: any) => {
      console.log('[Admin] Received question:new event:', data.question.id)
      setQuestions(prev => {
        const existingIndex = prev.findIndex(q => q.id === data.question.id)
        if (existingIndex !== -1) {
          // Update existing question (e.g., status changed from PENDING to APPROVED)
          const updated = [...prev]
          updated[existingIndex] = data.question
          return updated
        }
        // Add new question with proper sorting
        const newQuestions = [data.question, ...prev].sort((a, b) => {
          if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
          return b.upvotesCount - a.upvotesCount
        })
        return newQuestions
      })
    }

    const handleQuestionUpdated = (data: any) => {
      console.log('[Admin] Received question:updated event:', data.question.id)
      setQuestions(prev => prev.map(q =>
        q.id === data.question.id ? data.question : q
      ).sort((a, b) => {
        if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
        return b.upvotesCount - a.upvotesCount
      }))
    }

    const handleQuestionDeleted = (data: any) => {
      console.log('[Admin] Received question:deleted event:', data.questionId)
      setQuestions(prev => prev.filter(q => q.id !== data.questionId))
    }

    const handleQuestionUpvoted = (data: any) => {
      console.log('[Admin] Received question:upvoted event:', data.questionId)
      setQuestions(prev => prev.map(q =>
        q.id === data.questionId ? { ...q, upvotesCount: data.upvotesCount } : q
      ).sort((a, b) => {
        if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
        return b.upvotesCount - a.upvotesCount
      }))
    }

    socketInstance.on('question:new', handleQuestionNew)
    socketInstance.on('question:updated', handleQuestionUpdated)
    socketInstance.on('question:deleted', handleQuestionDeleted)
    socketInstance.on('question:upvoted', handleQuestionUpvoted)

    return () => {
      // Remove all listeners without passing handler reference
      socketInstance.off('question:new')
      socketInstance.off('question:updated')
      socketInstance.off('question:deleted')
      socketInstance.off('question:upvoted')
      socketInstance.emit('event:leave', { eventId })
    }
  }, [eventId, userId])

  const handleStatusChange = async (questionId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/events/${eventId}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error(tCommon('errors.failedToUpdateQuestion'))

      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, status } : q))
      )

      toast({
        title: 'Question updated',
        description: `Question ${status.toLowerCase()} successfully`,
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error.message || tCommon('errors.failedToUpdateQuestion'),
      })
    }
  }

  const handleToggleAnswered = async (questionId: string, isAnswered: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnswered: !isAnswered }),
      })

      if (!response.ok) throw new Error(tCommon('errors.failedToUpdateQuestion'))

      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, isAnswered: !isAnswered } : q))
      )

      toast({
        title: 'Question updated',
        description: `Marked as ${!isAnswered ? 'answered' : 'unanswered'}`,
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error.message,
      })
    }
  }

  const handleToggleArchive = async (questionId: string, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !isArchived }),
      })

      if (!response.ok) throw new Error(tCommon('errors.failedToUpdateQuestion'))

      // Update will happen via Socket.io
      toast({
        title: tCommon('success'),
        description: !isArchived ? t('archived') : t('unarchived'),
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error.message,
      })
    }
  }

  const confirmDelete = (questionId: string) => {
    setQuestionToDelete(questionId)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!questionToDelete) return

    setDeletingId(questionToDelete)
    try {
      const response = await fetch(`/api/events/${eventId}/questions/${questionToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error(tCommon('errors.failedToDeleteQuestion'))

      setQuestions(prev => prev.filter(q => q.id !== questionToDelete))

      toast({
        title: tCommon('success'),
        description: t('deleted'),
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error.message,
      })
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setQuestionToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{tCommon('pending')}</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tCommon('approved')}</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{tCommon('rejected')}</Badge>
      default:
        return null
    }
  }

  // Sort questions based on selected sort option
  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else {
      // Sort by votes
      if (b.upvotesCount !== a.upvotesCount) {
        return b.upvotesCount - a.upvotesCount
      }
      // If votes are equal, sort by latest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noQuestions')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-semibold flex items-center">
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5 mr-2" />
          {t('questionsCount', { count: questions.length })}
        </h2>
        <Select value={sortBy} onValueChange={(value: 'latest' | 'votes') => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{t('sortLatest')}</span>
              </div>
            </SelectItem>
            <SelectItem value="votes">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>{t('sortVotes')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 md:space-y-4">
        {sortedQuestions.map((question) => (
          <div
            key={question.id}
            className={`border rounded-lg p-3 md:p-4 ${
              question.isArchived ? 'bg-gray-50 border-gray-300 opacity-75' :
              question.isAnswered ? 'bg-green-50 border-green-200' : 'bg-white'
            }`}
          >
            <div className="flex gap-2 md:gap-4">
              {/* Upvote Count */}
              <div className="flex flex-col items-center justify-start min-w-[50px] md:min-w-[60px] flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100">
                  <ArrowUp className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                </div>
                <span className="text-xs md:text-sm font-semibold mt-1">{question.upvotesCount}</span>
              </div>

              {/* Question Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-lg mb-2 break-words">{question.content}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm text-gray-600">
                      <span className="truncate">{t('by')} {question.authorName}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-xs">{formatDateTime(question.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Badges - top right on large screens, below text on mobile */}
                  <div className="hidden md:flex flex-wrap items-center gap-1.5 flex-shrink-0">
                    {question.isArchived && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                        <Archive className="h-3 w-3 mr-1" />
                        {t('actions.archived')}
                      </Badge>
                    )}
                    {getStatusBadge(question.status)}
                    {question.isAnswered && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {tc('answered')}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Badges for mobile - below content */}
                <div className="flex md:hidden flex-wrap items-center gap-1.5 mb-3">
                  {question.isArchived && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                      <Archive className="h-3 w-3 mr-1" />
                      {t('actions.archived')}
                    </Badge>
                  )}
                  {getStatusBadge(question.status)}
                  {question.isAnswered && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {tc('answered')}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {question.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50 text-xs md:text-sm h-8 md:px-3 px-2"
                        onClick={() => handleStatusChange(question.id, 'APPROVED')}
                      >
                        <Check className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                        <span className="hidden md:inline ml-1">{t('actions.approve')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50 text-xs md:text-sm h-8 md:px-3 px-2"
                        onClick={() => handleStatusChange(question.id, 'REJECTED')}
                      >
                        <X className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                        <span className="hidden md:inline ml-1">{t('actions.reject')}</span>
                      </Button>
                    </>
                  )}

                  {question.status === 'APPROVED' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 text-xs md:text-sm h-8 md:px-3 px-2"
                        onClick={() => handleStatusChange(question.id, 'PENDING')}
                      >
                        <X className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                        <span className="hidden md:inline ml-1">{t('actions.unapprove')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs md:text-sm h-8 md:px-3 px-2"
                        onClick={() => handleToggleAnswered(question.id, question.isAnswered)}
                      >
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                        <span className="hidden md:inline ml-1">{question.isAnswered ? t('actions.markUnanswered') : t('actions.markAnswered')}</span>
                      </Button>
                    </>
                  )}

                  {question.status === 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50 text-xs md:text-sm h-8 md:px-3 px-2"
                      onClick={() => handleStatusChange(question.id, 'APPROVED')}
                    >
                      <Check className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                      <span className="hidden md:inline ml-1">{t('actions.approve')}</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs md:text-sm h-8 md:px-3 px-2"
                    onClick={() => handleToggleArchive(question.id, question.isArchived)}
                  >
                    <Archive className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden md:inline ml-1">{question.isArchived ? t('actions.unarchive') : t('actions.archive')}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 text-xs md:text-sm h-8 md:px-3 px-2"
                    onClick={() => confirmDelete(question.id)}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden md:inline ml-1">{tc('delete')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question and all its upvotes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

