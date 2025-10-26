# Slido-like Interactive Event Platform - Development Requirements Document

## Project Overview
**Project Name:** QnALive
**Version:** 1.0.0 MVP
**Primary Technology:** React 18 + TypeScript, Next.js 14+, PostgreSQL, Socket.io

---

## 1. TECHNICAL STACK REQUIREMENTS

### Frontend
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript 5.0+ (strict mode enabled)
- **Styling:** Tailwind CSS 3.4+
- **State Management:** Zustand or React Context API
- **Real-time:** Socket.io-client 4.6+
- **Forms:** React Hook Form + Zod validation
- **UI Components:** Radix UI or shadcn/ui
- **Icons:** Lucide React or Heroicons
- **Date Handling:** date-fns
- **HTTP Client:** Axios or native fetch with custom wrapper

### Backend
- **Runtime:** Node.js 20+ LTS
- **Framework:** Next.js API Routes (App Router)
- **Language:** TypeScript 5.0+
- **Real-time:** Socket.io 4.6+
- **Database ORM:** Prisma 5.0+
- **Authentication:** NextAuth.js v5 (Auth.js)
- **Validation:** Zod
- **File Upload:** uploadthing or AWS S3 SDK

### Database
- **Primary DB:** PostgreSQL 15+
- **Hosting:** Supabase 
- **Migrations:** Prisma Migrate
- **Connection Pooling:** PgBouncer (if needed at scale)

### Infrastructure
- **Hosting:** Vercel
- **Database:** Supabase
- **File Storage:** Supabase Storage 
- **Environment Variables:** Vercel Environment Variables
- **CI/CD:** GitHub Actions + Vercel automatic deployments

### Monitoring & Analytics
- **Error Tracking:** Sentry
- **Analytics:** Vercel Analytics 
- **Performance:** Vercel Speed Insights
- **Logging:** Console with structured logging

---

## 2. DATABASE SCHEMA (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User authentication and profile
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  passwordHash  String?
  
  // OAuth fields
  accounts      Account[]
  sessions      Session[]
  
  // User relationships
  events        Event[]
  questions     Question[]
  questionUpvotes QuestionUpvote[]
  polls         Poll[]
  pollVotes     PollVote[]
  eventParticipations EventParticipant[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}

// NextAuth.js required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

// Main event/presentation entity
model Event {
  id          String   @id @default(cuid())
  ownerId     String
  title       String   @db.VarChar(255)
  description String?  @db.Text
  eventCode   String   @unique @db.VarChar(10)
  
  startTime   DateTime?
  endTime     DateTime?
  isActive    Boolean  @default(true)
  
  // Settings stored as JSON
  settings    Json     @default("{}") // {allowAnonymous, moderationEnabled, showResults, etc}
  
  // Relationships
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  questions   Question[]
  polls       Poll[]
  participants EventParticipant[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventCode])
  @@index([ownerId])
  @@index([isActive])
}

// Q&A Questions
model Question {
  id          String   @id @default(cuid())
  eventId     String
  authorId    String?
  authorName  String?  @db.VarChar(100) // For anonymous users
  content     String   @db.Text
  
  upvotesCount Int     @default(0)
  isAnswered   Boolean @default(false)
  isArchived   Boolean @default(false)
  status       QuestionStatus @default(APPROVED)
  
  // Relationships
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  author      User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
  upvotes     QuestionUpvote[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId, createdAt(sort: Desc)])
  @@index([eventId, upvotesCount(sort: Desc)])
  @@index([eventId, status])
}

enum QuestionStatus {
  PENDING
  APPROVED
  REJECTED
}

// Question upvotes tracking
model QuestionUpvote {
  id          String   @id @default(cuid())
  questionId  String
  userId      String?
  sessionId   String?  @db.VarChar(255) // For anonymous users
  
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  
  @@unique([questionId, userId])
  @@unique([questionId, sessionId])
  @@index([questionId])
}

// Live polls
model Poll {
  id          String   @id @default(cuid())
  eventId     String
  createdById String
  title       String   @db.VarChar(255)
  type        PollType @default(MULTIPLE_CHOICE)
  
  isActive    Boolean  @default(true)
  allowMultipleVotes Boolean @default(false)
  settings    Json     @default("{}") // {showResultsImmediately, etc}
  
  // Relationships
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdBy   User     @relation(fields: [createdById], references: [id])
  options     PollOption[]
  votes       PollVote[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId])
  @@index([eventId, isActive])
}

enum PollType {
  MULTIPLE_CHOICE
  YES_NO
  RATING
  WORD_CLOUD
}

// Poll answer options
model PollOption {
  id          String   @id @default(cuid())
  pollId      String
  optionText  String   @db.VarChar(255)
  displayOrder Int
  votesCount  Int      @default(0)
  
  poll        Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes       PollVote[]
  
  createdAt   DateTime @default(now())
  
  @@index([pollId, displayOrder])
}

// Poll votes tracking
model PollVote {
  id          String   @id @default(cuid())
  pollId      String
  optionId    String
  userId      String?
  sessionId   String?  @db.VarChar(255)
  
  poll        Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  option      PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  
  @@index([pollId])
  @@index([optionId])
}

// Event participants tracking
model EventParticipant {
  id          String   @id @default(cuid())
  eventId     String
  userId      String?
  sessionId   String?  @db.VarChar(255)
  
  joinedAt    DateTime @default(now())
  lastActive  DateTime @default(now())
  
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([eventId, userId])
  @@unique([eventId, sessionId])
  @@index([eventId])
}
```

---

## 3. API ENDPOINTS SPECIFICATION

### Authentication Endpoints (NextAuth.js)
```
POST   /api/auth/signin           - Sign in
POST   /api/auth/signup           - Sign up new user
POST   /api/auth/signout          - Sign out
GET    /api/auth/session          - Get current session
GET    /api/auth/callback/[provider] - OAuth callback
```

### Event Management
```
POST   /api/events                - Create new event
GET    /api/events                - List user's events
GET    /api/events/[eventId]      - Get event details
PUT    /api/events/[eventId]      - Update event
DELETE /api/events/[eventId]      - Delete event
POST   /api/events/join           - Join event by code
GET    /api/events/code/[code]    - Get event by code
```

### Questions
```
POST   /api/events/[eventId]/questions            - Submit question
GET    /api/events/[eventId]/questions            - List questions
PUT    /api/events/[eventId]/questions/[id]       - Update question (admin)
DELETE /api/events/[eventId]/questions/[id]       - Delete question (admin)
POST   /api/events/[eventId]/questions/[id]/upvote - Upvote question
DELETE /api/events/[eventId]/questions/[id]/upvote - Remove upvote
PATCH  /api/events/[eventId]/questions/[id]/answer - Mark as answered
PATCH  /api/events/[eventId]/questions/[id]/archive - Archive question
```

### Polls
```
POST   /api/events/[eventId]/polls           - Create poll
GET    /api/events/[eventId]/polls           - List polls
GET    /api/events/[eventId]/polls/[id]      - Get poll details
PUT    /api/events/[eventId]/polls/[id]      - Update poll
DELETE /api/events/[eventId]/polls/[id]      - Delete poll
POST   /api/events/[eventId]/polls/[id]/vote - Submit vote
PATCH  /api/events/[eventId]/polls/[id]/status - Activate/deactivate poll
```

### Analytics & Export
```
GET    /api/events/[eventId]/analytics       - Get event analytics
GET    /api/events/[eventId]/export          - Export data (CSV)
```

---

## 4. WEBSOCKET EVENTS SPECIFICATION

### Client -> Server Events
```typescript
// Join event room
socket.emit('event:join', { eventId: string, sessionId: string })

// Leave event room
socket.emit('event:leave', { eventId: string })

// Submit question (emits to all in room)
socket.emit('question:submit', { eventId: string, content: string, authorName?: string })

// Upvote question (emits to all in room)
socket.emit('question:upvote', { eventId: string, questionId: string })

// Submit poll vote (emits to all in room)
socket.emit('poll:vote', { eventId: string, pollId: string, optionId: string })
```

### Server -> Client Events
```typescript
// New question received
socket.on('question:new', (data: { question: Question }) => {})

// Question upvoted
socket.on('question:upvoted', (data: { questionId: string, upvotesCount: number }) => {})

// Question updated by admin
socket.on('question:updated', (data: { question: Question }) => {})

// Question deleted
socket.on('question:deleted', (data: { questionId: string }) => {})

// New poll created
socket.on('poll:new', (data: { poll: Poll }) => {})

// Poll activated/deactivated
socket.on('poll:status', (data: { pollId: string, isActive: boolean }) => {})

// Poll vote received
socket.on('poll:voted', (data: { pollId: string, optionId: string, votesCount: number }) => {})

// Participant count updated
socket.on('event:participants', (data: { count: number }) => {})
```

---

## 5. COMPONENT STRUCTURE

### Page Components (App Router)
```
/app
  /page.tsx                          - Landing page
  /auth
    /signin/page.tsx                 - Sign in page
    /signup/page.tsx                 - Sign up page
  /dashboard
    /page.tsx                        - User dashboard (event list)
    /events
      /new/page.tsx                  - Create event
      /[eventId]/page.tsx            - Event admin view
      /[eventId]/display/page.tsx    - Public display view
  /join
    /[code]/page.tsx                 - Join event by code
  /e/[code]
    /page.tsx                        - Participant view (short link)
```

### Shared Components
```
/components
  /ui                                - Base UI components (shadcn/ui)
    /button.tsx
    /input.tsx
    /card.tsx
    /dialog.tsx
    /dropdown-menu.tsx
    /tabs.tsx
    /toast.tsx
  /auth
    /signin-form.tsx
    /signup-form.tsx
  /events
    /event-card.tsx                  - Event list item
    /event-form.tsx                  - Create/edit event form
    /event-settings.tsx              - Event settings panel
  /questions
    /question-list.tsx               - List of questions
    /question-item.tsx               - Individual question card
    /question-form.tsx               - Submit question form
    /question-moderation.tsx         - Admin moderation panel
  /polls
    /poll-list.tsx                   - List of polls
    /poll-creator.tsx                - Create poll form
    /poll-card.tsx                   - Individual poll display
    /poll-results.tsx                - Results visualization
  /layout
    /header.tsx
    /sidebar.tsx
    /footer.tsx
```

---

## 6. TYPE DEFINITIONS

```typescript
// types/index.ts

import { User, Event, Question, Poll, PollOption } from '@prisma/client'

export type EventWithRelations = Event & {
  owner: User
  questions: QuestionWithAuthor[]
  polls: PollWithOptions[]
  _count: {
    participants: number
    questions: number
    polls: number
  }
}

export type QuestionWithAuthor = Question & {
  author?: Pick<User, 'id' | 'name' | 'image'>
  upvotes: { userId?: string; sessionId?: string }[]
  _count: {
    upvotes: number
  }
}

export type PollWithOptions = Poll & {
  options: (PollOption & {
    _count: { votes: number }
  })[]
  votes: { userId?: string; sessionId?: string }[]
}

export interface EventSettings {
  allowAnonymous: boolean
  moderationEnabled: boolean
  showResultsImmediately: boolean
  allowParticipantPolls: boolean
}

export interface CreateEventInput {
  title: string
  description?: string
  startTime?: Date
  endTime?: Date
  settings?: Partial<EventSettings>
}

export interface CreateQuestionInput {
  eventId: string
  content: string
  authorName?: string
}

export interface CreatePollInput {
  eventId: string
  title: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'RATING' | 'WORD_CLOUD'
  options: string[]
  allowMultipleVotes?: boolean
}

export interface VotePollInput {
  pollId: string
  optionId: string
}
```

---

## 7. UTILITY FUNCTIONS

```typescript
// lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate unique event code
export function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate or get session ID for anonymous users
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
```

---

## 8. AUTHENTICATION CONFIGURATION

```typescript
// lib/auth.ts

import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials")
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        return user
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}
```

---

## 9. SOCKET.IO IMPLEMENTATION

```typescript
// lib/socket.ts (Server-side)

import { Server } from 'socket.io'
import { prisma } from '@/lib/prisma'

export function initializeSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join event room
    socket.on('event:join', async ({ eventId, sessionId }) => {
      socket.join(eventId)
      
      // Track participant
      await prisma.eventParticipant.upsert({
        where: {
          eventId_sessionId: { eventId, sessionId }
        },
        create: {
          eventId,
          sessionId,
          lastActive: new Date()
        },
        update: {
          lastActive: new Date()
        }
      })

      // Send participant count
      const count = await prisma.eventParticipant.count({
        where: { eventId }
      })
      io.to(eventId).emit('event:participants', { count })
    })

    // Handle question submission
    socket.on('question:submit', async (data) => {
      const question = await prisma.question.create({
        data: {
          eventId: data.eventId,
          content: data.content,
          authorName: data.authorName,
          authorId: data.userId
        },
        include: {
          author: {
            select: { id: true, name: true, image: true }
          }
        }
      })

      io.to(data.eventId).emit('question:new', { question })
    })

    // Handle upvote
    socket.on('question:upvote', async (data) => {
      await prisma.questionUpvote.create({
        data: {
          questionId: data.questionId,
          userId: data.userId,
          sessionId: data.sessionId
        }
      })

      const updated = await prisma.question.update({
        where: { id: data.questionId },
        data: { upvotesCount: { increment: 1 } }
      })

      io.to(data.eventId).emit('question:upvoted', {
        questionId: data.questionId,
        upvotesCount: updated.upvotesCount
      })
    })

    // Handle poll vote
    socket.on('poll:vote', async (data) => {
      await prisma.pollVote.create({
        data: {
          pollId: data.pollId,
          optionId: data.optionId,
          userId: data.userId,
          sessionId: data.sessionId
        }
      })

      await prisma.pollOption.update({
        where: { id: data.optionId },
        data: { votesCount: { increment: 1 } }
      })

      const option = await prisma.pollOption.findUnique({
        where: { id: data.optionId }
      })

      io.to(data.eventId).emit('poll:voted', {
        pollId: data.pollId,
        optionId: data.optionId,
        votesCount: option?.votesCount
      })
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}
```

---

## 10. ENVIRONMENT VARIABLES

```env
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/eventdb"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# File Storage (if using AWS S3)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
```

---

## 11. KEY FEATURE IMPLEMENTATION GUIDELINES

### A. Event Code Join Flow
1. User enters 6-character code on /join page
2. API validates code exists and event is active
3. Generate or retrieve sessionId from localStorage
4. Create EventParticipant record
5. Redirect to /e/[code] participant view
6. Establish WebSocket connection to event room

### B. Real-time Question Updates
1. User submits question via form
2. Validate content (min 10 chars, max 500 chars)
3. Create Question record in database
4. Emit 'question:submit' socket event
5. Server broadcasts 'question:new' to all participants
6. All clients update UI with new question
7. Implement optimistic UI updates for instant feedback

### C. Upvoting System
1. User clicks upvote button
2. Check if already upvoted (prevent duplicates)
3. Optimistically update UI
4. Send upvote request to API
5. Create QuestionUpvote record
6. Increment question upvotesCount
7. Broadcast updated count via WebSocket
8. All clients update upvote count

### D. Live Poll Voting
1. Admin creates poll with options
2. Broadcast poll:new to all participants
3. Participants see poll appear in real-time
4. User selects option and clicks vote
5. Validate: one vote per poll (unless allowMultipleVotes)
6. Create PollVote record
7. Increment PollOption votesCount
8. Broadcast poll:voted with updated counts
9. All clients update results chart/bars

### E. Admin Moderation
1. Admin sees all questions in pending/approved/rejected tabs
2. Can approve, reject, archive, or mark as answered
3. Actions update Question.status field
4. Broadcast question:updated to participants
5. Participants see status changes in real-time
6. Rejected questions hidden from participant view

---

## 12. TESTING REQUIREMENTS

### Unit Tests
- Utility functions (generateEventCode, getSessionId)
- Validation schemas (Zod schemas)
- Component logic (custom hooks)

### Integration Tests
- API endpoints (create event, submit question, vote)
- Database operations (Prisma queries)
- Authentication flows

### E2E Tests (Playwright)
- Complete user journey: signup → create event → join → submit question → upvote
- Admin moderation workflow
- Poll creation and voting
- Real-time updates verification

---

## 13. PERFORMANCE REQUIREMENTS

- **Page Load Time:** < 2 seconds (Lighthouse score > 90)
- **API Response Time:** < 200ms for read operations, < 500ms for writes
- **WebSocket Latency:** < 100ms for message delivery
- **Concurrent Users:** Support 500+ simultaneous connections per event
- **Database Queries:** All queries < 100ms with proper indexing
- **Bundle Size:** Initial JS bundle < 200KB gzipped

---

## 14. SECURITY REQUIREMENTS

- **Authentication:** Secure password hashing with bcrypt (cost factor 12)
- **Session Management:** HTTP-only cookies, secure flag in production
- **CSRF Protection:** Built-in NextAuth CSRF tokens
- **Input Validation:** All user inputs validated with Zod on both client and server
- **SQL Injection Prevention:** Use Prisma ORM (prevents SQL injection by design)
- **XSS Prevention:** React's built-in XSS protection, sanitize user content
- **Rate Limiting:** Implement rate limiting on API routes (10 requests/min per IP for anonymous, 100/min for authenticated)
- **CORS:** Configure strict CORS policies
- **Environment Variables:** Never expose secrets to client

---

## 15. ACCESSIBILITY REQUIREMENTS

- **WCAG 2.1 Level AA Compliance**
- **Keyboard Navigation:** All interactive elements accessible via keyboard
- **Screen Reader Support:** Proper ARIA labels and semantic HTML
- **Color Contrast:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators:** Visible focus states on all interactive elements
- **Alt Text:** All images have descriptive alt attributes
- **Form Labels:** All form inputs have associated labels
- **Mobile Friendly:** All screens are responsive and mobile friendly

---

## 16. DEPLOYMENT CHECKLIST

### Pre-deployment
- [ ] All environment variables configured in Vercel
- [ ] Database migrations run on production database
- [ ] OAuth providers configured with production URLs
- [ ] Sentry error tracking configured
- [ ] Analytics tracking configured
- [ ] Custom domain configured (if applicable)

### Post-deployment
- [ ] Verify all API endpoints respond correctly
- [ ] Test WebSocket connections on production
- [ ] Verify OAuth login flows work
- [ ] Check database connection and query performance
- [ ] Verify email notifications (if implemented)
- [ ] Load test with expected traffic
- [ ] Set up monitoring alerts

---

## 17. DEVELOPMENT WORKFLOW

1. **Branch Strategy:** GitFlow (main, develop, feature/*, hotfix/*)
2. **Commit Convention:** Conventional Commits (feat:, fix:, docs:, etc.)
3. **Code Review:** All PRs require approval before merge
4. **CI/CD:** Automatic Vercel preview deployments for all PRs
5. **Testing:** Run tests before merging (npm run test)
6. **Linting:** ESLint + Prettier (npm run lint)
7. **Type Checking:** TypeScript strict mode (npm run type-check)

---

## 18. SPRINT BREAKDOWN

### Sprint 1: Foundation
- Set up Next.js project with TypeScript
- Configure Prisma with PostgreSQL
- Implement authentication (NextAuth.js)
- Build event creation and management
- Implement join by code functionality

### Sprint 2: Q&A Core
- Build question submission form
- Implement question list display
- Add upvoting functionality
- Set up Socket.io for real-time updates
- Implement real-time question broadcasting

### Sprint 3: Polls & Moderation
- Build poll creation interface
- Implement poll voting system
- Create poll results visualization
- Build admin moderation panel
- Add question status management

### Sprint 4: Polish & Export
- Implement CSV export functionality
- Build basic analytics dashboard
- Mobile responsive refinements
- Performance optimization
- Bug fixes and testing

---

## 19. CURSOR-SPECIFIC INSTRUCTIONS

When implementing features:
1. Always use TypeScript with strict type checking
2. Follow Next.js 14 App Router conventions
3. Use Prisma for all database operations
4. Implement proper error handling with try-catch blocks
5. Add loading and error states to all async operations
6. Use React Server Components where possible
7. Implement optimistic UI updates for better UX
8. Add proper TypeScript types for all props and function parameters
9. Use Zod for runtime validation
10. Follow the component structure defined in Section 5
11. Implement proper accessibility (ARIA labels, semantic HTML)
12. Add comprehensive JSDoc comments for complex functions
13. Use the utility functions from lib/utils.ts
14. Implement proper error logging with Sentry integration

---

## 20. EXAMPLE IMPLEMENTATION: Question Submission

```typescript
// app/api/events/[eventId]/questions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const questionSchema = z.object({
  content: z.string().min(10).max(500),
  authorName: z.string().optional()
})

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const validatedData = questionSchema.parse(body)

    // Verify event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: params.eventId }
    })

    if (!event || !event.isActive) {
      return NextResponse.json(
        { error: 'Event not found or inactive' },
        { status: 404 }
      )
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        eventId: params.eventId,
        content: validatedData.content,
        authorId: session?.user?.id,
        authorName: validatedData.authorName || session?.user?.name,
        status: event.settings.moderationEnabled ? 'PENDING' : 'APPROVED'
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Failed to create question:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```