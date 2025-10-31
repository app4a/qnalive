"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getSessionId } from '@/lib/utils'
import { AppHeader } from '@/components/layout/app-header'
import { useTranslations } from 'next-intl'

export default function JoinEventPage() {
  const { data: session } = useSession()
  const [eventCode, setEventCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('join')
  const tCommon = useTranslations('common')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (eventCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('error.notFound'),
      })
      return
    }

    setLoading(true)

    try {
      const sessionId = getSessionId()
      
      const response = await fetch('/api/events/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventCode: eventCode.toUpperCase(),
          sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error.somethingWrong'))
      }

      toast({
        title: tCommon('success'),
        description: t('joining'),
      })

      // Redirect to participant view
      router.push(`/e/${eventCode.toUpperCase()}`)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error.message || t('error.somethingWrong'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <AppHeader session={session} showDashboardButton={true} showLanguageSwitcher={true} />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{t('title')}</CardTitle>
            <CardDescription>
              {t('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventCode">{tCommon('code')}</Label>
                <Input
                  id="eventCode"
                  type="text"
                  placeholder={t('codePlaceholder')}
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading || eventCode.length !== 6}
              >
                {loading ? t('joining') : t('button')}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>{t('noCode')}</p>
              <Link href="/auth/signup" className="text-primary hover:underline">
                {t('createOwn')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
