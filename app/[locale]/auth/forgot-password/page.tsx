"use client"

import { useState } from 'react'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword')
  const tc = useTranslations('common')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let statusCode = 500
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      statusCode = response.status
      const data = await response.json()

      if (!response.ok) {
        // Handle rate limit error specially
        if (response.status === 429) {
          throw new Error(data.error || 'Too many requests. Please try again later.')
        }
        throw new Error(data.error || 'Failed to send reset email')
      }

      setSubmitted(true)
      toast({
        title: t('success.title'),
        description: t('success.description'),
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: statusCode === 429 ? t('tooManyRequests') : tc('error'),
        description: error.message || t('error.somethingWrong'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{tc('appName')}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{t('title')}</CardTitle>
            <CardDescription>
              {submitted
                ? t('subtitleAfter')
                : t('subtitleBefore')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-medium">{t('emailSent')}</p>
                  <p className="mt-1">
                    {t('emailSentDesc')} <strong>{email}</strong>, {t('emailSentDesc2')}
                  </p>
                  <p className="mt-2 text-xs text-green-600">
                    {t('didntReceive')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="w-full"
                  >
                    {t('tryDifferent')}
                  </Button>
                  
                  <Link href="/auth/signin" className="block">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('backToSignIn')}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? t('sendingLink') : t('button')}
                </Button>

                <Link href="/auth/signin" className="block">
                  <Button type="button" variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('backToSignIn')}
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

