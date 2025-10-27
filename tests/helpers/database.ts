/**
 * Database Test Helpers
 * 
 * Helpers for database operations in tests
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

/**
 * Reset the database to a clean state
 */
export async function resetDatabase() {
  // Delete all data in reverse order of dependencies
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

/**
 * Seed the database with initial test data
 */
export async function seedDatabase() {
  // Create a test user
  const testUser = await prisma.user.create({
    data: {
      email: 'testadmin@example.com',
      name: 'Test Admin',
      emailVerified: new Date(),
    },
  })
  
  // Create a test event
  const testEvent = await prisma.event.create({
    data: {
      title: 'Test Event',
      description: 'A test event',
      eventCode: 'TEST01',
      ownerId: testUser.id,
      isActive: true,
      settings: {
        allowAnonymous: true,
        moderationEnabled: false,
        allowParticipantPolls: false,
        showResultsImmediately: true,
      },
    },
  })
  
  return { testUser, testEvent }
}

/**
 * Query the database for integrity checks
 */
export async function queryDatabase(query: string): Promise<any[]> {
  return prisma.$queryRawUnsafe(query)
}

/**
 * Run database integrity checks
 */
export async function runIntegrityChecks() {
  const results = {
    duplicateVotes: [] as any[],
    inconsistentVoteCounts: [] as any[],
    orphanedRecords: [] as any[],
  }
  
  // Check for duplicate poll votes
  results.duplicateVotes = await prisma.$queryRaw`
    SELECT "pollId", "userId", "sessionId", COUNT(*) as count
    FROM "PollVote"
    GROUP BY "pollId", "userId", "sessionId"
    HAVING COUNT(*) > 1
  `
  
  // Check for inconsistent vote counts
  results.inconsistentVoteCounts = await prisma.$queryRaw`
    SELECT 
      po.id,
      po."pollId",
      po."votesCount" as stored_count,
      COUNT(pv.id) as actual_count
    FROM "PollOption" po
    LEFT JOIN "PollVote" pv ON pv."optionId" = po.id
    GROUP BY po.id, po."pollId", po."votesCount"
    HAVING po."votesCount" != COUNT(pv.id)
  `
  
  // Check for orphaned poll votes (votes for deleted polls)
  results.orphanedRecords = await prisma.$queryRaw`
    SELECT pv.id, pv."pollId"
    FROM "PollVote" pv
    LEFT JOIN "Poll" p ON p.id = pv."pollId"
    WHERE p.id IS NULL
  `
  
  return results
}

/**
 * Get vote count statistics
 */
export async function getVoteStatistics(pollId: string) {
  const votes = await prisma.pollVote.findMany({
    where: { pollId },
    include: {
      option: true,
    },
  })
  
  const options = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { displayOrder: 'asc' },
  })
  
  const statistics = options.map((option) => {
    const actualVotes = votes.filter((v) => v.optionId === option.id).length
    return {
      optionId: option.id,
      optionText: option.optionText,
      storedCount: option.votesCount,
      actualCount: actualVotes,
      consistent: option.votesCount === actualVotes,
    }
  })
  
  return {
    totalVotes: votes.length,
    options: statistics,
    allConsistent: statistics.every((s) => s.consistent),
  }
}

/**
 * Get question upvote statistics
 */
export async function getQuestionUpvoteStatistics(questionId: string) {
  const upvotes = await prisma.questionUpvote.findMany({
    where: { questionId },
  })
  
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  })
  
  return {
    storedCount: question?.upvotesCount || 0,
    actualCount: upvotes.length,
    consistent: question?.upvotesCount === upvotes.length,
  }
}

/**
 * Wait for database operation to complete
 * Useful for testing eventual consistency
 */
export async function waitForDatabaseSync(
  checkFn: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  
  return false
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export { prisma }

