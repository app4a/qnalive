'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, BarChart3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface ParticipantCreatePollDialogProps {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPollCreated?: () => void
}

export function ParticipantCreatePollDialog({ 
  eventId, 
  open, 
  onOpenChange,
  onPollCreated 
}: ParticipantCreatePollDialogProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MULTIPLE_CHOICE' | 'YES_NO' | 'RATING'>('MULTIPLE_CHOICE')
  const [options, setOptions] = useState(['', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('participant.createPollDialog')
  const tc = useTranslations('common')

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const resetForm = () => {
    setTitle('')
    setType('MULTIPLE_CHOICE')
    setOptions(['', ''])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a poll question',
      })
      return
    }

    if (title.trim().length < 5) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Poll question must be at least 5 characters',
      })
      return
    }

    // Get poll options based on type
    let pollOptions: string[]
    if (type === 'YES_NO') {
      pollOptions = ['Yes', 'No']
    } else if (type === 'RATING') {
      pollOptions = ['1', '2', '3', '4', '5']
    } else {
      pollOptions = options.filter(opt => opt.trim() !== '')
      if (pollOptions.length < 2) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please provide at least 2 options',
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          options: pollOptions,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        // Format detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((err: any) => 
            `${err.path?.join('.') || 'Field'}: ${err.message}`
          ).join('\n')
          throw new Error(errorMessages)
        }
        throw new Error(data.error || data.message || 'Failed to create poll')
      }

      const createdPoll = await response.json()

      toast({
        title: 'Poll created!',
        description: createdPoll.isActive 
          ? 'Your poll is now live' 
          : 'Your poll is pending approval',
      })

      resetForm()
      onOpenChange(false)
      if (onPollCreated) {
        onPollCreated()
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create poll',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Poll Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('pollTitle')} *</Label>
              <Input
                id="title"
                placeholder={t('pollTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={5}
                maxLength={255}
                required
              />
              <p className="text-xs text-gray-500">
                {t('pollTitleHint')}
              </p>
            </div>

            {/* Poll Type */}
            <div className="space-y-2">
              <Label htmlFor="type">{t('pollType')} *</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">{t('multipleChoice')}</SelectItem>
                  <SelectItem value="YES_NO">{t('yesNo')}</SelectItem>
                  <SelectItem value="RATING">{t('rating')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options (only for Multiple Choice) */}
            {type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                <Label>{t('options')} *</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={t('optionPlaceholder', { number: index + 1 })}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        maxLength={100}
                        minLength={1}
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addOption')}
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  {t('optionsHint')}
                </p>
              </div>
            )}

            {type === 'YES_NO' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {t('yesNoHint')}
              </div>
            )}

            {type === 'RATING' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {t('ratingHint')}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('creating') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

