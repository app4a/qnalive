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
import { ArrowUp, MessageSquare, Users, BarChart3, Send } from 'lucide-react'
import type { Socket } from 'socket.io-client'

interface Question {
  id: string
  content: string
  authorName: string
  upvotesCount: number
  isAnswered: boolean
  createdAt: string
}

interface Poll {
  id: string
  title: string
  type: string
  isActive: boolean
  options: PollOption[]
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
  const [participantCount, setParticipantCount] = useState(0)
  const [newQuestion, setNewQuestion] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
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

        // Fetch questions
        const questionsRes = await fetch(`/api/events/${data.id}/questions`)
        const questionsData = await questionsRes.json()
        setQuestions(questionsData)

        // Fetch polls
        const pollsRes = await fetch(`/api/events/${data.id}/polls?activeOnly=true`)
        const pollsData = await pollsRes.json()
        setPolls(pollsData)

        // Set up WebSocket
        socketInstance = getSocket()
        setSocket(socketInstance)
        
        const sessionId2 = getSessionId()
        socketInstance.emit('event:join', { eventId: data.id, sessionId: sessionId2 })

        // Listen for real-time updates
        const handleQuestionNew = (data: any) => {
          setQuestions(prev => {
            // Check if question already exists to prevent duplicates
            if (prev.some(q => q.id === data.question.id)) {
              return prev
            }
            return [data.question, ...prev]
          })
        }

        const handleQuestionUpvoted = (data: any) => {
          setQuestions(prev => prev.map(q => 
            q.id === data.questionId ? { ...q, upvotesCount: data.upvotesCount } : q
          ))
        }

        const handleQuestionUpdated = (data: any) => {
          setQuestions(prev => prev.map(q => 
            q.id === data.question.id ? data.question : q
          ))
        }

        const handleQuestionDeleted = (data: any) => {
          setQuestions(prev => prev.filter(q => q.id !== data.questionId))
        }

        const handlePollNew = (data: any) => {
          setPolls(prev => {
            // Check if poll already exists to prevent duplicates
            if (prev.some(p => p.id === data.poll.id)) {
              return prev
            }
            return [data.poll, ...prev]
          })
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

        socketInstance.on('question:new', handleQuestionNew)
        socketInstance.on('question:upvoted', handleQuestionUpvoted)
        socketInstance.on('question:updated', handleQuestionUpdated)
        socketInstance.on('question:deleted', handleQuestionDeleted)
        socketInstance.on('poll:new', handlePollNew)
        socketInstance.on('poll:voted', handlePollVoted)
        socketInstance.on('event:participants', handleParticipants)

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
        socketInstance.off('poll:voted')
        socketInstance.off('event:participants')
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
          authorName: authorName || 'Anonymous',
          sessionId: getSessionId(),
        }),
      })

      if (!response.ok) throw new Error('Failed to submit question')

      setNewQuestion('')
      toast({
        title: 'Success',
        description: 'Question submitted successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit question',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (questionId: string) => {
    try {
      const response = await fetch(`/api/events/${event.id}/questions/${questionId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to upvote',
      })
    }
  }

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch(`/api/events/${event.id}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, sessionId: getSessionId() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
      })
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
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{participantCount} participants</span>
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
            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authorName">Your Name (Optional)</Label>
                <Input
                  id="authorName"
                  type="text"
                  placeholder="Anonymous"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>
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
          </CardContent>
        </Card>

        {/* Active Polls */}
        {polls.length > 0 && (
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Active Polls
            </h2>
            {polls.map((poll) => (
              <Card key={poll.id}>
                <CardHeader>
                  <CardTitle>{poll.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {poll.options.map((option) => {
                      const totalVotes = poll.options.reduce((sum, o) => sum + o.votesCount, 0)
                      const percentage = totalVotes > 0 ? (option.votesCount / totalVotes) * 100 : 0

                      return (
                        <div key={option.id}>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => handleVote(poll.id, option.id)}
                          >
                            <span>{option.optionText}</span>
                            <span className="font-mono">{option.votesCount}</span>
                          </Button>
                          <div className="h-2 bg-gray-200 rounded-full mt-1">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Questions ({questions.length})
          </h2>
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No questions yet. Be the first to ask!</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question) => (
              <Card key={question.id} className={question.isAnswered ? 'border-green-200 bg-green-50' : ''}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-col h-auto py-2"
                      onClick={() => handleUpvote(question.id)}
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span className="text-xs font-bold">{question.upvotesCount}</span>
                    </Button>
                    <div className="flex-1">
                      <p className="text-lg mb-2">{question.content}</p>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>by {question.authorName}</span>
                        {question.isAnswered && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            Answered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

