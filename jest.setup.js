// Jest setup for integration tests

// Load test environment variables
require('dotenv').config({ path: '.env.test' })

// Ensure required environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set in .env.test')
}

// Override with test-specific values
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// Increase timeout for integration tests
jest.setTimeout(30000)

