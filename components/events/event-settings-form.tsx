'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Event {
  id: string
  title: string
  description: string | null
  isActive: boolean
  settings: any
}

interface EventSettingsFormProps {
  event: Event
}

export function EventSettingsForm({ event }: EventSettingsFormProps) {
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || '')
  const [isActive, setIsActive] = useState(event.isActive)
  const [allowAnonymous, setAllowAnonymous] = useState(
    (event.settings as any)?.allowAnonymous ?? true
  )
  const [moderationEnabled, setModerationEnabled] = useState(
    (event.settings as any)?.moderationEnabled ?? false
  )
  const [showResultsImmediately, setShowResultsImmediately] = useState(
    (event.settings as any)?.showResultsImmediately ?? true
  )
  const [allowParticipantPolls, setAllowParticipantPolls] = useState(
    (event.settings as any)?.allowParticipantPolls ?? false
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('events.settings')
  const tCommon = useTranslations('common')
  const tc = useTranslations('common')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: t('errors.titleRequired'),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          isActive,
          settings: {
            allowAnonymous,
            moderationEnabled,
            showResultsImmediately,
            allowParticipantPolls,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        
        // Use the formatted message from the API if available
        if (data.message) {
          throw new Error(data.message)
        }
        
        throw new Error(data.error || tCommon('errors.failedToUpdateEvent'))
      }

      const data = await response.json()
      
      // Show special message if questions were auto-approved
      if (data.autoApprovedCount && data.autoApprovedCount > 0) {
        toast({
          title: tc('success'),
          description: t('autoApprovedMessage', { count: data.autoApprovedCount }),
        })
      } else {
        toast({
          title: tc('success'),
          description: t('success'),
        })
      }

      router.refresh()
    } catch (error: any) {
      console.error('Failed to update event settings:', error)
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: error.message || t('errors.failed'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('basicInfo')}</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">{t('eventTitle')} *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('eventTitlePlaceholder')}
            maxLength={255}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
          />
        </div>
      </div>

      {/* Event Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('eventStatus')}</h3>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">{t('eventActive')}</Label>
            <p className="text-sm text-gray-600">
              {t('eventActiveHint')}
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
      </div>

      {/* Q&A Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('qaSettings')}</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="allowAnonymous">{t('allowAnonymous')}</Label>
            <p className="text-sm text-gray-600">
              {t('allowAnonymousHint')}
            </p>
          </div>
          <Switch
            id="allowAnonymous"
            checked={allowAnonymous}
            onCheckedChange={setAllowAnonymous}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="moderationEnabled">{t('moderationEnabled')}</Label>
            <p className="text-sm text-gray-600">
              {t('moderationEnabledHint')}
            </p>
          </div>
          <Switch
            id="moderationEnabled"
            checked={moderationEnabled}
            onCheckedChange={setModerationEnabled}
          />
        </div>
      </div>

      {/* Poll Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('pollSettings')}</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showResultsImmediately">{t('showResultsImmediately')}</Label>
            <p className="text-sm text-gray-600">
              {t('showResultsImmediatelyHint')}
            </p>
          </div>
          <Switch
            id="showResultsImmediately"
            checked={showResultsImmediately}
            onCheckedChange={setShowResultsImmediately}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="allowParticipantPolls">{t('allowParticipantPolls')}</Label>
            <p className="text-sm text-gray-600">
              {t('allowParticipantPollsHint')}
            </p>
          </div>
          <Switch
            id="allowParticipantPolls"
            checked={allowParticipantPolls}
            onCheckedChange={setAllowParticipantPolls}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting ? tc('saving') : t('saveButton')}
        </Button>
      </div>
    </form>
  )
}

