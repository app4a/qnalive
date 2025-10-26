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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Event title is required',
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
        
        throw new Error(data.error || 'Failed to update event')
      }

      const data = await response.json()
      
      // Show special message if questions were auto-approved
      if (data.autoApprovedCount && data.autoApprovedCount > 0) {
        toast({
          title: 'Settings updated',
          description: `Moderation disabled. ${data.autoApprovedCount} pending question${data.autoApprovedCount > 1 ? 's' : ''} automatically approved and now visible to participants.`,
        })
      } else {
        toast({
          title: 'Settings updated',
          description: 'Your event settings have been saved',
        })
      }

      router.refresh()
    } catch (error: any) {
      console.error('Failed to update event settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update settings',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">Event Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Event"
            maxLength={255}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for your event"
            rows={3}
          />
        </div>
      </div>

      {/* Event Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Event Status</h3>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Event Active</Label>
            <p className="text-sm text-gray-600">
              When active, participants can join and submit questions
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
        <h3 className="text-lg font-semibold">Q&A Settings</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="allowAnonymous">Allow Anonymous Questions</Label>
            <p className="text-sm text-gray-600">
              If enabled, participants can submit questions without signing in. If disabled, only signed-in users can ask questions.
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
            <Label htmlFor="moderationEnabled">Enable Question Moderation</Label>
            <p className="text-sm text-gray-600">
              Review and approve questions before they appear publicly. Note: Disabling moderation will automatically approve all pending questions.
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
        <h3 className="text-lg font-semibold">Poll Settings</h3>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="showResultsImmediately">Show Results Immediately</Label>
            <p className="text-sm text-gray-600">
              Display poll results in real-time as votes come in
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
            <Label htmlFor="allowParticipantPolls">Allow Participant Polls</Label>
            <p className="text-sm text-gray-600">
              Let participants create their own polls (requires moderation)
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
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}

