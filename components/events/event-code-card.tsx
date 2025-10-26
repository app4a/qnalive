"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, ExternalLink, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EventCodeCardProps {
  eventCode: string
  participantUrl: string
}

export function EventCodeCard({ eventCode, participantUrl }: EventCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopyCode = () => {
    navigator.clipboard.writeText(eventCode)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Event code copied to clipboard',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(participantUrl)
    toast({
      title: 'Copied!',
      description: 'Participant URL copied to clipboard',
    })
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg">Event Code</CardTitle>
        <CardDescription>
          Share this code with participants to join your event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-4xl font-mono font-bold tracking-widest text-blue-600">
              {eventCode}
            </div>
            <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
              <span>Join at: {participantUrl}</span>
              <button
                onClick={handleCopyUrl}
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Copy URL
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
            <Link href={`/e/${eventCode}`} target="_blank">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

