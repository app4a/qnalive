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
        title: 'Error',
        description: 'Please enter a poll title',
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
        throw new Error(data.error || 'Failed to create poll')
      }

      toast({
        title: 'Poll created',
        description: 'Your poll has been created successfully',
      })

      setOpen(false)
      setTitle('')
      setType('MULTIPLE_CHOICE')
      setOptions(['', ''])
      router.refresh()
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
            <DialogDescription>
              Create a live poll for your event participants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Poll Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Poll Question *</Label>
              <Input
                id="title"
                placeholder="What's your question?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            {/* Poll Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Poll Type *</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                  <SelectItem value="YES_NO">Yes/No</SelectItem>
                  <SelectItem value="RATING">Rating (1-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options (only for Multiple Choice) */}
            {type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                <Label>Options *</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        maxLength={100}
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
                    Add Option
                  </Button>
                )}
              </div>
            )}

            {type === 'YES_NO' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                Options: Yes, No (automatic)
              </div>
            )}

            {type === 'RATING' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                Options: 1, 2, 3, 4, 5 (automatic)
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

