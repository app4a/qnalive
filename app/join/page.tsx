"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getSessionId } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'

export default function JoinEventPage() {
  const { data: session } = useSession()
  const [eventCode, setEventCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (eventCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Event code must be 6 characters',
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
        throw new Error(data.error || 'Failed to join event')
      }

      toast({
        title: 'Success!',
        description: 'Joining event...',
      })

      // Redirect to participant view
      router.push(`/e/${eventCode.toUpperCase()}`)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to join event',
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
            <span className="text-2xl font-bold">QnALive</span>
          </Link>
          <nav className="flex items-center space-x-4">
            {session?.user ? (
              <>
                <UserMenu userName={session.user.name} userEmail={session.user.email} />
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Join an Event</CardTitle>
            <CardDescription>
              Enter the 6-character event code to participate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventCode">Event Code</Label>
                <Input
                  id="eventCode"
                  type="text"
                  placeholder="ABC123"
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
                {loading ? 'Joining...' : 'Join Event'}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Don&apos;t have a code?</p>
              <Link href="/auth/signup" className="text-primary hover:underline">
                Create your own event
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

