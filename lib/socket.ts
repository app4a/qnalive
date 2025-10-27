import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { prisma } from '@/lib/prisma'

export type SocketServer = SocketIOServer

// Use global to persist across HMR in development
const globalForSocket = globalThis as unknown as {
  io: SocketIOServer | undefined
  participantCountTimeouts: Map<string, NodeJS.Timeout>
}

let io: SocketIOServer | undefined = globalForSocket.io

// Debounce map for participant count broadcasts (fixes race condition)
const participantCountTimeouts: Map<string, NodeJS.Timeout> = 
  globalForSocket.participantCountTimeouts || new Map()

if (!globalForSocket.participantCountTimeouts) {
  globalForSocket.participantCountTimeouts = participantCountTimeouts
}

export const initSocket = (server: NetServer): SocketIOServer => {
  if (!io) {
    io = globalForSocket.io = new SocketIOServer(server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Join event room
      socket.on('event:join', async ({ eventId, sessionId, userId }) => {
        try {
          socket.join(eventId)
          console.log(`Socket ${socket.id} joined event ${eventId}`)

          // Join user's personal room for targeted notifications
          if (userId) {
            socket.join(`user:${userId}`)
            console.log(`Socket ${socket.id} joined user room user:${userId}`)
          }

          // Track participant
          if (userId) {
            await prisma.eventParticipant.upsert({
              where: {
                eventId_userId: { eventId, userId },
              },
              create: {
                eventId,
                userId,
                lastActive: new Date(),
              },
              update: {
                lastActive: new Date(),
              },
            })
          } else if (sessionId) {
            await prisma.eventParticipant.upsert({
              where: {
                eventId_sessionId: { eventId, sessionId },
              },
              create: {
                eventId,
                sessionId,
                lastActive: new Date(),
              },
              update: {
                lastActive: new Date(),
              },
            })
          }

          // Send participant count with debouncing to handle race conditions
          // Clear any pending timeout for this event
          const existingTimeout = participantCountTimeouts.get(eventId)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }

          // Schedule participant count broadcast (debounced to 500ms)
          const timeout = setTimeout(async () => {
            try {
              const count = await prisma.eventParticipant.count({
                where: { eventId },
              })
              io?.to(eventId).emit('event:participants', { count })
              participantCountTimeouts.delete(eventId)
            } catch (error) {
              console.error('Error broadcasting participant count:', error)
            }
          }, 500)

          participantCountTimeouts.set(eventId, timeout)
        } catch (error) {
          console.error('Error joining event:', error)
          socket.emit('error', { message: 'Failed to join event' })
        }
      })

      // Leave event room
      socket.on('event:leave', ({ eventId }) => {
        socket.leave(eventId)
        console.log(`Socket ${socket.id} left event ${eventId}`)
      })

      // ============================================================
      // REMOVED DEAD CODE: The following Socket.io event handlers
      // were not used by any client code (all operations go through
      // API routes instead). Removed for code clarity and to prevent
      // confusion about which code path is actually used.
      //
      // Removed handlers:
      // - question:submit
      // - question:upvote
      // - question:update
      // - question:delete
      // - poll:create
      // - poll:vote
      // - poll:status
      //
      // All these operations are handled by API routes:
      // - POST /api/events/[eventId]/questions
      // - POST /api/events/[eventId]/questions/[id]/upvote
      // - PUT /api/events/[eventId]/questions/[id]
      // - DELETE /api/events/[eventId]/questions/[id]
      // - POST /api/events/[eventId]/polls
      // - POST /api/events/[eventId]/polls/[id]/vote
      // - PUT /api/events/[eventId]/polls/[id]
      //
      // Socket.io is used ONLY for broadcasting events after
      // successful API operations, not for initiating them.
      // ============================================================

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  return io
}

export const getIO = (): SocketIOServer | null => {
  // Check both module scope and global
  const socket = io || globalForSocket.io
  if (!socket) {
    console.warn('Socket.io not initialized - real-time updates disabled')
    return null
  }
  return socket
}

export const hasIO = (): boolean => {
  return !!(io || globalForSocket.io)
}

