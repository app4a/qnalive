# QnALive - Interactive Event Platform

A Slido-like interactive event platform built with Next.js 14, TypeScript, PostgreSQL, and Socket.io for real-time audience engagement through Q&A and polls.

## Features

- **Live Q&A**: Collect, upvote, and answer audience questions in real-time
- **Live Polls**: Create instant polls with multiple choice, yes/no, rating, and word cloud options
- **Real-time Updates**: WebSocket-powered instant updates for all participants
- **Moderation**: Optional question moderation and approval workflow
- **Anonymous Support**: Allow anonymous participation or require authentication
- **Event Management**: Create and manage multiple events with unique codes
- **Analytics**: Track participant count, questions, and poll responses
- **OAuth Support**: Sign in with Google, GitHub, or email/password

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: Radix UI (shadcn/ui)
- **Icons**: Lucide React
- **Real-time**: Socket.io-client

### Backend
- **Runtime**: Node.js 20+ LTS
- **Framework**: Next.js API Routes
- **Language**: TypeScript 5.0+
- **Real-time**: Socket.io 4.7+
- **Database ORM**: Prisma 5.0+
- **Authentication**: NextAuth.js v5

### Database
- **Database**: PostgreSQL 15+
- **Hosting**: Supabase (recommended) or local PostgreSQL

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- npm 9+ or yarn
- PostgreSQL 15+ database (local or Supabase)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd qnalive
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy the example file and edit with your actual values:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/qnalive"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

**Why .env.local?** It's automatically ignored by git and overrides `.env` values. See [QUICK_START.md](./QUICK_START.md) for details.

To generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

4. **Set up the database**

Push the Prisma schema to your database:
```bash
npm run db:push
```

Or create a migration:
```bash
npm run db:migrate
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create a new migration
npm run db:migrate

# Push schema changes without migrations (dev only)
npm run db:push
```

## Project Structure

```
qnalive/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── events/               # Event management
│   │   └── socketio/             # Socket.io handler
│   ├── auth/                     # Auth pages (signin, signup)
│   ├── dashboard/                # User dashboard
│   │   └── events/               # Event management pages
│   ├── join/                     # Join event by code
│   ├── e/[code]/                 # Participant view (short link)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/                   # React components
│   └── ui/                       # UI components (shadcn/ui)
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Auth configuration
│   ├── prisma.ts                 # Prisma client
│   ├── socket.ts                 # Socket.io server
│   ├── socket-client.ts          # Socket.io client
│   └── utils.ts                  # Utility functions
├── prisma/                       # Prisma schema and migrations
│   └── schema.prisma             # Database schema
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Shared types
├── server.ts                     # Custom server with Socket.io
├── auth.ts                       # NextAuth configuration
├── auth.config.ts                # NextAuth configuration
├── middleware.ts                 # NextAuth middleware
└── package.json                  # Dependencies and scripts
```

## Usage

### Creating an Event

1. Sign up or sign in at `/auth/signup` or `/auth/signin`
2. Go to your dashboard at `/dashboard`
3. Click "New Event" or visit `/dashboard/events/new`
4. Fill in event details and configure settings
5. Share the 6-character event code with your audience

### Joining an Event

1. Visit `/join` or the landing page
2. Enter the 6-character event code
3. Start submitting questions and voting on polls

### Managing an Event

- **View participants**: Track how many people have joined
- **Moderate questions**: Approve, reject, or archive questions
- **Create polls**: Add live polls during your event
- **Mark answered**: Flag questions that have been addressed
- **Toggle status**: Activate or deactivate your event

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signup` - Sign up
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### Events
- `POST /api/events` - Create event
- `GET /api/events` - List user's events
- `GET /api/events/[eventId]` - Get event details
- `PUT /api/events/[eventId]` - Update event
- `DELETE /api/events/[eventId]` - Delete event
- `POST /api/events/join` - Join event by code
- `GET /api/events/code/[code]` - Get event by code

### Questions
- `POST /api/events/[eventId]/questions` - Submit question
- `GET /api/events/[eventId]/questions` - List questions
- `PUT /api/events/[eventId]/questions/[id]` - Update question
- `DELETE /api/events/[eventId]/questions/[id]` - Delete question
- `POST /api/events/[eventId]/questions/[id]/upvote` - Upvote question
- `DELETE /api/events/[eventId]/questions/[id]/upvote` - Remove upvote

### Polls
- `POST /api/events/[eventId]/polls` - Create poll
- `GET /api/events/[eventId]/polls` - List polls
- `GET /api/events/[eventId]/polls/[id]` - Get poll details
- `DELETE /api/events/[eventId]/polls/[id]` - Delete poll
- `POST /api/events/[eventId]/polls/[id]/vote` - Submit vote
- `PATCH /api/events/[eventId]/polls/[id]/status` - Toggle poll status

## WebSocket Events

### Client → Server
- `event:join` - Join event room
- `event:leave` - Leave event room
- `question:submit` - Submit question
- `question:upvote` - Upvote question
- `question:update` - Update question (admin)
- `question:delete` - Delete question (admin)
- `poll:create` - Create poll
- `poll:vote` - Vote on poll
- `poll:status` - Change poll status

### Server → Client
- `question:new` - New question received
- `question:upvoted` - Question upvoted
- `question:updated` - Question updated
- `question:deleted` - Question deleted
- `poll:new` - New poll created
- `poll:voted` - Poll vote received
- `poll:status` - Poll status changed
- `event:participants` - Participant count updated

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |
| `GITHUB_ID` | GitHub OAuth app ID | No |
| `GITHUB_SECRET` | GitHub OAuth app secret | No |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL | Yes |

## Deployment

### Vercel (Recommended for Next.js)

Note: Vercel's serverless architecture doesn't support long-lived WebSocket connections. You'll need to deploy Socket.io separately.

1. Deploy Next.js app to Vercel
2. Deploy Socket.io server to a platform that supports WebSockets (Railway, Render, etc.)
3. Update `NEXT_PUBLIC_SOCKET_URL` to point to your Socket.io server

### Docker

```dockerfile
# Dockerfile example
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Traditional Hosting

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Development

### Code Style

- ESLint and Prettier configured
- TypeScript strict mode enabled
- Run linting: `npm run lint`
- Type checking: `npm run type-check`

### Database Changes

1. Modify `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Or push directly: `npm run db:push`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in `REQUIREMENTS.md`

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Authentication with [NextAuth.js](https://next-auth.js.org/)
- Database with [Prisma](https://www.prisma.io/)
- Real-time with [Socket.io](https://socket.io/)

---

Made with ❤️ using Next.js, TypeScript, and PostgreSQL

