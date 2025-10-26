# Environment Variables Setup Guide

This guide explains how to set up environment variables for QnALive in your local development environment.

## Understanding Environment Files in Next.js

Next.js supports multiple environment files with a specific loading order and precedence:

### File Types

1. **`.env.example`** - Template file (committed to git)
   - Contains all required variables with example values
   - Safe to commit (no real credentials)
   - Serves as documentation for required variables

2. **`.env.local.example`** - Template for local file (committed to git)
   - Shows what your local file should look like
   - Contains example credentials format

3. **`.env.local`** - Your actual local credentials (NOT committed to git)
   - Contains your real database URLs, API keys, secrets
   - Overrides values in `.env`
   - **This is what you use for local development**

4. **`.env`** - Default values (optional, usually not committed for security)
   - Can contain defaults for all environments
   - Gets overridden by `.env.local`

### Loading Order & Precedence

Next.js loads environment files in this order (later files override earlier ones):

```
1. .env                           (lowest priority)
2. .env.local                     (overrides .env)
3. .env.development               (only in dev mode)
4. .env.development.local         (overrides all above in dev mode)
   OR
   .env.production                (only in production)
   .env.production.local          (highest priority in production)
```

**In local development (`npm run dev`):**
- Next.js loads: `.env` → `.env.local` → `.env.development` → `.env.development.local`
- **Your `.env.local` values will override any values in `.env`**

**In production (`npm run build && npm start`):**
- Next.js loads: `.env` → `.env.local` → `.env.production` → `.env.production.local`

## Quick Setup for Local Development

### Option 1: Using .env.local (Recommended)

This is the **recommended approach** for local development:

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your real values:**
   ```bash
   nano .env.local
   # or use your preferred editor
   ```

3. **Fill in your actual credentials:**
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/qnalive"
   NEXTAUTH_SECRET="your-actual-secret-here"
   GOOGLE_CLIENT_ID="your-real-google-id"
   # ... etc
   ```

4. **Verify it's ignored by git:**
   ```bash
   git status
   # .env.local should NOT appear in the list
   ```

### Option 2: Using .env

If you prefer to use `.env` for local development:

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your values**

3. **⚠️ IMPORTANT:** Make sure `.env` is in `.gitignore` before committing:
   ```bash
   # Add to .gitignore if not already there
   echo ".env" >> .gitignore
   ```

## Why Use .env.local Instead of .env?

### ✅ Benefits of .env.local

1. **Already in .gitignore** - Next.js convention, automatically ignored
2. **Team-friendly** - Each developer has their own `.env.local` with their credentials
3. **Safe defaults** - You can commit `.env` with safe defaults, developers override in `.env.local`
4. **Clear separation** - `.env` = defaults/template, `.env.local` = your secrets
5. **Best practice** - Follows Next.js official recommendations

### Example Workflow with .env.local

```bash
# Developer 1 (Alice)
DATABASE_URL="postgresql://alice:pass1@localhost:5432/qnalive_dev"

# Developer 2 (Bob)  
DATABASE_URL="postgresql://bob:pass2@localhost:5432/qnalive_local"

# Both have different local databases, no conflicts!
```

## Required Environment Variables

### 1. Database Connection

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

**Examples:**
- Local PostgreSQL: `postgresql://postgres:password@localhost:5432/qnalive`
- Supabase: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Railway: `postgresql://postgres:[PASSWORD]@[HOST].railway.app:5432/railway`

### 2. NextAuth Configuration

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**Generate a secure secret:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use an online generator
# https://generate-secret.vercel.app/32
```

### 3. Public URLs

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Optional: OAuth Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Go to "APIs & Services" > "Credentials"
4. Create "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env.local`:

```env
GOOGLE_CLIENT_ID="123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnopqrstuvwxyz"
```

### GitHub OAuth Setup

1. Go to [GitHub Settings > Developer settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: `QnALive Local`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and generate a Client Secret
5. Add to `.env.local`:

```env
GITHUB_ID="Iv1.a1b2c3d4e5f6g7h8"
GITHUB_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
```

## Verifying Your Setup

### 1. Check if environment variables are loaded

Create a test API route (temporary):

```typescript
// app/api/test-env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasDatabase: !!process.env.DATABASE_URL,
    hasNextAuth: !!process.env.NEXTAUTH_SECRET,
    publicUrl: process.env.NEXT_PUBLIC_APP_URL,
  })
}
```

Visit: `http://localhost:3000/api/test-env`

### 2. Check which file is being used

Add console logs in your API routes:
```typescript
console.log('DATABASE_URL source:', process.env.DATABASE_URL?.substring(0, 20))
```

### 3. Verify .env.local is ignored

```bash
git status
# .env.local should NOT appear

git check-ignore -v .env.local
# Should output: .gitignore:26:.env*.local	.env.local
```

## Common Mistakes

### ❌ Mistake 1: Committing .env.local
```bash
# Check what's staged
git status

# If .env.local appears, remove it
git rm --cached .env.local
```

### ❌ Mistake 2: Not restarting dev server
After changing environment variables, you MUST restart the dev server:
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### ❌ Mistake 3: Using quotes incorrectly
```env
# ❌ Wrong
DATABASE_URL='postgresql://localhost/db'

# ✅ Correct
DATABASE_URL="postgresql://localhost/db"

# ✅ Also correct (no spaces)
DATABASE_URL=postgresql://localhost/db
```

### ❌ Mistake 4: Exposing secrets with NEXT_PUBLIC_
```env
# ❌ NEVER do this (exposed to browser!)
NEXT_PUBLIC_DATABASE_URL="postgresql://..."
NEXT_PUBLIC_NEXTAUTH_SECRET="..."

# ✅ Only use NEXT_PUBLIC_ for safe values
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Environment-Specific Files

### Development Only

Create `.env.development.local` for dev-specific overrides:
```env
# Enable debug logging in development only
DATABASE_LOGGING="true"
NEXT_PUBLIC_DEBUG_MODE="true"
```

### Production Only

Create `.env.production.local` for production overrides:
```env
# Production database
DATABASE_URL="postgresql://prod-url"

# Production URLs
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## Team Collaboration

### What to commit to git:
- ✅ `.env.example` - Template with all required variables
- ✅ `.env.local.example` - Example of what local file should look like
- ✅ `.gitignore` - With proper exclusions
- ✅ This documentation

### What NOT to commit:
- ❌ `.env.local` - Your personal credentials
- ❌ `.env.development.local` - Your personal dev settings
- ❌ `.env.production.local` - Production secrets
- ❌ Any file with real passwords, API keys, or secrets

### Sharing configurations with team:

```bash
# Good: Share the template
git add .env.example
git commit -m "Update environment variables template"

# Bad: Never share actual credentials via git
# Instead, use a password manager or secure document
```

## Summary

### For Local Development:

1. **Copy template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit with real values:**
   ```bash
   nano .env.local
   ```

3. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

5. **Verify:**
   - `.env.local` exists with your real values
   - `.env.local` is NOT tracked by git (`git status`)
   - Application connects to database
   - Authentication works

### Remember:

- **`.env.local` = Your actual credentials** (not committed)
- **`.env.example` = Template for others** (committed)
- **Always restart dev server after changing env variables**
- **Never commit secrets to git**
- **Each developer has their own `.env.local`**

## Troubleshooting

### Variables not loading?

1. Check file name is exactly `.env.local` (no extra extensions)
2. Restart dev server (`Ctrl+C` then `npm run dev`)
3. Check for typos in variable names
4. Ensure no extra spaces around `=`
5. Check file is in project root (same level as `package.json`)

### Database connection fails?

```bash
# Test connection directly
npx prisma db push

# This will show if DATABASE_URL is correct
```

### Still stuck?

```bash
# Check all .env files being loaded
# Add to a temporary API route:
console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')))
```

---

**Next Steps:** Once your `.env.local` is configured, proceed with [SETUP.md](./SETUP.md) for database initialization.

