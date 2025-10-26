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
import { ArrowUp, Check, X, Archive, Trash2, CheckCircle, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSocket } from '@/lib/socket-client'
import type { Socket } from 'socket.io-client'

interface Question {
  id: string
  content: string
  authorName: string
  upvotesCount: number
  isAnswered: boolean
  isArchived: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Set up Socket.io for real-time updates
  useEffect(() => {
    const socketInstance = getSocket()
    setSocket(socketInstance)

    // Join event room with userId if available (for admins)
    socketInstance.emit('event:join', { eventId, userId, sessionId: 'admin' })

    // Listen for question events
    const handleQuestionNew = (data: any) => {
      setQuestions(prev => {
        const existingIndex = prev.findIndex(q => q.id === data.question.id)
        if (existingIndex !== -1) {
          // Update existing question (e.g., status changed from PENDING to APPROVED)
          const updated = [...prev]
          updated[existingIndex] = data.question
          return updated
        }
        // Add new question
        return [data.question, ...prev]
      })
    }

    const handleQuestionUpdated = (data: any) => {
      setQuestions(prev => prev.map(q =>
        q.id === data.question.id ? data.question : q
      ))
    }

    const handleQuestionDeleted = (data: any) => {
      setQuestions(prev => prev.filter(q => q.id !== data.questionId))
    }

    const handleQuestionUpvoted = (data: any) => {
      setQuestions(prev => prev.map(q =>
        q.id === data.questionId ? { ...q, upvotesCount: data.upvotesCount } : q
      ))
    }

    socketInstance.on('question:new', handleQuestionNew)
    socketInstance.on('question:updated', handleQuestionUpdated)
    socketInstance.on('question:deleted', handleQuestionDeleted)
    socketInstance.on('question:upvoted', handleQuestionUpvoted)

    return () => {
      socketInstance.off('question:new', handleQuestionNew)
      socketInstance.off('question:updated', handleQuestionUpdated)
      socketInstance.off('question:deleted', handleQuestionDeleted)
      socketInstance.off('question:upvoted', handleQuestionUpvoted)
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

      if (!response.ok) throw new Error('Failed to update question')

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
        title: 'Error',
        description: error.message || 'Failed to update question',
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

      if (!response.ok) throw new Error('Failed to update question')

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
        title: 'Error',
        description: error.message || 'Failed to update question',
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

      if (!response.ok) throw new Error('Failed to update question')

      // Update will happen via Socket.io
      toast({
        title: !isArchived ? 'Question archived' : 'Question unarchived',
        description: !isArchived ? 'Question has been archived' : 'Question has been restored',
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update question',
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

      if (!response.ok) throw new Error('Failed to delete question')

      setQuestions(prev => prev.filter(q => q.id !== questionToDelete))

      toast({
        title: 'Question deleted',
        description: 'Question has been permanently deleted',
      })

      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete question',
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
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return null
    }
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No questions yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className={`border rounded-lg p-4 ${
              question.isArchived ? 'bg-gray-50 border-gray-300 opacity-75' :
              question.isAnswered ? 'bg-green-50 border-green-200' : 'bg-white'
            }`}
          >
            <div className="flex gap-4">
              {/* Upvote Count */}
              <div className="flex flex-col items-center justify-start min-w-[60px]">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <ArrowUp className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-sm font-semibold mt-1">{question.upvotesCount}</span>
              </div>

              {/* Question Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-lg mb-2">{question.content}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>by {question.authorName}</span>
                      <span>•</span>
                      <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {question.isArchived && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                    {getStatusBadge(question.status)}
                    {question.isAnswered && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Answered
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {question.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleStatusChange(question.id, 'APPROVED')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleStatusChange(question.id, 'REJECTED')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {question.status === 'APPROVED' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleStatusChange(question.id, 'PENDING')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Unapprove
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAnswered(question.id, question.isAnswered)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {question.isAnswered ? 'Mark Unanswered' : 'Mark Answered'}
                      </Button>
                    </>
                  )}

                  {question.status === 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleStatusChange(question.id, 'APPROVED')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleArchive(question.id, question.isArchived)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    {question.isArchived ? 'Unarchive' : 'Archive'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => confirmDelete(question.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
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

