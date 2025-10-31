'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { BarChart3, Trash2, Clock, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSocket } from '@/lib/socket-client'
import type { Socket } from 'socket.io-client'
import { formatDateTime } from '@/lib/date-utils'
import { useTranslations } from 'next-intl'

interface PollOption {
  id: string
  optionText: string
  votesCount: number
  displayOrder: number
}

interface Poll {
  id: string
  title: string
  type: string
  isActive: boolean
  createdAt: string | Date
  options: PollOption[]
  _count: {
    votes: number
  }
  createdBy?: {
    id: string
    name: string | null
    image: string | null
  }
}

interface PollsListProps {
  polls: Poll[]
  eventId: string
}

export function PollsList({ polls: initialPolls, eventId }: PollsListProps) {
  const [polls, setPolls] = useState(initialPolls)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pollToDelete, setPollToDelete] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sortBy, setSortBy] = useState<'latest' | 'votes'>('latest')
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('events.polls')
  const tc = useTranslations('common')

  // Force refresh server data on mount and when navigating back
  useEffect(() => {
    router.refresh()
  }, [router])

  // Sync local state when server data changes (e.g., navigation back to page)
  useEffect(() => {
    setPolls(initialPolls)
  }, [initialPolls])

  // Set up Socket.io for real-time updates
  useEffect(() => {
    const socketInstance = getSocket()
    setSocket(socketInstance)

    console.log('[Admin] Setting up socket connection for polls, event:', eventId)

    // Join event room (admin context)
    socketInstance.emit('event:join', { eventId, sessionId: 'admin' })

    // Listen for poll events
    const handlePollNew = (data: any) => {
      console.log('[Admin] Received poll:new event:', data.poll.id)
      setPolls(prev => {
        const exists = prev.some(p => p.id === data.poll.id)
        if (exists) return prev
        return [data.poll, ...prev]
      })
    }

    const handlePollUpdated = (data: any) => {
      console.log('[Admin] Received poll:updated event:', data.poll.id)
      setPolls(prev => prev.map(p => 
        p.id === data.poll.id ? data.poll : p
      ))
    }

    const handlePollDeleted = (data: any) => {
      console.log('[Admin] Received poll:deleted event:', data.pollId)
      setPolls(prev => prev.filter(p => p.id !== data.pollId))
    }

    const handlePollVoted = (data: any) => {
      console.log('[Admin] Received poll:voted event:', data.pollId, data.optionId, data.votesCount)
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

    socketInstance.on('poll:new', handlePollNew)
    socketInstance.on('poll:updated', handlePollUpdated)
    socketInstance.on('poll:deleted', handlePollDeleted)
    socketInstance.on('poll:voted', handlePollVoted)

    return () => {
      socketInstance.off('poll:new')
      socketInstance.off('poll:updated')
      socketInstance.off('poll:deleted')
      socketInstance.off('poll:voted')
      socketInstance.emit('event:leave', { eventId })
    }
  }, [eventId])

  const handleToggleActive = async (pollId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/polls/${pollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!response.ok) throw new Error(tc('errors.failedToUpdatePoll'))

      setPolls(prev =>
        prev.map(p => (p.id === pollId ? { ...p, isActive: !isActive } : p))
      )

      toast({
        title: tc('success'),
        description: !isActive ? t('activated') : t('deactivated'),
      })

      // Refresh to revalidate Next.js cache
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: error.message,
      })
    }
  }

  const confirmDelete = (pollId: string) => {
    setPollToDelete(pollId)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!pollToDelete) return

    setDeletingId(pollToDelete)
    try {
      const response = await fetch(`/api/events/${eventId}/polls/${pollToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error(tc('errors.failedToDeletePoll'))

      setPolls(prev => prev.filter(p => p.id !== pollToDelete))

      toast({
        title: tc('success'),
        description: t('pollDeleted'),
      })

      // Refresh to revalidate Next.js cache
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: error.message,
      })
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setPollToDelete(null)
    }
  }

  const getPollTypeLabel = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return t('types.multipleChoice')
      case 'YES_NO':
        return t('types.yesNo')
      case 'RATING':
        return t('types.rating')
      case 'WORD_CLOUD':
        return t('types.wordCloud')
      default:
        return type
    }
  }

  // Sort polls based on selected sort option
  const sortedPolls = [...polls].sort((a, b) => {
    if (sortBy === 'latest') {
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

  if (polls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noPolls')}</p>
        <p className="text-sm mt-2">{t('createHint')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 md:mb-6 flex justify-end">
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
                <span>{t('sortVoted')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 md:space-y-4">
        {sortedPolls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votesCount, 0)

          return (
            <div
              key={poll.id}
              className={`border rounded-lg p-3 md:p-4 ${
                poll.isActive ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3 md:mb-4">
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="text-base md:text-lg font-semibold mb-1.5 break-words">{poll.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                    <Badge variant="outline" className="text-xs">{getPollTypeLabel(poll.type)}</Badge>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{t('createdBy')}: {poll.createdBy?.name || tc('unknown')}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="whitespace-nowrap">{totalVotes} {t('votes')}</span>
                    <span className="hidden md:inline">•</span>
                    <span className="text-xs hidden md:inline">{formatDateTime(poll.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {poll.isActive && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{tc('active')}</Badge>
                  )}
                  {!poll.isActive && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">{tc('pending')}</Badge>
                  )}
                </div>
              </div>

              {/* Poll Options */}
              <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4">
                {poll.options.map((option) => {
                  const percentage = totalVotes > 0 
                    ? Math.round((option.votesCount / totalVotes) * 100) 
                    : 0

                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="truncate mr-2">{option.optionText}</span>
                        <span className="font-medium whitespace-nowrap text-xs md:text-sm">{option.votesCount} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={poll.isActive}
                    onCheckedChange={() => handleToggleActive(poll.id, poll.isActive)}
                  />
                  <span className="text-xs md:text-sm text-gray-600">
                    {poll.isActive ? tc('active') : tc('inactive')}
                  </span>
                </div>

                <div className="sm:ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 h-8 text-xs md:text-sm"
                    onClick={() => confirmDelete(poll.id)}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden md:inline ml-1">{tc('delete')}</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? t('deleting') : tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

