/**
 * Event Page Object
 * 
 * Page Object Model for the event participant page (/e/{code})
 */

import { Page, Locator, expect } from '@playwright/test'

export class EventPage {
  readonly page: Page
  readonly questionInput: Locator
  readonly nameInput: Locator
  readonly submitButton: Locator
  readonly questionsList: Locator
  readonly pollsList: Locator
  
  constructor(page: Page) {
    this.page = page
    this.questionInput = page.locator('textarea#question')
    this.nameInput = page.locator('input#authorName')
    this.submitButton = page.locator('button[type="submit"]:has-text("Submit Question")')
    this.questionsList = page.locator('div').filter({ hasText: 'Questions (' })
    this.pollsList = page.locator('div').filter({ hasText: 'Active Polls' })
  }
  
  /**
   * Navigate to the event page
   */
  async goto(eventCode: string) {
    await this.page.goto(`/e/${eventCode}`)
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Submit a question
   */
  async submitQuestion(content: string, name?: string) {
    // Wait for the question input to be visible
    await this.questionInput.waitFor({ state: 'visible', timeout: 10000 })
    await this.questionInput.fill(content)
    
    if (name) {
      // Check if name input is visible (for anonymous users)
      const nameVisible = await this.nameInput.isVisible().catch(() => false)
      if (nameVisible) {
        await this.nameInput.fill(name)
      }
    }
    
    await this.submitButton.click()
    
    // Wait for submission to complete
    await this.page.waitForTimeout(1000)
  }
  
  /**
   * Upvote a question by its content
   */
  async upvoteQuestion(questionContent: string) {
    const questionCard = this.page.locator(`[data-testid="question-card"]:has-text("${questionContent}")`)
    const upvoteButton = questionCard.locator('button:has-text("👍")').first()
    
    await upvoteButton.click()
    await this.page.waitForTimeout(300)
  }
  
  /**
   * Delete a question by its content
   */
  async deleteQuestion(questionContent: string) {
    const questionCard = this.page.locator(`[data-testid="question-card"]:has-text("${questionContent}")`)
    const deleteButton = questionCard.locator('button[aria-label*="Delete"]').first()
    
    await deleteButton.click()
    
    // Confirm deletion in dialog
    const confirmButton = this.page.locator('button:has-text("Delete")').last()
    await confirmButton.click()
    
    await this.page.waitForTimeout(500)
  }
  
  /**
   * Get question count
   */
  async getQuestionCount(): Promise<number> {
    // Questions are displayed in Card components within the questions section
    // Wait a bit for any updates
    await this.page.waitForTimeout(500)
    // Count visible question cards - they contain upvote buttons and question content
    const questions = await this.page.locator('button:has-text("👍"), button[aria-label*="Upvote"]').count()
    return questions
  }
  
  /**
   * Get upvote count for a question
   */
  async getQuestionUpvotes(questionContent: string): Promise<number> {
    const questionCard = this.page.locator(`[data-testid="question-card"]:has-text("${questionContent}")`)
    const upvoteText = await questionCard.locator('[data-testid="upvote-count"]').first().textContent()
    return parseInt(upvoteText || '0', 10)
  }
  
  /**
   * Check if a question exists
   */
  async hasQuestion(questionContent: string): Promise<boolean> {
    const count = await this.page.locator(`[data-testid="question-card"]:has-text("${questionContent}")`).count()
    return count > 0
  }
  
  /**
   * Vote on a poll
   */
  async votePoll(pollTitle: string, optionText: string) {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const optionButton = pollCard.locator(`button:has-text("${optionText}")`).first()
    
    await optionButton.click()
    await this.page.waitForTimeout(300)
  }
  
  /**
   * Unvote a poll (click the same option again)
   */
  async unvotePoll(pollTitle: string, optionText: string) {
    await this.votePoll(pollTitle, optionText)
  }
  
  /**
   * Get poll option vote count
   */
  async getPollOptionVotes(pollTitle: string, optionText: string): Promise<number> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const option = pollCard.locator(`[data-testid="poll-option"]:has-text("${optionText}")`).first()
    const voteText = await option.locator('[data-testid="vote-count"]').textContent()
    return parseInt(voteText || '0', 10)
  }
  
  /**
   * Check if user has voted for an option
   */
  async hasVotedFor(pollTitle: string, optionText: string): Promise<boolean> {
    const pollCard = this.page.locator(`[data-testid="poll-card"]:has-text("${pollTitle}")`)
    const option = pollCard.locator(`button:has-text("${optionText}")`).first()
    
    // Check if the button has a highlighted/selected state
    const classList = await option.getAttribute('class')
    return classList?.includes('bg-primary') || classList?.includes('border-primary') || false
  }
  
  /**
   * Get participant count
   */
  async getParticipantCount(): Promise<number> {
    const countText = await this.page.locator('[data-testid="participant-count"]').textContent()
    const match = countText?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
  
  /**
   * Check if signed in
   */
  async isSignedIn(): Promise<boolean> {
    const signInButton = await this.page.locator('button:has-text("Sign In")').count()
    return signInButton === 0
  }
  
  /**
   * Click sign in button
   */
  async clickSignIn() {
    await this.page.locator('button:has-text("Sign In")').click()
  }
  
  /**
   * Get current sort order
   */
  async getSortOrder(): Promise<'latest' | 'votes'> {
    const sortButton = this.page.locator('[data-testid="sort-select"]')
    const value = await sortButton.inputValue()
    return value === 'votes' ? 'votes' : 'latest'
  }
  
  /**
   * Change sort order
   */
  async setSortOrder(order: 'latest' | 'votes') {
    const sortButton = this.page.locator('[data-testid="sort-select"]')
    await sortButton.selectOption(order)
    await this.page.waitForTimeout(300)
  }
}

