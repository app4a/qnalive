"use client"

import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSocketPage() {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      setConnected(true)
      setMessages(prev => [...prev, '✅ Socket connected!'])
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setMessages(prev => [...prev, '❌ Socket disconnected'])
    })

    socket.on('connect_error', (error) => {
      setMessages(prev => [...prev, `❌ Connection error: ${error.message}`])
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
    }
  }, [])

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Socket.io Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Connection Status:</strong>{' '}
              <span className={connected ? 'text-green-600' : 'text-red-600'}>
                {connected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            
            <div>
              <strong>Messages:</strong>
              <div className="mt-2 p-4 bg-gray-100 rounded max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500">Waiting for connection...</p>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className="mb-1">{msg}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

