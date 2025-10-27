/**
 * Dashboard Page Object
 * 
 * Page Object Model for the dashboard page (/dashboard)
 */

import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly createEventButton: Locator
  readonly eventsList: Locator
  
  constructor(page: Page) {
    this.page = page
    this.createEventButton = page.locator('a[href="/dashboard/events/new"]').first()
    this.eventsList = page.locator('div.grid') // The grid containing event cards
  }
  
  /**
   * Navigate to the dashboard
   */
  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Create a new event
   */
  async createEvent(data: {
    name: string
    description?: string
    allowAnonymousQuestions?: boolean
    enableQuestionModeration?: boolean
    allowParticipantPolls?: boolean
  }) {
    // Navigate to create event page
    await this.createEventButton.click()
    await this.page.waitForLoadState('networkidle')
    
    // Wait for the form to be visible
    await this.page.waitForSelector('input#title', { timeout: 5000 })
    
    // Fill in event title (the field is "title", not "name")
    await this.page.fill('input#title', data.name)
    
    // Fill in description if provided
    if (data.description) {
      await this.page.fill('textarea#description', data.description)
    }
    
    // Toggle settings if provided (using checkbox inputs, not switch buttons)
    if (data.allowAnonymousQuestions !== undefined) {
      const checkbox = this.page.locator('input#allowAnonymous')
      const isChecked = await checkbox.isChecked()
      
      if (isChecked !== data.allowAnonymousQuestions) {
        await checkbox.click()
      }
    }
    
    if (data.enableQuestionModeration !== undefined) {
      const checkbox = this.page.locator('input#moderationEnabled')
      const isChecked = await checkbox.isChecked()
      
      if (isChecked !== data.enableQuestionModeration) {
        await checkbox.click()
      }
    }
    
    // Note: allowParticipantPolls is not available on the create event form
    // It can only be set from the event settings page
    
    // Submit the form
    await this.page.click('button[type="submit"]')
    
    // Wait for navigation to event details page (not dashboard)
    await this.page.waitForURL(/\/dashboard\/events\/[^\/]+/, { timeout: 15000 })
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Navigate to an event's details page by clicking on its card
   */
  async navigateToEvent(eventName: string) {
    // Event cards are Link elements, click on the one with matching title
    const eventLink = this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`)
    await eventLink.click()
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Get event count
   */
  async getEventCount(): Promise<number> {
    // Count the number of event cards (Links to /dashboard/events/)
    const events = await this.page.locator('a[href*="/dashboard/events/"]').count()
    return events
  }
  
  /**
   * Check if event exists on dashboard
   */
  async hasEvent(eventName: string): Promise<boolean> {
    const count = await this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`).count()
    return count > 0
  }
  
  /**
   * Get event code from dashboard
   */
  async getEventCode(eventName: string): Promise<string> {
    // Find the event card by title, then get the code
    const eventCard = this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`)
    // The code is in a span with font-mono font-bold after "Code: "
    const codeElement = eventCard.locator('span.font-mono.font-bold')
    const codeText = await codeElement.textContent()
    return codeText?.trim() || ''
  }
  
  /**
   * Get event question count
   */
  async getEventQuestionCount(eventName: string): Promise<number> {
    const eventCard = this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`)
    // Find the Questions section (has text "Questions")
    const questionsSection = eventCard.locator('text="Questions"')
    // The count is in the div above it with text-2xl font-bold
    const countElement = questionsSection.locator('xpath=preceding-sibling::div[@class="text-2xl font-bold"]').first()
    const countText = await countElement.textContent().catch(() => '0')
    return parseInt(countText?.trim() || '0', 10)
  }
  
  /**
   * Get event participant count
   */
  async getEventParticipantCount(eventName: string): Promise<number> {
    const eventCard = this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`)
    // Find the Participants section
    const participantsSection = eventCard.locator('text="Participants"')
    const countElement = participantsSection.locator('xpath=preceding-sibling::div[@class="text-2xl font-bold"]').first()
    const countText = await countElement.textContent().catch(() => '0')
    return parseInt(countText?.trim() || '0', 10)
  }
  
  /**
   * Check if event is active (based on badge)
   */
  async isEventActive(eventName: string): Promise<boolean> {
    const eventCard = this.page.locator(`a[href*="/dashboard/events/"]:has-text("${eventName}")`)
    // The status badge contains either "Active" or "Inactive"
    const badge = eventCard.locator('span:has-text("Active"), span:has-text("Inactive")').first()
    const statusText = await badge.textContent()
    return statusText?.toLowerCase().includes('active') || false
  }
}

