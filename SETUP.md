# QnALive Setup Guide

This guide will walk you through setting up QnALive locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** LTS - [Download](https://nodejs.org/)
- **npm 9+** (comes with Node.js) or yarn
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/) or use [Supabase](https://supabase.com/)
- **Git** - [Download](https://git-scm.com/)

## Step 1: Clone and Install

```bash
# Clone the repository
cd qnalive

# Install dependencies
npm install
```

## Step 2: Set Up Database

### Option A: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE qnalive;

# Create user (optional)
CREATE USER qnalive_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE qnalive TO qnalive_user;
```

### Option B: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com/) and create an account
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string (URI format)

## Step 3: Configure Environment Variables

1. Copy the example file to create your local environment configuration:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your actual values:

**Note:** `.env.local` overrides `.env` and is automatically ignored by git. Each developer should have their own `.env.local` with their personal credentials. See [QUICK_START.md](./QUICK_START.md) for a simple explanation or [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for detailed information.

```env
# Required: Update with your actual database URL
DATABASE_URL="postgresql://user:password@localhost:5432/qnalive"

# Required: Generate a secure secret
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Required: URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# Optional: OAuth providers (only if you want social login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"
```

### Generate NEXTAUTH_SECRET

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET` value.

## Step 4: Set Up OAuth (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure consent screen if prompted
6. Set application type to "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
8. Copy Client ID and Client Secret to your `.env.local` file

### GitHub OAuth

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: QnALive Local
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID and generate a Client Secret
6. Add them to your `.env.local` file

## Step 5: Initialize Database

Push the Prisma schema to your database:

```bash
npm run db:push
```

This will create all necessary tables in your database.

Alternatively, you can create a migration:
```bash
npm run db:migrate
```

## Step 6: Run the Application

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Step 7: Create Your First Event

1. Open your browser and go to [http://localhost:3000](http://localhost:3000)
2. Click "Get Started" or "Sign Up"
3. Create an account
4. Click "Create Event" on your dashboard
5. Fill in event details and click "Create Event"
6. Share the 6-character event code with participants
7. Participants can join at [http://localhost:3000/join](http://localhost:3000/join)

## Verification

### Test the Application

1. **Landing Page**: Visit [http://localhost:3000](http://localhost:3000)
2. **Sign Up**: Create an account at `/auth/signup`
3. **Dashboard**: Should redirect to `/dashboard` after signup
4. **Create Event**: Click "New Event" and create a test event
5. **Join Event**: Open incognito/private window, go to `/join`, enter event code
6. **Submit Question**: Ask a question as a participant
7. **Real-time Updates**: Verify question appears in real-time

### Database Verification

Check if tables were created:
```bash
# View database in Prisma Studio
npm run db:studio
```

This will open a web interface at [http://localhost:5555](http://localhost:5555) where you can view your database tables and data.

## Troubleshooting

### Database Connection Issues

**Error: Can't reach database server**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL is correct
- Ensure database exists: `psql -l`
- Check firewall settings

**Error: P3009 - Failed to create database**
- Database already exists (safe to ignore)
- Or run: `npm run db:push` again

### Authentication Issues

**Error: NEXTAUTH_SECRET not set**
- Generate secret: `openssl rand -base64 32`
- Add to .env file

**OAuth not working**
- Verify callback URLs match exactly
- Check Client ID and Secret are correct
- Ensure consent screen is configured

### Socket.io Issues

**Real-time updates not working**
- Check NEXT_PUBLIC_SOCKET_URL is correct
- Verify server is running with custom server (tsx server.ts)
- Check browser console for connection errors

### Port Already in Use

**Error: Port 3000 already in use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Socket.io
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:push          # Push schema to database (no migration)
npm run db:migrate       # Create and run migration
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript types
```

## Production Deployment

For production deployment instructions, see the main [README.md](./README.md#deployment) file.

## Getting Help

- Check [README.md](./README.md) for general documentation
- Review [REQUIREMENTS.md](./REQUIREMENTS.md) for technical details
- Open an issue on GitHub for bugs or questions

## Next Steps

Once your application is running:

1. Customize the landing page branding
2. Configure OAuth providers for easier authentication
3. Set up error tracking (Sentry)
4. Configure analytics (Vercel Analytics)
5. Set up production database (Supabase)
6. Deploy to Vercel or your preferred hosting

Happy coding! 🚀

