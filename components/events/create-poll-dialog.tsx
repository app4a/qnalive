'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface CreatePollDialogProps {
  eventId: string
}

export function CreatePollDialog({ eventId }: CreatePollDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MULTIPLE_CHOICE' | 'YES_NO' | 'RATING'>('MULTIPLE_CHOICE')
  const [options, setOptions] = useState(['', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('events.manage.createPoll')
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

    if (title.trim().length < 5) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: t('errors.titleTooShort'),
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
          title: tc('error'),
          description: t('errors.minOptions'),
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
        throw new Error(data.error || data.message || tc('errors.failedToCreatePoll'))
      }

      toast({
        title: tc('success'),
        description: t('success'),
      })

      setOpen(false)
      setTitle('')
      setType('MULTIPLE_CHOICE')
      setOptions(['', ''])
      
      // Refresh to revalidate Next.js cache
      // This ensures the poll appears when navigating back to this page
      router.refresh()
    } catch (error: any) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('button')}
        </Button>
      </DialogTrigger>
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
              <Label htmlFor="title">{t('pollQuestion')} *</Label>
              <Input
                id="title"
                placeholder={t('pollQuestionPlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={5}
                maxLength={255}
                required
              />
              <p className="text-xs text-gray-500">
                {t('pollQuestionHint')}
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
                  <SelectItem value="MULTIPLE_CHOICE">{t('types.multipleChoice')}</SelectItem>
                  <SelectItem value="YES_NO">{t('types.yesNo')}</SelectItem>
                  <SelectItem value="RATING">{t('types.rating')}</SelectItem>
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
                {t('autoYesNo')}
              </div>
            )}

            {type === 'RATING' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {t('autoRating')}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('creating') : t('button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

