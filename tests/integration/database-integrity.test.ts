/**
 * Database Integrity Tests
 * 
 * Tests for data consistency, vote counts, and integrity constraints
 */

import {
  createTestUser,
  createTestEvent,
  createTestQuestion,
  createTestPoll,
  createQuestionUpvote,
  createPollVote,
  cleanupTestData,
  prisma,
} from '../fixtures'
import { getVoteStatistics, getQuestionUpvoteStatistics, runIntegrityChecks } from '../helpers/database'

describe('Database Integrity', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })
  
  afterEach(async () => {
    await cleanupTestData()
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('Question Upvote Consistency', () => {
    it('should maintain consistent upvote counts', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const question = await createTestQuestion(event.id)
      
      // Add upvotes
      const user1 = await createTestUser({ email: 'user1@example.com' })
      const user2 = await createTestUser({ email: 'user2@example.com' })
      const user3 = await createTestUser({ email: 'user3@example.com' })
      
      await createQuestionUpvote(question.id, { userId: user1.id })
      await createQuestionUpvote(question.id, { userId: user2.id })
      await createQuestionUpvote(question.id, { userId: user3.id })
      
      // Update stored count
      await prisma.question.update({
        where: { id: question.id },
        data: { upvotesCount: 3 },
      })
      
      // Verify consistency
      const stats = await getQuestionUpvoteStatistics(question.id)
      
      expect(stats.storedCount).toBe(3)
      expect(stats.actualCount).toBe(3)
      expect(stats.consistent).toBe(true)
    })
    
    it('should detect inconsistent upvote counts', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const question = await createTestQuestion(event.id)
      
      // Add upvotes
      await createQuestionUpvote(question.id, { userId: user.id })
      
      // Intentionally set wrong count
      await prisma.question.update({
        where: { id: question.id },
        data: { upvotesCount: 5 },
      })
      
      // Verify inconsistency is detected
      const stats = await getQuestionUpvoteStatistics(question.id)
      
      expect(stats.storedCount).toBe(5)
      expect(stats.actualCount).toBe(1)
      expect(stats.consistent).toBe(false)
    })
  })
  
  describe('Poll Vote Consistency', () => {
    it('should maintain consistent vote counts across all options', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const poll = await createTestPoll(event.id, user.id, ['A', 'B', 'C'])
      
      // Add votes
      const user1 = await createTestUser({ email: 'user1@example.com' })
      const user2 = await createTestUser({ email: 'user2@example.com' })
      const user3 = await createTestUser({ email: 'user3@example.com' })
      
      await createPollVote(poll.id, poll.options[0].id, { userId: user1.id })
      await createPollVote(poll.id, poll.options[0].id, { userId: user2.id })
      await createPollVote(poll.id, poll.options[1].id, { userId: user3.id })
      
      // Update stored counts
      await prisma.pollOption.update({
        where: { id: poll.options[0].id },
        data: { votesCount: 2 },
      })
      
      await prisma.pollOption.update({
        where: { id: poll.options[1].id },
        data: { votesCount: 1 },
      })
      
      // Verify consistency
      const stats = await getVoteStatistics(poll.id)
      
      expect(stats.totalVotes).toBe(3)
      expect(stats.allConsistent).toBe(true)
      expect(stats.options[0].storedCount).toBe(2)
      expect(stats.options[0].actualCount).toBe(2)
      expect(stats.options[1].storedCount).toBe(1)
      expect(stats.options[1].actualCount).toBe(1)
    })
    
    it('should detect inconsistent poll vote counts', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const poll = await createTestPoll(event.id, user.id, ['Yes', 'No'])
      
      // Add one vote
      await createPollVote(poll.id, poll.options[0].id, { userId: user.id })
      
      // Set wrong count
      await prisma.pollOption.update({
        where: { id: poll.options[0].id },
        data: { votesCount: 10 },
      })
      
      // Verify inconsistency is detected
      const stats = await getVoteStatistics(poll.id)
      
      expect(stats.allConsistent).toBe(false)
      expect(stats.options[0].consistent).toBe(false)
    })
  })
  
  describe('Duplicate Vote Detection', () => {
    it('should detect duplicate poll votes', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const poll = await createTestPoll(event.id, user.id, ['A', 'B'])
      
      // Try to create duplicate votes by bypassing constraint temporarily
      // (This shouldn't be possible with proper constraints)
      const voter = await createTestUser({ email: 'voter@example.com' })
      
      await createPollVote(poll.id, poll.options[0].id, { userId: voter.id })
      
      // Try to create another vote for same poll - should throw
      await expect(
        createPollVote(poll.id, poll.options[1].id, { userId: voter.id })
      ).rejects.toThrow()
    })
    
    it('should run integrity checks for duplicate votes', async () => {
      // Run integrity checks on clean database
      const results = await runIntegrityChecks()
      
      expect(results.duplicateVotes).toHaveLength(0)
      expect(results.inconsistentVoteCounts).toHaveLength(0)
      expect(results.orphanedRecords).toHaveLength(0)
    })
  })
  
  describe('Cascading Deletes', () => {
    it('should cascade delete questions when event is deleted', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const question = await createTestQuestion(event.id)
      
      // Delete event
      await prisma.event.delete({
        where: { id: event.id },
      })
      
      // Verify question is also deleted
      const deletedQuestion = await prisma.question.findUnique({
        where: { id: question.id },
      })
      
      expect(deletedQuestion).toBeNull()
    })
    
    it('should cascade delete upvotes when question is deleted', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const question = await createTestQuestion(event.id)
      
      // Add upvotes
      await createQuestionUpvote(question.id, { userId: user.id })
      
      // Delete question
      await prisma.question.delete({
        where: { id: question.id },
      })
      
      // Verify upvotes are also deleted
      const upvotes = await prisma.questionUpvote.findMany({
        where: { questionId: question.id },
      })
      
      expect(upvotes).toHaveLength(0)
    })
    
    it('should cascade delete poll options and votes when poll is deleted', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const poll = await createTestPoll(event.id, user.id, ['A', 'B'])
      
      // Add votes
      await createPollVote(poll.id, poll.options[0].id, { userId: user.id })
      
      // Delete poll
      await prisma.poll.delete({
        where: { id: poll.id },
      })
      
      // Verify options are deleted
      const options = await prisma.pollOption.findMany({
        where: { pollId: poll.id },
      })
      
      expect(options).toHaveLength(0)
      
      // Verify votes are deleted
      const votes = await prisma.pollVote.findMany({
        where: { pollId: poll.id },
      })
      
      expect(votes).toHaveLength(0)
    })
  })
  
  describe('Concurrent Operations', () => {
    it('should handle concurrent upvotes correctly', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const question = await createTestQuestion(event.id)
      
      // Create multiple users
      const users = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser({ email: `user${i}@example.com` })
        )
      )
      
      // Concurrent upvotes
      await Promise.all(
        users.map(async (u) => {
          await prisma.$transaction(async (tx) => {
            await tx.questionUpvote.create({
              data: {
                questionId: question.id,
                userId: u.id,
              },
            })
            
            await tx.question.update({
              where: { id: question.id },
              data: { upvotesCount: { increment: 1 } },
            })
          })
        })
      )
      
      // Verify final count
      const stats = await getQuestionUpvoteStatistics(question.id)
      
      expect(stats.storedCount).toBe(5)
      expect(stats.actualCount).toBe(5)
      expect(stats.consistent).toBe(true)
    })
    
    it('should handle concurrent poll votes correctly', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      const poll = await createTestPoll(event.id, user.id, ['Yes', 'No'])
      
      // Create multiple users
      const users = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTestUser({ email: `voter${i}@example.com` })
        )
      )
      
      // Concurrent votes
      await Promise.all(
        users.map(async (u, i) => {
          const optionId = poll.options[i % 2].id // Alternate between options
          
          await prisma.$transaction(async (tx) => {
            await tx.pollVote.create({
              data: {
                pollId: poll.id,
                optionId: optionId,
                userId: u.id,
              },
            })
            
            await tx.pollOption.update({
              where: { id: optionId },
              data: { votesCount: { increment: 1 } },
            })
          })
        })
      )
      
      // Verify final counts
      const stats = await getVoteStatistics(poll.id)
      
      expect(stats.totalVotes).toBe(5)
      expect(stats.allConsistent).toBe(true)
    })
  })
  
  describe('Data Validation', () => {
    it('should enforce required fields', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      
      // Try to create question without content
      await expect(
        prisma.question.create({
          data: {
            eventId: event.id,
            sessionId: 'test',
            // content is missing
          } as any,
        })
      ).rejects.toThrow()
    })
    
    it('should enforce foreign key constraints', async () => {
      // Try to create question with non-existent eventId
      await expect(
        prisma.question.create({
          data: {
            content: 'Test question',
            eventId: 'non-existent-id',
            authorName: 'Test User',
          },
        })
      ).rejects.toThrow()
    })
    
    it('should enforce unique constraints', async () => {
      const user = await createTestUser()
      const event = await createTestEvent(user.id)
      
      // Create event code
      await createTestEvent(user.id, { eventCode: 'UNIQUE1' })
      
      // Try to create another event with same code
      await expect(
        createTestEvent(user.id, { eventCode: 'UNIQUE1' })
      ).rejects.toThrow()
    })
  })
})

