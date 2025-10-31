"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/layout/app-header'
import { useTranslations } from 'next-intl'

export default function NewEventPage() {
  const t = useTranslations('events.create')
  const tc = useTranslations('common')
  const td = useTranslations('dashboard')
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allowAnonymous, setAllowAnonymous] = useState(true)
  const [moderationEnabled, setModerationEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          settings: {
            allowAnonymous,
            moderationEnabled,
            showResultsImmediately: true,
            allowParticipantPolls: false,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || tc('errors.failedToCreateEvent'))
      }

      toast({
        title: t('success.title'),
        description: t('success.description'),
      })

      // Redirect to the new event and refresh to update the dashboard cache
      router.push(`/dashboard/events/${data.id}`)
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tc('error'),
        description: error.message || t('error.somethingWrong'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader session={session} showDashboardButton={true} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tc('back')} {td('title')}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t('title')}</CardTitle>
            <CardDescription>
              {t('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t('eventTitle')} *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder={t('eventTitlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">{t('settings')}</h3>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="allowAnonymous"
                    checked={allowAnonymous}
                    onChange={(e) => setAllowAnonymous(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="allowAnonymous" className="cursor-pointer">
                      {t('allowAnonymous')}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {t('allowAnonymousHint')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="moderationEnabled"
                    checked={moderationEnabled}
                    onChange={(e) => setModerationEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="moderationEnabled" className="cursor-pointer">
                      {t('moderationEnabled')}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {t('moderationEnabledHint')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? t('creating') : t('button')}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button type="button" variant="outline" size="lg" className="w-full">
                    {tc('cancel')}
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

