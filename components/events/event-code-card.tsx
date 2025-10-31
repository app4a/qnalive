"use client"

import { useState } from 'react'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, ExternalLink, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface EventCodeCardProps {
  eventCode: string
  participantUrl: string
}

export function EventCodeCard({ eventCode, participantUrl }: EventCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('events.manage.eventCode')

  const handleCopyCode = () => {
    navigator.clipboard.writeText(eventCode)
    setCopied(true)
    toast({
      title: t('copied'),
      description: t('codeCopied'),
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(participantUrl)
    toast({
      title: t('copied'),
      description: t('urlCopied'),
    })
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">{t('title')}</CardTitle>
        <CardDescription className="text-sm">
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0 w-full">
            <div className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold tracking-wider md:tracking-widest text-blue-600 break-all">
              {eventCode}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="break-all">{t('joinAt')}: {participantUrl}</span>
              <button
                onClick={handleCopyUrl}
                className="text-blue-600 hover:text-blue-800 underline text-xs self-start"
              >
                {t('copyUrl')}
              </button>
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex-1 sm:flex-none"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('copied')}!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('copyCode')}
                </>
              )}
            </Button>
            <Link href={`/e/${eventCode}`} target="_blank" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('openView')}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

