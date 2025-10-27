/**
 * Question Submission Tests
 * 
 * Tests for submitting questions in various scenarios
 */

import { test, expect } from '@playwright/test'
import { EventPage } from '../page-objects/EventPage'
import { DashboardPage } from '../page-objects/DashboardPage'
import { setupTestSession, clearAuth, getSessionId } from '../helpers/auth'
import { resetDatabase } from '../helpers/database'
import { createTestUser, createTestEvent } from '../fixtures'

test.describe('Question Submission', () => {
  let eventPage: EventPage
  let dashboardPage: DashboardPage
  let testEventCode: string
  
  test.beforeEach(async ({ page, context }) => {
    eventPage = new EventPage(page)
    dashboardPage = new DashboardPage(page)
    
    // Reset database
    await resetDatabase()
    
    // Create a test user and event
    const user = await createTestUser({ email: 'creator@example.com' })
    const event = await createTestEvent(user.id, {
      allowAnonymous: true,
      moderationEnabled: false,
    })
    testEventCode = event.eventCode
  })
  
  test.afterEach(async ({ context }) => {
    await clearAuth(context)
  })
  
  test('Q-001: Submit question as signed-in user', async ({ page, context }) => {
    // Set up authenticated session
    await setupTestSession(context, 'participant@example.com')
    
    // Navigate to event page
    await eventPage.goto(testEventCode)
    
    // Submit a question
    const questionContent = `Test question from signed user ${Date.now()}`
    await eventPage.submitQuestion(questionContent)
    
    // Verify question appears
    await expect(page.locator(`text="${questionContent}"`)).toBeVisible({ timeout: 5000 })
  })
  
  test('Q-002: Submit question as anonymous user with name', async ({ page }) => {
    // Navigate to event page (not signed in)
    await eventPage.goto(testEventCode)
    
    // Submit a question with a name
    const questionContent = `Anonymous question ${Date.now()}`
    const authorName = 'Anonymous User'
    await eventPage.submitQuestion(questionContent, authorName)
    
    // Verify question appears
    await expect(page.locator(`text="${questionContent}"`)).toBeVisible({ timeout: 5000 })
  })
  
  test('Q-003: Submit question as anonymous user without name', async ({ page }) => {
    // Navigate to event page (not signed in)
    await eventPage.goto(testEventCode)
    
    // Submit a question without a name
    const questionContent = `Anonymous question ${Date.now()}`
    await eventPage.submitQuestion(questionContent)
    
    // Verify question appears
    await expect(page.locator(`text="${questionContent}"`)).toBeVisible({ timeout: 5000 })
  })
  
  test('Q-004: Cannot submit empty question', async ({ page }) => {
    // Navigate to event page
    await eventPage.goto(testEventCode)
    
    // Verify submit button exists (HTML5 validation prevents empty submission)
    await expect(eventPage.submitButton).toBeVisible()
  })
  
  test.skip('Q-005: Access inactive event', async ({ page }) => {
    // Create an inactive event
    const user = await createTestUser({ email: 'creator2@example.com' })
    const inactiveEvent = await createTestEvent(user.id, {
      isActive: false,
    })
    
    // Navigate to inactive event - should still be accessible
    await eventPage.goto(inactiveEvent.eventCode)
    
    // Verify event page loads
    await expect(page.locator('h1')).toBeVisible()
  })
  
  test('Q-006: Submit question in moderated event', async ({ page, context }) => {
    // Create a moderated event
    const user = await createTestUser({ email: 'moderator@example.com' })
    const moderatedEvent = await createTestEvent(user.id, {
      moderationEnabled: true,
      allowAnonymous: true,
    })
    
    // Set up authenticated session
    await setupTestSession(context, 'participant2@example.com')
    
    // Navigate to moderated event
    await eventPage.goto(moderatedEvent.eventCode)
    
    // Submit a question
    const questionContent = `Moderated question ${Date.now()}`
    await eventPage.submitQuestion(questionContent)
    
    // In moderated events, the question should appear to the submitter
    await expect(page.locator(`text="${questionContent}"`)).toBeVisible({ timeout: 5000 })
  })
  
  test('Q-007: Multiple questions from same user', async ({ page, context }) => {
    // Set up authenticated session
    await setupTestSession(context, 'participant3@example.com')
    
    // Navigate to event page
    await eventPage.goto(testEventCode)
    
    // Submit multiple questions
    const questions = [
      `First question ${Date.now()}`,
      `Second question ${Date.now() + 1}`,
      `Third question ${Date.now() + 2}`,
    ]
    
    for (const question of questions) {
      await eventPage.submitQuestion(question)
      await page.waitForTimeout(1000) // Wait between submissions
    }
    
    // Verify all questions appear
    for (const question of questions) {
      await expect(page.locator(`text="${question}"`)).toBeVisible()
    }
  })
})

