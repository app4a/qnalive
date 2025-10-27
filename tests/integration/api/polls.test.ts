/**
 * Polls API Integration Tests
 * 
 * Tests for poll CRUD, voting, and unique constraints
 */

import { createTestUser, createTestEvent, createTestPoll, createPollVote, cleanupTestData, prisma } from '../../fixtures'
import { ModerationStatus } from '@prisma/client'

describe('Polls API', () => {
  let testUser: any
  let testEvent: any
  
  beforeEach(async () => {
    await cleanupTestData()
    testUser = await createTestUser({ email: 'testuser@example.com' })
    testEvent = await createTestEvent(testUser.id)
  })
  
  afterEach(async () => {
    await cleanupTestData()
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('Poll Creation', () => {
    it('should create a poll with options', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'], {
        title: 'Test Poll?',
      })
      
      expect(poll).toBeDefined()
      expect(poll.title).toBe('Test Poll?')
      expect(poll.options).toHaveLength(2)
      expect(poll.options[0].optionText).toBe('Yes')
      expect(poll.options[1].optionText).toBe('No')
    })
    
    it('should initialize vote counts to 0', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['A', 'B', 'C'])
      
      poll.options.forEach((option) => {
        expect(option.votesCount).toBe(0)
      })
    })
    
    it('should set correct option order', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['First', 'Second', 'Third'])
      
      expect(poll.options[0].displayOrder).toBe(0)
      expect(poll.options[1].displayOrder).toBe(1)
      expect(poll.options[2].displayOrder).toBe(2)
    })
    
    it('should create poll with showResultsImmediately setting', async () => {
      const poll1 = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'], {
        showResultsImmediately: true,
      })
      
      const poll2 = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'], {
        showResultsImmediately: false,
      })
      
      expect((poll1.settings as any).showResultsImmediately).toBe(true)
      expect((poll2.settings as any).showResultsImmediately).toBe(false)
    })
  })
  
  describe('Poll Voting', () => {
    let testPoll: any
    let optionId: string
    
    beforeEach(async () => {
      testPoll = await createTestPoll(testEvent.id, testUser.id, ['Option A', 'Option B'])
      optionId = testPoll.options[0].id
    })
    
    it('should record a vote in transaction', async () => {
      await prisma.$transaction(async (tx) => {
        // Create vote
        await tx.pollVote.create({
          data: {
            pollId: testPoll.id,
            optionId: optionId,
            userId: testUser.id,
          },
        })
        
        // Increment count
        await tx.pollOption.update({
          where: { id: optionId },
          data: { votesCount: { increment: 1 } },
        })
      })
      
      const option = await prisma.pollOption.findUnique({
        where: { id: optionId },
      })
      
      expect(option?.votesCount).toBe(1)
    })
    
    it('should prevent duplicate votes from same user (userId constraint)', async () => {
      // Create first vote
      await prisma.pollVote.create({
        data: {
          pollId: testPoll.id,
          optionId: optionId,
          userId: testUser.id,
        },
      })
      
      // Try to create duplicate - should throw due to unique constraint
      await expect(
        prisma.pollVote.create({
          data: {
            pollId: testPoll.id,
            optionId: optionId,
            userId: testUser.id,
          },
        })
      ).rejects.toThrow()
    })
    
    it('should prevent duplicate votes from same session (sessionId constraint)', async () => {
      const sessionId = 'test-session-123'
      
      // Create first vote
      await prisma.pollVote.create({
        data: {
          pollId: testPoll.id,
          optionId: optionId,
          sessionId: sessionId,
        },
      })
      
      // Try to create duplicate - should throw due to unique constraint
      await expect(
        prisma.pollVote.create({
          data: {
            pollId: testPoll.id,
            optionId: optionId,
            sessionId: sessionId,
          },
        })
      ).rejects.toThrow()
    })
    
    it('should allow changing vote to different option', async () => {
      const option1Id = testPoll.options[0].id
      const option2Id = testPoll.options[1].id
      
      // Vote for option 1
      const vote = await prisma.pollVote.create({
        data: {
          pollId: testPoll.id,
          optionId: option1Id,
          userId: testUser.id,
        },
      })
      
      await prisma.pollOption.update({
        where: { id: option1Id },
        data: { votesCount: 1 },
      })
      
      // Change vote in transaction
      await prisma.$transaction(async (tx) => {
        // Delete old vote
        await tx.pollVote.delete({
          where: { id: vote.id },
        })
        
        // Decrement old option
        await tx.pollOption.update({
          where: { id: option1Id },
          data: { votesCount: { decrement: 1 } },
        })
        
        // Create new vote
        await tx.pollVote.create({
          data: {
            pollId: testPoll.id,
            optionId: option2Id,
            userId: testUser.id,
          },
        })
        
        // Increment new option
        await tx.pollOption.update({
          where: { id: option2Id },
          data: { votesCount: { increment: 1 } },
        })
      })
      
      const option1 = await prisma.pollOption.findUnique({
        where: { id: option1Id },
      })
      
      const option2 = await prisma.pollOption.findUnique({
        where: { id: option2Id },
      })
      
      expect(option1?.votesCount).toBe(0)
      expect(option2?.votesCount).toBe(1)
    })
    
    it('should unvote in transaction', async () => {
      // Create vote
      const vote = await prisma.pollVote.create({
        data: {
          pollId: testPoll.id,
          optionId: optionId,
          userId: testUser.id,
        },
      })
      
      await prisma.pollOption.update({
        where: { id: optionId },
        data: { votesCount: 1 },
      })
      
      // Unvote
      await prisma.$transaction(async (tx) => {
        await tx.pollVote.delete({
          where: { id: vote.id },
        })
        
        await tx.pollOption.update({
          where: { id: optionId },
          data: { votesCount: { decrement: 1 } },
        })
      })
      
      const option = await prisma.pollOption.findUnique({
        where: { id: optionId },
      })
      
      const voteExists = await prisma.pollVote.findUnique({
        where: { id: vote.id },
      })
      
      expect(option?.votesCount).toBe(0)
      expect(voteExists).toBeNull()
    })
  })
  
  describe('Poll Deletion', () => {
    it('should delete poll with all options and votes', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['A', 'B'])
      
      // Add a vote
      await prisma.pollVote.create({
        data: {
          pollId: poll.id,
          optionId: poll.options[0].id,
          userId: testUser.id,
        },
      })
      
      // Delete poll
      await prisma.poll.delete({
        where: { id: poll.id },
      })
      
      // Verify poll is deleted
      const deletedPoll = await prisma.poll.findUnique({
        where: { id: poll.id },
      })
      
      expect(deletedPoll).toBeNull()
      
      // Verify options are deleted (cascade)
      const options = await prisma.pollOption.findMany({
        where: { pollId: poll.id },
      })
      
      expect(options).toHaveLength(0)
      
      // Verify votes are deleted (cascade)
      const votes = await prisma.pollVote.findMany({
        where: { pollId: poll.id },
      })
      
      expect(votes).toHaveLength(0)
    })
  })
  
  describe('Poll Queries', () => {
    it('should retrieve polls with options and vote counts', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'])
      
      const retrieved = await prisma.poll.findUnique({
        where: { id: poll.id },
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      })
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.options).toHaveLength(2)
      expect(retrieved?.options[0].optionText).toBe('Yes')
      expect(retrieved?.options[1].optionText).toBe('No')
    })
    
    it('should retrieve polls ordered by creation date', async () => {
      const poll1 = await createTestPoll(testEvent.id, testUser.id, ['A'], {
        title: 'First Poll',
      })
      
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      const poll2 = await createTestPoll(testEvent.id, testUser.id, ['B'], {
        title: 'Second Poll',
      })
      
      const polls = await prisma.poll.findMany({
        where: { eventId: testEvent.id },
        orderBy: { createdAt: 'desc' },
      })
      
      expect(polls[0].id).toBe(poll2.id)
      expect(polls[1].id).toBe(poll1.id)
    })
    
    it('should filter active polls', async () => {
      await createTestPoll(testEvent.id, testUser.id, ['A'], {
        isActive: true,
      })
      
      await createTestPoll(testEvent.id, testUser.id, ['B'], {
        isActive: false,
      })
      
      const activePolls = await prisma.poll.findMany({
        where: { eventId: testEvent.id, isActive: true },
      })
      
      expect(activePolls).toHaveLength(1)
    })
  })
  
  describe('Unique Constraint Violations', () => {
    it('should enforce unique constraint on (pollId, userId)', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'])
      
      await prisma.pollVote.create({
        data: {
          pollId: poll.id,
          optionId: poll.options[0].id,
          userId: testUser.id,
        },
      })
      
      // Try to vote again on same poll
      await expect(
        prisma.pollVote.create({
          data: {
            pollId: poll.id,
            optionId: poll.options[1].id,
            userId: testUser.id,
          },
        })
      ).rejects.toThrow()
    })
    
    it('should enforce unique constraint on (pollId, sessionId)', async () => {
      const poll = await createTestPoll(testEvent.id, testUser.id, ['Yes', 'No'])
      const sessionId = 'test-session'
      
      await prisma.pollVote.create({
        data: {
          pollId: poll.id,
          optionId: poll.options[0].id,
          sessionId: sessionId,
        },
      })
      
      // Try to vote again on same poll with same session
      await expect(
        prisma.pollVote.create({
          data: {
            pollId: poll.id,
            optionId: poll.options[1].id,
            sessionId: sessionId,
          },
        })
      ).rejects.toThrow()
    })
  })
})

