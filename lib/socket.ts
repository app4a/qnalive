import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { prisma } from '@/lib/prisma'

export type SocketServer = SocketIOServer

// Use global to persist across HMR in development
const globalForSocket = globalThis as unknown as {
  io: SocketIOServer | undefined
}

let io: SocketIOServer | undefined = globalForSocket.io

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

          // Send participant count
          const count = await prisma.eventParticipant.count({
            where: { eventId },
          })
          io?.to(eventId).emit('event:participants', { count })
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

      // Handle question submission
      socket.on('question:submit', async (data) => {
        try {
          const question = await prisma.question.create({
            data: {
              eventId: data.eventId,
              content: data.content,
              authorName: data.authorName,
              authorId: data.userId,
              status: data.status || 'APPROVED',
            },
            include: {
              author: {
                select: { id: true, name: true, image: true },
              },
              _count: {
                select: { upvotes: true },
              },
            },
          })

          io?.to(data.eventId).emit('question:new', { question })
        } catch (error) {
          console.error('Error submitting question:', error)
          socket.emit('error', { message: 'Failed to submit question' })
        }
      })

      // Handle question upvote
      socket.on('question:upvote', async (data) => {
        try {
          // Create upvote
          if (data.userId) {
            await prisma.questionUpvote.create({
              data: {
                questionId: data.questionId,
                userId: data.userId,
              },
            })
          } else if (data.sessionId) {
            await prisma.questionUpvote.create({
              data: {
                questionId: data.questionId,
                sessionId: data.sessionId,
              },
            })
          }

          // Update count
          const updated = await prisma.question.update({
            where: { id: data.questionId },
            data: { upvotesCount: { increment: 1 } },
          })

          io?.to(data.eventId).emit('question:upvoted', {
            questionId: data.questionId,
            upvotesCount: updated.upvotesCount,
          })
        } catch (error) {
          console.error('Error upvoting question:', error)
          socket.emit('error', { message: 'Failed to upvote question' })
        }
      })

      // Handle question updates (admin)
      socket.on('question:update', async (data) => {
        try {
          const question = await prisma.question.update({
            where: { id: data.questionId },
            data: {
              status: data.status,
              isAnswered: data.isAnswered,
              isArchived: data.isArchived,
            },
            include: {
              author: {
                select: { id: true, name: true, image: true },
              },
              _count: {
                select: { upvotes: true },
              },
            },
          })

          io?.to(data.eventId).emit('question:updated', { question })
        } catch (error) {
          console.error('Error updating question:', error)
          socket.emit('error', { message: 'Failed to update question' })
        }
      })

      // Handle question deletion
      socket.on('question:delete', async (data) => {
        try {
          await prisma.question.delete({
            where: { id: data.questionId },
          })

          io?.to(data.eventId).emit('question:deleted', { questionId: data.questionId })
        } catch (error) {
          console.error('Error deleting question:', error)
          socket.emit('error', { message: 'Failed to delete question' })
        }
      })

      // Handle poll creation
      socket.on('poll:create', async (data) => {
        try {
          const poll = await prisma.poll.create({
            data: {
              eventId: data.eventId,
              createdById: data.userId,
              title: data.title,
              type: data.type,
              allowMultipleVotes: data.allowMultipleVotes || false,
              settings: data.settings || {},
              options: {
                create: data.options.map((optionText: string, index: number) => ({
                  optionText,
                  displayOrder: index,
                })),
              },
            },
            include: {
              options: {
                orderBy: { displayOrder: 'asc' },
              },
              createdBy: {
                select: { id: true, name: true, image: true },
              },
            },
          })

          io?.to(data.eventId).emit('poll:new', { poll })
        } catch (error) {
          console.error('Error creating poll:', error)
          socket.emit('error', { message: 'Failed to create poll' })
        }
      })

      // Handle poll vote
      socket.on('poll:vote', async (data) => {
        try {
          // Create vote
          if (data.userId) {
            await prisma.pollVote.create({
              data: {
                pollId: data.pollId,
                optionId: data.optionId,
                userId: data.userId,
              },
            })
          } else if (data.sessionId) {
            await prisma.pollVote.create({
              data: {
                pollId: data.pollId,
                optionId: data.optionId,
                sessionId: data.sessionId,
              },
            })
          }

          // Update count
          await prisma.pollOption.update({
            where: { id: data.optionId },
            data: { votesCount: { increment: 1 } },
          })

          const option = await prisma.pollOption.findUnique({
            where: { id: data.optionId },
          })

          io?.to(data.eventId).emit('poll:voted', {
            pollId: data.pollId,
            optionId: data.optionId,
            votesCount: option?.votesCount,
          })
        } catch (error) {
          console.error('Error voting on poll:', error)
          socket.emit('error', { message: 'Failed to vote on poll' })
        }
      })

      // Handle poll status change
      socket.on('poll:status', async (data) => {
        try {
          await prisma.poll.update({
            where: { id: data.pollId },
            data: { isActive: data.isActive },
          })

          io?.to(data.eventId).emit('poll:status', {
            pollId: data.pollId,
            isActive: data.isActive,
          })
        } catch (error) {
          console.error('Error updating poll status:', error)
          socket.emit('error', { message: 'Failed to update poll status' })
        }
      })

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

