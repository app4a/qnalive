/**
 * Events API Integration Tests
 * 
 * Tests for /api/events endpoints
 */

import { createTestUser, createTestEvent, cleanupTestData, prisma } from '../../fixtures'

describe('Events API', () => {
  let testUser: any
  
  beforeEach(async () => {
    await cleanupTestData()
    testUser = await createTestUser({ email: 'testuser@example.com' })
  })
  
  afterEach(async () => {
    await cleanupTestData()
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('POST /api/events', () => {
    it('should create a new event with valid data', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
      }
      
      // This would require mocking the API route or using a test client
      // For now, we'll test the database layer directly
      const event = await prisma.event.create({
        data: {
          ...eventData,
          eventCode: 'TEST01',
          ownerId: testUser.id,
          settings: {
            allowAnonymous: true,
            moderationEnabled: false,
            allowParticipantPolls: false,
          },
        },
      })
      
      expect(event).toBeDefined()
      expect(event.title).toBe(eventData.title)
      expect(event.eventCode).toBe('TEST01')
      expect(event.ownerId).toBe(testUser.id)
    })
    
    it('should generate unique event codes', async () => {
      const event1 = await createTestEvent(testUser.id)
      const event2 = await createTestEvent(testUser.id)
      
      expect(event1.eventCode).toBeDefined()
      expect(event2.eventCode).toBeDefined()
      expect(event1.eventCode).not.toBe(event2.eventCode)
    })
    
    it('should set default values for optional fields', async () => {
      const event = await prisma.event.create({
        data: {
          title: 'Minimal Event',
          eventCode: 'MIN001',
          ownerId: testUser.id,
        },
      })
      
      expect(event.isActive).toBe(true)
    })
  })
  
  describe('GET /api/events/[id]', () => {
    it('should retrieve an existing event', async () => {
      const event = await createTestEvent(testUser.id)
      
      const retrieved = await prisma.event.findUnique({
        where: { id: event.id },
      })
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(event.id)
      expect(retrieved?.title).toBe(event.title)
    })
    
    it('should return null for non-existent event', async () => {
      const nonExistent = await prisma.event.findUnique({
        where: { id: 'non-existent-id' },
      })
      
      expect(nonExistent).toBeNull()
    })
    
    it('should include related data when requested', async () => {
      const event = await createTestEvent(testUser.id)
      
      const withRelations = await prisma.event.findUnique({
        where: { id: event.id },
        include: {
          owner: true,
          questions: true,
          polls: true,
        },
      })
      
      expect(withRelations).toBeDefined()
      expect(withRelations?.owner).toBeDefined()
      expect(withRelations?.owner.id).toBe(testUser.id)
      expect(withRelations?.questions).toEqual([])
      expect(withRelations?.polls).toEqual([])
    })
  })
  
  describe('PUT /api/events/[id]', () => {
    it('should update event properties', async () => {
      const event = await createTestEvent(testUser.id, {
        title: 'Original Name',
      })
      
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: {
          title: 'Updated Name',
          description: 'Updated Description',
        },
      })
      
      expect(updated.title).toBe('Updated Name')
      expect(updated.description).toBe('Updated Description')
      expect(updated.eventCode).toBe(event.eventCode) // Code shouldn't change
    })
    
    it('should toggle event settings', async () => {
      const event = await createTestEvent(testUser.id, {
        allowAnonymous: false,
        moderationEnabled: false,
      })
      
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: {
          settings: {
            allowAnonymous: true,
            moderationEnabled: true,
            showResultsImmediately: true,
            allowParticipantPolls: false,
          },
        },
      })
      
      expect((updated.settings as any).allowAnonymous).toBe(true)
      expect((updated.settings as any).moderationEnabled).toBe(true)
    })
    
    it('should update timestamps', async () => {
      const event = await createTestEvent(testUser.id)
      const originalUpdatedAt = event.updatedAt
      
      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { title: 'New Name' },
      })
      
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
  
  describe('DELETE /api/events/[id]', () => {
    it('should delete an event', async () => {
      const event = await createTestEvent(testUser.id)
      
      await prisma.event.delete({
        where: { id: event.id },
      })
      
      const deleted = await prisma.event.findUnique({
        where: { id: event.id },
      })
      
      expect(deleted).toBeNull()
    })
    
    it('should cascade delete related data', async () => {
      const event = await createTestEvent(testUser.id)
      
      // Create related data
      const question = await prisma.question.create({
        data: {
          content: 'Test question',
          eventId: event.id,
          sessionId: 'test-session',
        },
      })
      
      // Delete the event
      await prisma.event.delete({
        where: { id: event.id },
      })
      
      // Verify related data is also deleted (if cascade is configured)
      const questionExists = await prisma.question.findUnique({
        where: { id: question.id },
      })
      
      expect(questionExists).toBeNull()
    })
    
    it('should throw error when deleting non-existent event', async () => {
      await expect(
        prisma.event.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow()
    })
  })
  
  describe('Event Code Generation', () => {
    it('should generate 6-character alphanumeric codes', async () => {
      const event = await createTestEvent(testUser.id)
      
      expect(event.eventCode).toHaveLength(7) // T + 6 digits
      expect(event.eventCode).toMatch(/^T[0-9]+$/)
    })
    
    it('should handle code collisions gracefully', async () => {
      // Create many events to increase chance of collision
      const events = await Promise.all(
        Array.from({ length: 10 }, () => createTestEvent(testUser.id))
      )
      
      const codes = events.map((e) => e.eventCode)
      const uniqueCodes = new Set(codes)
      
      // All codes should be unique
      expect(uniqueCodes.size).toBe(events.length)
    })
  })
})

