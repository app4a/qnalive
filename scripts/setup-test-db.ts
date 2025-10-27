#!/usr/bin/env ts-node

/**
 * Test Database Setup Script
 * 
 * This script:
 * 1. Resets the test database to a clean state
 * 2. Applies all Prisma migrations
 * 3. Seeds the database with test fixtures
 * 
 * Usage:
 *   ts-node scripts/setup-test-db.ts
 *   or
 *   npm run test:setup-db
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🗑️  Resetting test database...')
  
  try {
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
    
    console.log('✅ Database reset complete')
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  }
}

async function runMigrations() {
  console.log('🔄 Running Prisma migrations...')
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL },
    })
    console.log('✅ Migrations complete')
  } catch (error) {
    console.error('❌ Error running migrations:', error)
    throw error
  }
}

async function seedTestData() {
  console.log('🌱 Seeding test data...')
  
  try {
    // Create test users
    const testUser1 = await prisma.user.create({
      data: {
        email: 'test1@example.com',
        name: 'Test User 1',
        emailVerified: new Date(),
      },
    })
    
    const testUser2 = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        name: 'Test User 2',
        emailVerified: new Date(),
      },
    })
    
    const testUser3 = await prisma.user.create({
      data: {
        email: 'moderator@example.com',
        name: 'Test Moderator',
        emailVerified: new Date(),
      },
    })
    
    console.log(`✅ Created ${3} test users`)
    console.log(`   - ${testUser1.email}`)
    console.log(`   - ${testUser2.email}`)
    console.log(`   - ${testUser3.email}`)
    
    // Create test event
    const testEvent = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'A test event for automated testing',
        eventCode: 'TEST001',
        ownerId: testUser1.id,
        isActive: true,
        settings: {
          allowAnonymous: true,
          moderationEnabled: false,
          allowParticipantPolls: false,
          showResultsImmediately: true,
        },
      },
    })
    
    console.log(`✅ Created test event: ${testEvent.title} (${testEvent.eventCode})`)
    
    console.log('✅ Test data seeding complete')
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Setting up test database...\n')
  
  try {
    await resetDatabase()
    await runMigrations()
    await seedTestData()
    
    console.log('\n✅ Test database setup complete!')
  } catch (error) {
    console.error('\n❌ Test database setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { resetDatabase, runMigrations, seedTestData }

