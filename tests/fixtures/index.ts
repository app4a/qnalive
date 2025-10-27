/**
 * Test Fixtures
 * 
 * Factory functions to create test data consistently across all tests
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create a test user
 */
export async function createTestUser(data?: {
  email?: string
  name?: string
  emailVerified?: Date | null
}) {
  const timestamp = Date.now()
  const randomId = Math.floor(Math.random() * 10000)
  
  return prisma.user.create({
    data: {
      email: data?.email || `testuser${timestamp}${randomId}@example.com`,
      name: data?.name || `Test User ${timestamp}`,
      emailVerified: data?.emailVerified !== undefined ? data.emailVerified : new Date(),
    },
  })
}

/**
 * Create a test event
 */
export async function createTestEvent(
  ownerId: string,
  data?: {
    title?: string
    description?: string | null
    eventCode?: string
    isActive?: boolean
    allowAnonymous?: boolean
    moderationEnabled?: boolean
    allowParticipantPolls?: boolean
  }
) {
  const timestamp = Date.now()
  const randomCode = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(6, '0')
  
  return prisma.event.create({
    data: {
      title: data?.title || `Test Event ${timestamp}`,
      description: data?.description !== undefined ? data.description : 'Test event description',
      eventCode: data?.eventCode || `T${randomCode}`,
      ownerId,
      isActive: data?.isActive !== undefined ? data.isActive : true,
      settings: {
        allowAnonymous: data?.allowAnonymous !== undefined ? data.allowAnonymous : true,
        moderationEnabled: data?.moderationEnabled !== undefined ? data.moderationEnabled : false,
        allowParticipantPolls: data?.allowParticipantPolls !== undefined ? data.allowParticipantPolls : false,
        showResultsImmediately: true,
      },
    },
  })
}

/**
 * Create a test question
 */
export async function createTestQuestion(
  eventId: string,
  data?: {
    content?: string
    authorId?: string | null
    authorName?: string | null
    sessionId?: string | null
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
  }
) {
  const timestamp = Date.now()
  
  return prisma.question.create({
    data: {
      content: data?.content || `Test question ${timestamp}?`,
      eventId,
      authorId: data?.authorId !== undefined ? data.authorId : null,
      authorName: data?.authorName !== undefined ? data.authorName : null,
      sessionId: data?.sessionId !== undefined ? data.sessionId : `session-${timestamp}`,
      status: data?.status || 'APPROVED',
      upvotesCount: 0,
    },
  })
}

/**
 * Create a test poll with options
 */
export async function createTestPoll(
  eventId: string,
  createdById: string,
  options: string[] = ['Option A', 'Option B', 'Option C'],
  data?: {
    title?: string
    type?: 'MULTIPLE_CHOICE' | 'RATING' | 'YES_NO' | 'WORD_CLOUD'
    isActive?: boolean
    showResultsImmediately?: boolean
  }
) {
  const timestamp = Date.now()
  
  const poll = await prisma.poll.create({
    data: {
      title: data?.title || `Test poll ${timestamp}?`,
      type: data?.type || 'MULTIPLE_CHOICE',
      eventId,
      createdById,
      isActive: data?.isActive !== undefined ? data.isActive : true,
      settings: {
        showResultsImmediately: data?.showResultsImmediately !== undefined ? data.showResultsImmediately : true,
      },
      options: {
        create: options.map((text, index) => ({
          optionText: text,
          displayOrder: index,
          votesCount: 0,
        })),
      },
    },
    include: {
      options: true,
    },
  })
  
  return poll
}

/**
 * Create an event participant
 */
export async function createEventParticipant(
  eventId: string,
  data?: {
    userId?: string | null
    sessionId?: string
  }
) {
  const timestamp = Date.now()
  
  return prisma.eventParticipant.create({
    data: {
      eventId,
      userId: data?.userId !== undefined ? data.userId : null,
      sessionId: data?.sessionId || `session-${timestamp}-${Math.random()}`,
    },
  })
}

/**
 * Create a question upvote
 */
export async function createQuestionUpvote(
  questionId: string,
  data?: {
    userId?: string | null
    sessionId?: string | null
  }
) {
  const timestamp = Date.now()
  
  // Ensure at least one identifier is provided
  if (!data?.userId && !data?.sessionId) {
    data = { ...data, sessionId: `session-${timestamp}-${Math.random()}` }
  }
  
  return prisma.questionUpvote.create({
    data: {
      questionId,
      userId: data?.userId !== undefined ? data.userId : null,
      sessionId: data?.sessionId !== undefined ? data.sessionId : null,
    },
  })
}

/**
 * Create a poll vote
 */
export async function createPollVote(
  pollId: string,
  optionId: string,
  data?: {
    userId?: string | null
    sessionId?: string | null
  }
) {
  const timestamp = Date.now()
  
  // Ensure at least one identifier is provided
  if (!data?.userId && !data?.sessionId) {
    data = { ...data, sessionId: `session-${timestamp}-${Math.random()}` }
  }
  
  return prisma.pollVote.create({
    data: {
      pollId,
      optionId,
      userId: data?.userId !== undefined ? data.userId : null,
      sessionId: data?.sessionId !== undefined ? data.sessionId : null,
    },
  })
}

/**
 * Clean up test data (call this in afterEach or afterAll)
 */
export async function cleanupTestData() {
  await prisma.pollVote.deleteMany({})
  await prisma.pollOption.deleteMany({})
  await prisma.poll.deleteMany({})
  await prisma.questionUpvote.deleteMany({})
  await prisma.question.deleteMany({})
  await prisma.eventParticipant.deleteMany({})
  await prisma.event.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.user.deleteMany({})
}

export { prisma }

