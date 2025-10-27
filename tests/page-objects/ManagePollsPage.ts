/**
 * Manage Polls Page Object
 * 
 * Page Object Model for the manage polls page (/dashboard/events/{id}/polls)
 */

import { Page, Locator } from '@playwright/test'

export class ManagePollsPage {
  readonly page: Page
  readonly createPollButton: Locator
  readonly pollsList: Locator
  
  constructor(page: Page) {
    this.page = page
    this.createPollButton = page.locator('button:has-text("Create Poll")').first()
    this.pollsList = page.locator('[data-testid="polls-list"]')
  }
  
  /**
   * Navigate to the manage polls page
   */
  async goto(eventId: string) {
    await this.page.goto(`/dashboard/events/${eventId}/polls`)
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Create a new poll
   */
  async createPoll(
    title: string,
    options: string[] = ['Option A', 'Option B'],
    settings?: {
      type?: 'MULTIPLE_CHOICE' | 'RATING' | 'YES_NO'
      showResultsImmediately?: boolean
    }
  ) {
    // Click create poll button
    await this.createPollButton.click()
    
    // Wait for dialog to open
    await this.page.waitForSelector('[role="dialog"]')
    
    // Fill in title
    const titleInput = this.page.locator('input[placeholder*="poll"], input[name="title"]').first()
    await titleInput.fill(title)
    
    // Select type if provided
    if (settings?.type) {
      const typeSelect = this.page.locator('select[name="type"]').first()
      await typeSelect.selectOption(settings.type)
    }
    
    // Fill in options (if type is MULTIPLE_CHOICE)
    if (!settings?.type || settings.type === 'MULTIPLE_CHOICE') {
      const optionInputs = this.page.locator('input[placeholder*="Option"]')
      const count = await optionInputs.count()
      
      for (let i = 0; i < options.length; i++) {
        if (i < count) {
          await optionInputs.nth(i).fill(options[i])
        } else {
          // Click "Add Option" button if more options needed
          const addButton = this.page.locator('button:has-text("Add Option")').first()
          await addButton.click()
          await this.page.waitForTimeout(200)
          const newOptionInputs = this.page.locator('input[placeholder*="Option"]')
          await newOptionInputs.nth(i).fill(options[i])
        }
      }
    }
    
    // Toggle showResultsImmediately if provided
    if (settings?.showResultsImmediately !== undefined) {
      const toggle = this.page.locator('button[role="switch"]').first()
      const currentState = await toggle.getAttribute('aria-checked')
      const isCurrentlyOn = currentState === 'true'
      
      if (isCurrentlyOn !== settings.showResultsImmediately) {
        await toggle.click()
      }
    }
    
    // Submit the form
    const submitButton = this.page.locator('button:has-text("Create Poll")').last()
    await submitButton.click()
    
    // Wait for dialog to close
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Delete a poll by its title
   */
  async deletePoll(pollTitle: string) {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const deleteButton = pollCard.locator('button[aria-label*="Delete"]').first()
    
    await deleteButton.click()
    
    // Confirm deletion
    const confirmButton = this.page.locator('button:has-text("Delete")').last()
    await confirmButton.click()
    
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Toggle poll active status
   */
  async toggleActive(pollTitle: string) {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const toggleButton = pollCard.locator('button[role="switch"]').first()
    
    await toggleButton.click()
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Get poll count
   */
  async getPollCount(): Promise<number> {
    const polls = await this.page.locator('[data-testid="poll-card"]').count()
    return polls
  }
  
  /**
   * Check if poll exists
   */
  async hasPoll(pollTitle: string): Promise<boolean> {
    const count = await this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`).count()
    return count > 0
  }
  
  /**
   * Check if poll is active
   */
  async isPollActive(pollTitle: string): Promise<boolean> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const toggle = pollCard.locator('button[role="switch"]').first()
    const isActive = await toggle.getAttribute('aria-checked')
    return isActive === 'true'
  }
  
  /**
   * Get poll total votes
   */
  async getPollTotalVotes(pollTitle: string): Promise<number> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const voteText = await pollCard.locator('[data-testid="total-votes"]').textContent()
    const match = voteText?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
  
  /**
   * Approve a pending poll (for moderation)
   */
  async approvePoll(pollTitle: string) {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const approveButton = pollCard.locator('button:has-text("Approve")').first()
    
    await approveButton.click()
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Reject a pending poll (for moderation)
   */
  async rejectPoll(pollTitle: string) {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const rejectButton = pollCard.locator('button:has-text("Reject")').first()
    
    await rejectButton.click()
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Check poll status badge
   */
  async getPollStatus(pollTitle: string): Promise<string> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const badge = pollCard.locator('[data-testid="status-badge"]').first()
    const statusText = await badge.textContent()
    return statusText?.trim().toLowerCase() || ''
  }
  
  /**
   * Check if poll is created by a participant
   */
  async isPollCreatedByParticipant(pollTitle: string): Promise<boolean> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const badge = pollCard.locator('[data-testid="creator-badge"]').first()
    const creatorText = await badge.textContent()
    return creatorText?.toLowerCase().includes('participant') || false
  }
}

