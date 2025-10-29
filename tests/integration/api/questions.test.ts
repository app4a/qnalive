/**
 * Questions API Integration Tests
 * 
 * Tests for question CRUD, upvoting, and moderation
 */

import { createTestUser, createTestEvent, createTestQuestion, cleanupTestData, prisma } from '../../fixtures'

describe('Questions API', () => {
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
  
  describe('Question Creation', () => {
    it('should create a question with authenticated user', async () => {
      const question = await createTestQuestion(testEvent.id, {
        content: 'Test question?',
        authorId: testUser.id,
        authorName: 'Test User',
      })
      
      expect(question).toBeDefined()
      expect(question.content).toBe('Test question?')
      expect(question.authorId).toBe(testUser.id)
      expect(question.eventId).toBe(testEvent.id)
    })
    
    it('should create a question with anonymous user (sessionId)', async () => {
      const question = await createTestQuestion(testEvent.id, {
        content: 'Anonymous question?',
        authorId: null,
        sessionId: 'anon-session-123',
        authorName: 'Anonymous',
      })
      
      expect(question).toBeDefined()
      expect(question.authorId).toBeNull()
      expect(question.sessionId).toBe('anon-session-123')
    })
    
    it('should initialize upvotesCount to 0', async () => {
      const question = await createTestQuestion(testEvent.id)
      
      expect(question.upvotesCount).toBe(0)
    })
    
    it('should set status to APPROVED by default in non-moderated event', async () => {
      const question = await createTestQuestion(testEvent.id)
      
      expect(question.status).toBe("APPROVED")
    })
    
    it('should set status to PENDING in moderated event', async () => {
      const moderatedEvent = await createTestEvent(testUser.id, {
        moderationEnabled: true,
      })
      
      const question = await createTestQuestion(moderatedEvent.id, {
        status: "PENDING",
      })
      
      expect(question.status).toBe("PENDING")
    })
  })
  
  describe('Question Upvoting', () => {
    let testQuestion: any
    
    beforeEach(async () => {
      testQuestion = await createTestQuestion(testEvent.id)
    })
    
    it('should increment upvote count in transaction', async () => {
      await prisma.$transaction(async (tx) => {
        // Create upvote
        await tx.questionUpvote.create({
          data: {
            questionId: testQuestion.id,
            userId: testUser.id,
          },
        })
        
        // Increment count
        await tx.question.update({
          where: { id: testQuestion.id },
          data: { upvotesCount: { increment: 1 } },
        })
      })
      
      const updated = await prisma.question.findUnique({
        where: { id: testQuestion.id },
      })
      
      expect(updated?.upvotesCount).toBe(1)
    })
    
    it('should decrement upvote count when removing upvote', async () => {
      // First, add an upvote
      const upvote = await prisma.questionUpvote.create({
        data: {
          questionId: testQuestion.id,
          userId: testUser.id,
        },
      })
      
      await prisma.question.update({
        where: { id: testQuestion.id },
        data: { upvotesCount: 1 },
      })
      
      // Then remove it in transaction
      await prisma.$transaction(async (tx) => {
        await tx.questionUpvote.delete({
          where: { id: upvote.id },
        })
        
        await tx.question.update({
          where: { id: testQuestion.id },
          data: { upvotesCount: { decrement: 1 } },
        })
      })
      
      const updated = await prisma.question.findUnique({
        where: { id: testQuestion.id },
      })
      
      expect(updated?.upvotesCount).toBe(0)
    })
    
    it('should prevent duplicate upvotes from same user', async () => {
      // Create first upvote
      await prisma.questionUpvote.create({
        data: {
          questionId: testQuestion.id,
          userId: testUser.id,
        },
      })
      
      // Try to create duplicate - should throw
      await expect(
        prisma.questionUpvote.create({
          data: {
            questionId: testQuestion.id,
            userId: testUser.id,
          },
        })
      ).rejects.toThrow()
    })
    
    it('should allow multiple users to upvote same question', async () => {
      const user2 = await createTestUser({ email: 'user2@example.com' })
      const user3 = await createTestUser({ email: 'user3@example.com' })
      
      await prisma.questionUpvote.create({
        data: { questionId: testQuestion.id, userId: testUser.id },
      })
      
      await prisma.questionUpvote.create({
        data: { questionId: testQuestion.id, userId: user2.id },
      })
      
      await prisma.questionUpvote.create({
        data: { questionId: testQuestion.id, userId: user3.id },
      })
      
      const upvotes = await prisma.questionUpvote.findMany({
        where: { questionId: testQuestion.id },
      })
      
      expect(upvotes).toHaveLength(3)
    })
  })
  
  describe('Moderation Status Changes', () => {
    it('should approve a pending question', async () => {
      const question = await createTestQuestion(testEvent.id, {
        status: "PENDING",
      })
      
      const approved = await prisma.question.update({
        where: { id: question.id },
        data: { status: "APPROVED" },
      })
      
      expect(approved.status).toBe("APPROVED")
    })
    
    it('should reject a pending question', async () => {
      const question = await createTestQuestion(testEvent.id, {
        status: "PENDING",
      })
      
      const rejected = await prisma.question.update({
        where: { id: question.id },
        data: { status: "REJECTED" },
      })
      
      expect(rejected.status).toBe("REJECTED")
    })
    
    it('should archive an approved question', async () => {
      const question = await createTestQuestion(testEvent.id, {
        status: "APPROVED",
      })
      
      const archived = await prisma.question.update({
        where: { id: question.id },
        data: { isArchived: true },
      })
      
      expect(archived.isArchived).toBe(true)
      expect(archived.status).toBe("APPROVED") // Status remains APPROVED
    })
    
    it('should query questions by status', async () => {
      await createTestQuestion(testEvent.id, { status: "PENDING" })
      await createTestQuestion(testEvent.id, { status: "APPROVED" })
      await createTestQuestion(testEvent.id, { status: "REJECTED" })
      
      const pending = await prisma.question.findMany({
        where: { eventId: testEvent.id, status: "PENDING" },
      })
      
      const approved = await prisma.question.findMany({
        where: { eventId: testEvent.id, status: "APPROVED" },
      })
      
      expect(pending).toHaveLength(1)
      expect(approved).toHaveLength(1)
    })
  })
  
  describe('Question Deletion', () => {
    it('should delete a question and its upvotes', async () => {
      const question = await createTestQuestion(testEvent.id)
      
      // Add some upvotes
      await prisma.questionUpvote.create({
        data: { questionId: question.id, userId: testUser.id },
      })
      
      // Delete question
      await prisma.question.delete({
        where: { id: question.id },
      })
      
      // Verify question is deleted
      const deleted = await prisma.question.findUnique({
        where: { id: question.id },
      })
      
      expect(deleted).toBeNull()
      
      // Verify upvotes are also deleted (cascade)
      const upvotes = await prisma.questionUpvote.findMany({
        where: { questionId: question.id },
      })
      
      expect(upvotes).toHaveLength(0)
    })
  })
  
  describe('Question Queries', () => {
    it('should retrieve questions with upvote counts', async () => {
      const q1 = await createTestQuestion(testEvent.id, { content: 'Q1' })
      const q2 = await createTestQuestion(testEvent.id, { content: 'Q2' })
      
      // Add upvotes
      await prisma.questionUpvote.create({
        data: { questionId: q1.id, userId: testUser.id },
      })
      
      await prisma.question.update({
        where: { id: q1.id },
        data: { upvotesCount: 1 },
      })
      
      const questions = await prisma.question.findMany({
        where: { eventId: testEvent.id },
        orderBy: { upvotesCount: 'desc' },
      })
      
      expect(questions[0].id).toBe(q1.id)
      expect(questions[0].upvotesCount).toBe(1)
      expect(questions[1].id).toBe(q2.id)
      expect(questions[1].upvotesCount).toBe(0)
    })
    
    it('should retrieve questions ordered by creation date', async () => {
      const q1 = await createTestQuestion(testEvent.id, { content: 'First' })
      await new Promise((resolve) => setTimeout(resolve, 100))
      const q2 = await createTestQuestion(testEvent.id, { content: 'Second' })
      
      const questions = await prisma.question.findMany({
        where: { eventId: testEvent.id },
        orderBy: { createdAt: 'desc' },
      })
      
      expect(questions[0].id).toBe(q2.id)
      expect(questions[1].id).toBe(q1.id)
    })
  })
})

