'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface DeleteEventButtonProps {
  eventId: string
  eventTitle: string
}

export function DeleteEventButton({ eventId, eventTitle }: DeleteEventButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('events.manage.delete')
  const tc = useTranslations('common')

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete event')
      }

      toast({
        title: tc('success'),
        description: t('success', { title: eventTitle }),
      })

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: error.message || t('errors.failed'),
      })
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          {t('button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dialog.description', { title: eventTitle })} <strong>{eventTitle}</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('dialog.questions')}</li>
              <li>{t('dialog.polls')}</li>
              <li>{t('dialog.participants')}</li>
            </ul>
            <p className="mt-2 font-semibold text-red-600">{t('dialog.warning')}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? t('deleting') : t('confirmButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

