"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getSocket } from '@/lib/socket-client'
import { getSessionId } from '@/lib/utils'
import { formatDateTime } from '@/lib/date-utils'
import { ArrowUp, MessageSquare, Users, BarChart3, Send, Trash2, LogIn, Clock, TrendingUp } from 'lucide-react'
import type { Socket } from 'socket.io-client'
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
import { UserMenu } from '@/components/layout/user-menu'
import { ParticipantCreatePollDialog } from '@/components/events/participant-create-poll-dialog'

interface Question {
  id: string
  content: string
  authorName: string
  upvotesCount: number
  isAnswered: boolean
  isArchived: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  authorId?: string | null
  sessionId?: string | null
  upvotes?: any[]
}

interface Poll {
  id: string
  title: string
  type: string
  isActive: boolean
  createdAt: string
  options: PollOption[]
  userVote?: string | null
  createdBy?: {
    id: string
    name: string | null
    image: string | null
  }
}

interface PollOption {
  id: string
  optionText: string
  votesCount: number
}

export default function ParticipantViewPage() {
  const params = useParams()
  const code = params.code as string
  const [event, setEvent] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [userVotes, setUserVotes] = useState<Map<string, string>>(new Map()) // pollId -> optionId
  const [participantCount, setParticipantCount] = useState(0)
  const [newQuestion, setNewQuestion] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [upvotedQuestions, setUpvotedQuestions] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)
  const [createPollDialogOpen, setCreatePollDialogOpen] = useState(false)
  const [questionSortBy, setQuestionSortBy] = useState<'latest' | 'votes'>('latest')
  const [pollSortBy, setPollSortBy] = useState<'latest' | 'votes'>('latest')
  const { toast } = useToast()

  useEffect(() => {
    let socketInstance: Socket | null = null

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/code/${code}`)
        if (!response.ok) throw new Error('Event not found')
        const data = await response.json()
        setEvent(data)
        
        // Join event
        const sessionId = getSessionId()
        await fetch('/api/events/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventCode: code.toUpperCase(), sessionId }),
        })

        // Fetch questions sorted by most recent first
        // Include sessionId so anonymous users can see their own pending questions
        const questionsRes = await fetch(`/api/events/${data.id}/questions?sortBy=recent&sessionId=${sessionId}`)
        const questionsData = await questionsRes.json()
        setQuestions(questionsData)

        // Fetch polls (include sessionId to get user's votes)
        // Don't filter activeOnly - we'll filter on client to show creator's pending polls
        const pollsRes = await fetch(`/api/events/${data.id}/polls?sessionId=${sessionId}`)
        const pollsData = await pollsRes.json()
        
        // Filter polls: show active polls to everyone, show inactive polls to their creators
        const filteredPolls = pollsData.filter((poll: any) => {
          if (poll.isActive) return true // Show all active polls
          // Show inactive polls only if current user is the creator
          return poll.createdBy?.id === userIdForSocket
        })
        setPolls(filteredPolls)
        
        // Initialize userVotes from the fetched data
        const votes = new Map<string, string>()
        pollsData.forEach((poll: any) => {
          if (poll.userVote) {
            votes.set(poll.id, poll.userVote)
          }
        })
        setUserVotes(votes)

        // Set up WebSocket
        socketInstance = getSocket()
        setSocket(socketInstance)
        
        // Get user ID if authenticated, otherwise use session ID
        const sessionIdForSocket = getSessionId()
        let userIdForSocket: string | null = null
        try {
          const sessionResponse = await fetch('/api/auth/session')
          const sessionData = await sessionResponse.json()
          userIdForSocket = sessionData?.user?.id || null
          setCurrentUserId(userIdForSocket)
          setCurrentUserName(sessionData?.user?.name || null)
          setCurrentUserEmail(sessionData?.user?.email || null)
        } catch {
          // Not authenticated, use session ID only
        }
        
        // Track which questions are upvoted by checking if the current user/session upvoted
        const upvoted = new Set<string>()
        questionsData.forEach((q: Question) => {
          // Check if user has upvoted this question
          if (q.upvotes && q.upvotes.length > 0) {
            const hasUpvoted = q.upvotes.some((upvote: any) => {
              if (userIdForSocket) {
                return upvote.userId === userIdForSocket
              } else {
                return upvote.sessionId === sessionIdForSocket
              }
            })
            if (hasUpvoted) {
              upvoted.add(q.id)
            }
          }
        })
        setUpvotedQuestions(upvoted)
        
        socketInstance.emit('event:join', { 
          eventId: data.id, 
          sessionId: sessionIdForSocket,
          userId: userIdForSocket 
        })

        // Listen for real-time updates
        const handleQuestionNew = (data: any) => {
          console.log('[Participant] Received question:new event:', data.question.id, 'status:', data.question.status)
          
          setQuestions(prev => {
            // Check if question already exists
            const existingIndex = prev.findIndex(q => q.id === data.question.id)
            if (existingIndex !== -1) {
              // Update existing question (e.g., status changed from PENDING to APPROVED)
              const updated = [...prev]
              updated[existingIndex] = data.question
              return updated
            }
            
            // Filter: Only add questions that should be visible to this participant
            // 1. Show APPROVED questions from everyone
            // 2. Show own questions (any status)
            const isOwnQuestion = userIdForSocket 
              ? data.question.authorId === userIdForSocket
              : data.question.sessionId === sessionIdForSocket
            
            if (data.question.status === 'APPROVED' || isOwnQuestion) {
              // Add new question
              return [data.question, ...prev]
            }
            
            // Ignore PENDING/REJECTED questions from other users
            console.log('[Participant] Ignoring question (not visible to this user)')
            return prev
          })
        }

        const handleQuestionUpvoted = (data: any) => {
          setQuestions(prev => prev.map(q => 
            q.id === data.questionId ? { ...q, upvotesCount: data.upvotesCount } : q
          ))
        }

        const handleQuestionUpdated = (data: any) => {
          console.log('[Participant] Received question:updated event:', data.question.id, 'status:', data.question.status)
          
          setQuestions(prev => {
            const exists = prev.some(q => q.id === data.question.id)
            const isOwnQuestion = userIdForSocket 
              ? data.question.authorId === userIdForSocket
              : data.question.sessionId === sessionIdForSocket
            
            if (exists) {
              // Update existing question only if it should still be visible
              if (data.question.status === 'APPROVED' || isOwnQuestion) {
                return prev.map(q => q.id === data.question.id ? data.question : q)
              } else {
                // Question became REJECTED/PENDING and user is not the author - remove it
                console.log('[Participant] Removing question (no longer visible)')
                return prev.filter(q => q.id !== data.question.id)
              }
            } else if (data.question.status === 'APPROVED' || isOwnQuestion) {
              // Add newly approved question or newly visible own question
              return [data.question, ...prev]
            }
            return prev
          })
        }

        const handleQuestionDeleted = (data: any) => {
          setQuestions(prev => prev.filter(q => q.id !== data.questionId))
        }

        const handlePollNew = (data: any) => {
          console.log('[Participant] Received poll:new event:', data.poll.id, 'isActive:', data.poll.isActive, 'createdBy:', data.poll.createdBy?.id)
          setPolls(prev => {
            // Check if poll already exists to prevent duplicates
            if (prev.some(p => p.id === data.poll.id)) {
              console.log('[Participant] Poll already exists, ignoring')
              return prev
            }
            
            // Show active polls to everyone
            if (data.poll.isActive) {
              console.log('[Participant] Adding active poll')
              return [data.poll, ...prev]
            }
            
            // Show inactive polls to their creators
            const isCreator = data.poll.createdBy?.id === userIdForSocket
            if (isCreator) {
              console.log('[Participant] Adding inactive poll (user is creator)')
              return [data.poll, ...prev]
            }
            
            console.log('[Participant] Poll is inactive and user is not creator, not adding')
            return prev
          })
        }

        const handlePollUpdated = (data: any) => {
          console.log('[Participant] Received poll:updated event:', data.poll.id, 'isActive:', data.poll.isActive, 'createdBy:', data.poll.createdBy?.id)
          setPolls(prev => {
            const exists = prev.some(p => p.id === data.poll.id)
            const isCreator = data.poll.createdBy?.id === userIdForSocket
            
            // If poll became inactive
            if (!data.poll.isActive) {
              // Keep it if user is the creator, otherwise remove it
              if (isCreator) {
                console.log('[Participant] Poll became inactive but user is creator, keeping it')
                return prev.map(p => p.id === data.poll.id ? data.poll : p)
              } else {
                console.log('[Participant] Poll became inactive, removing from view')
                return prev.filter(p => p.id !== data.poll.id)
              }
            }
            
            // Poll is active
            if (exists) {
              console.log('[Participant] Updating existing poll')
              return prev.map(p => p.id === data.poll.id ? data.poll : p)
            } else {
              console.log('[Participant] Poll became active, adding to view')
              return [data.poll, ...prev]
            }
          })
        }

        const handlePollDeleted = (data: any) => {
          console.log('[Participant] Received poll:deleted event:', data.pollId)
          setPolls(prev => prev.filter(p => p.id !== data.pollId))
        }

        const handlePollVoted = (data: any) => {
          setPolls(prev => prev.map(p => {
            if (p.id === data.pollId) {
              return {
                ...p,
                options: p.options.map(o =>
                  o.id === data.optionId ? { ...o, votesCount: data.votesCount } : o
                )
              }
            }
            return p
          }))
        }

        const handleParticipants = (data: any) => {
          setParticipantCount(data.count)
        }

        const handleEventUpdated = (data: any) => {
          console.log('[Participant] Received event:updated event')
          setEvent(data.event)
        }

        socketInstance.on('question:new', handleQuestionNew)
        socketInstance.on('question:upvoted', handleQuestionUpvoted)
        socketInstance.on('question:updated', handleQuestionUpdated)
        socketInstance.on('question:deleted', handleQuestionDeleted)
        socketInstance.on('poll:new', handlePollNew)
        socketInstance.on('poll:updated', handlePollUpdated)
        socketInstance.on('poll:deleted', handlePollDeleted)
        socketInstance.on('poll:voted', handlePollVoted)
        socketInstance.on('event:participants', handleParticipants)
        socketInstance.on('event:updated', handleEventUpdated)

        setLoading(false)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load event',
        })
        setLoading(false)
      }
    }

    fetchEvent()

    return () => {
      if (socketInstance) {
        // Remove all event listeners before disconnecting
        socketInstance.off('question:new')
        socketInstance.off('question:upvoted')
        socketInstance.off('question:updated')
        socketInstance.off('question:deleted')
        socketInstance.off('poll:new')
        socketInstance.off('poll:updated')
        socketInstance.off('poll:deleted')
        socketInstance.off('poll:voted')
        socketInstance.off('event:participants')
        socketInstance.off('event:updated')
        socketInstance.disconnect()
      }
    }
  }, [code])

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/events/${event.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newQuestion,
          // Only send authorName if user is not logged in
          // If logged in, let the API use the session user's name
          authorName: currentUserId ? undefined : (authorName || undefined),
          sessionId: getSessionId(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit question')
      }

      const createdQuestion = await response.json()

      // Add question to local state immediately (optimistic update)
      setQuestions(prev => {
        // Check if already exists (from Socket.io)
        if (prev.some(q => q.id === createdQuestion.id)) {
          return prev
        }
        return [createdQuestion, ...prev]
      })

      setNewQuestion('')
      
      const isPending = createdQuestion.status === 'PENDING'
      toast({
        title: 'Success',
        description: isPending 
          ? 'Question submitted and pending review' 
          : 'Question submitted successfully',
      })
    } catch (error: any) {
      console.error('Failed to submit question:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit question',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (questionId: string) => {
    const isUpvoted = upvotedQuestions.has(questionId)
    const sessionId = getSessionId()

    try {
      if (isUpvoted) {
        // Remove upvote
        const response = await fetch(`/api/events/${event.id}/questions/${questionId}/upvote?sessionId=${sessionId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }

        // Update upvoted state only - count will update via Socket.io
        setUpvotedQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
      } else {
        // Add upvote
        const response = await fetch(`/api/events/${event.id}/questions/${questionId}/upvote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }

        // Update upvoted state only - count will update via Socket.io
        setUpvotedQuestions(prev => new Set([...prev, questionId]))
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to upvote',
      })
      
      // Revert upvoted state on error
      if (isUpvoted) {
        setUpvotedQuestions(prev => new Set([...prev, questionId]))
      } else {
        setUpvotedQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
      }
    }
  }

  const confirmDeleteQuestion = (questionId: string) => {
    setQuestionToDelete(questionId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return

    setDeletingId(questionToDelete)
    try {
      // Include sessionId for anonymous users
      const url = new URL(`/api/events/${event.id}/questions/${questionToDelete}`, window.location.origin)
      if (!currentUserId) {
        url.searchParams.set('sessionId', getSessionId())
      }
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete question')
      }

      toast({
        title: 'Question deleted',
        description: 'Your question has been deleted',
      })

      // Question will be removed via Socket.io event
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

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const currentVote = userVotes.get(pollId)
      
      // If clicking the same option, unvote
      if (currentVote === optionId) {
        const response = await fetch(
          `/api/events/${event.id}/polls/${pollId}/vote?optionId=${optionId}&sessionId=${getSessionId()}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }

        // Update local state
        setUserVotes(prev => {
          const newVotes = new Map(prev)
          newVotes.delete(pollId)
          return newVotes
        })

        toast({
          title: 'Vote removed',
          description: 'Your vote has been removed',
        })
      } else {
        // Vote for this option
        const response = await fetch(`/api/events/${event.id}/polls/${pollId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId, sessionId: getSessionId() }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error)
        }

        // Update local state
        setUserVotes(prev => {
          const newVotes = new Map(prev)
          newVotes.set(pollId, optionId)
          return newVotes
        })

        toast({
          title: 'Vote submitted',
          description: 'Your vote has been recorded',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to vote',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist or is no longer active.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{participantCount} participants</span>
              </div>
              {currentUserId ? (
                <UserMenu userName={currentUserName} userEmail={currentUserEmail} />
              ) : (
                <Button asChild variant="outline" size="sm">
                  <a href="/auth/signin">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </a>
                </Button>
              )}
            </div>
          </div>
          {event.description && (
            <p className="text-gray-600">{event.description}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Submit Question Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Ask a Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            {event?.settings?.allowAnonymous === false && !currentUserId ? (
              // Show login prompt when authentication is required
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  You must be signed in to ask questions at this event.
                </p>
                <Button asChild>
                  <a href="/auth/signin">
                    Sign In to Ask Questions
                  </a>
                </Button>
              </div>
            ) : (
              // Show question form
              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                {!currentUserId && (
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Your Name (Optional)</Label>
                    <Input
                      id="authorName"
                      type="text"
                      placeholder="Anonymous"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="question">Question *</Label>
                  <Textarea
                    id="question"
                    placeholder="Type your question here..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    required
                    minLength={10}
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Question'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Active Polls */}
        {(polls.length > 0 || event?.settings?.allowParticipantPolls) && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Active Polls
              </h2>
              <div className="flex items-center gap-2">
                <Select value={pollSortBy} onValueChange={(value: 'latest' | 'votes') => setPollSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Latest First</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="votes">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Most Voted</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {event?.settings?.allowParticipantPolls && currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatePollDialogOpen(true)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Poll
                  </Button>
                )}
              </div>
            </div>
            {(() => {
              // Sort polls based on selected sort option
              const sortedPolls = [...polls].sort((a, b) => {
                if (pollSortBy === 'latest') {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                } else {
                  // Sort by votes (total votes count)
                  const aVotes = a.options.reduce((sum, opt) => sum + opt.votesCount, 0)
                  const bVotes = b.options.reduce((sum, opt) => sum + opt.votesCount, 0)
                  if (bVotes !== aVotes) {
                    return bVotes - aVotes
                  }
                  // If votes are equal, sort by latest
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                }
              })
              
              return sortedPolls.length === 0 && event?.settings?.allowParticipantPolls ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-2">No active polls yet</p>
                    {currentUserId && (
                      <p className="text-sm text-gray-500">
                        Click "Create Poll" above to create one
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                sortedPolls.map((poll) => {
              const userVotedOptionId = userVotes.get(poll.id)
              const showResultsImmediately = event?.settings?.showResultsImmediately !== false
              const showResults = showResultsImmediately || userVotedOptionId
              const isPending = !poll.isActive
              const isOwnPoll = currentUserId && poll.createdBy?.id === currentUserId
              const creatorName = poll.createdBy?.name || 'Anonymous'
              
              return (
                <Card key={poll.id} className={isPending ? 'border-yellow-200 bg-yellow-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{poll.title}</CardTitle>
                          {isPending && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium border border-yellow-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <span>by {creatorName}</span>
                          <span>•</span>
                          <span>{formatDateTime(poll.createdAt)}</span>
                        </div>
                        <CardDescription>
                          {isPending 
                            ? '⏳ Pending approval from moderator'
                            : userVotedOptionId 
                              ? 'Click your vote to remove it' 
                              : showResults 
                                ? 'Select an option to vote'
                                : 'Vote to see results'}
                        </CardDescription>
                      </div>
                      {isOwnPoll && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this poll?')) {
                              fetch(`/api/events/${event.id}/polls/${poll.id}`, {
                                method: 'DELETE',
                              }).then(() => {
                                toast({
                                  title: 'Poll deleted',
                                  description: 'Your poll has been deleted',
                                })
                              }).catch(() => {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: 'Failed to delete poll',
                                })
                              })
                            }
                          }}
                          title="Delete your poll"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const totalVotes = poll.options.reduce((sum, o) => sum + o.votesCount, 0)
                        const percentage = totalVotes > 0 ? (option.votesCount / totalVotes) * 100 : 0
                        const isVoted = userVotedOptionId === option.id

                        return (
                          <div key={option.id}>
                            <Button
                              variant={isVoted ? "default" : "outline"}
                              className={`w-full justify-between ${
                                isVoted ? 'bg-primary text-primary-foreground' : ''
                              }`}
                              onClick={() => handleVote(poll.id, option.id)}
                              disabled={isPending}
                            >
                              <span className="flex items-center gap-2">
                                {isVoted && (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                                {option.optionText}
                              </span>
                              {showResults && (
                                <span className="font-mono">
                                  {option.votesCount} ({percentage.toFixed(0)}%)
                                </span>
                              )}
                            </Button>
                            {showResults && (
                              <div className="h-2 bg-gray-200 rounded-full mt-1">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isVoted ? 'bg-primary' : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {isPending && (
                      <p className="text-xs text-center text-yellow-700 mt-4 bg-yellow-100 p-2 rounded">
                        This poll is awaiting approval. You'll be able to vote once a moderator approves it.
                      </p>
                    )}
                    {!isPending && !showResults && (
                      <p className="text-xs text-center text-gray-500 mt-4">
                        Results will be visible after you vote
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })
              )
            })()}
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {(() => {
            const filteredQuestions = questions.filter((question) => {
              // Never show archived questions to participants
              if (question.isArchived) return false
              // Show all approved questions to everyone
              if (question.status === 'APPROVED') return true
              // Show pending/rejected questions only to creator
              const isCreator = currentUserId 
                ? question.authorId === currentUserId 
                : question.sessionId === getSessionId()
              return isCreator
            })

            // Sort questions based on selected sort option
            const sortedQuestions = [...filteredQuestions].sort((a, b) => {
              if (questionSortBy === 'latest') {
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

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Questions ({filteredQuestions.length})
                  </h2>
                  <Select value={questionSortBy} onValueChange={(value: 'latest' | 'votes') => setQuestionSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Latest First</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="votes">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>Most Voted</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sortedQuestions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No questions yet. Be the first to ask!</p>
                    </CardContent>
                  </Card>
                ) : (
                  sortedQuestions.map((question) => {
              const isUpvoted = upvotedQuestions.has(question.id)
              const isOwnQuestion = currentUserId 
                ? question.authorId === currentUserId 
                : question.sessionId === getSessionId()
              
              return (
                <Card key={question.id} className={
                  question.isAnswered ? 'border-green-200 bg-green-50' : 
                  question.status === 'PENDING' ? 'border-yellow-200 bg-yellow-50' : 
                  question.status === 'REJECTED' ? 'border-red-200 bg-red-50' : ''
                }>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Button
                        variant={isUpvoted ? "default" : "outline"}
                        size="sm"
                        className="flex-col h-auto py-2"
                        onClick={() => handleUpvote(question.id)}
                        disabled={isOwnQuestion}
                        title={isOwnQuestion ? "You can't upvote your own question" : isUpvoted ? "Remove upvote" : "Upvote this question"}
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="text-xs font-bold">{question.upvotesCount}</span>
                      </Button>
                      <div className="flex-1">
                        <p className="text-lg mb-2">{question.content}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>by {question.authorName}</span>
                            <span>•</span>
                            <span>{formatDateTime(question.createdAt)}</span>
                            {question.status === 'PENDING' && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                                Pending Review
                              </span>
                            )}
                            {question.status === 'REJECTED' && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                                Rejected
                              </span>
                            )}
                            {question.isAnswered && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                Answered
                              </span>
                            )}
                          </div>
                          {isOwnQuestion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => confirmDeleteQuestion(question.id)}
                              title="Delete your question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                    )
                  })
                )}
              </>
            )
          })()}
        </div>
      </main>

      {/* Delete Question Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your question. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Poll Dialog */}
      {event && (
        <ParticipantCreatePollDialog
          eventId={event.id}
          open={createPollDialogOpen}
          onOpenChange={setCreatePollDialogOpen}
          onPollCreated={() => {
            // Poll will appear via Socket.io real-time update
          }}
        />
      )}
    </div>
  )
}

