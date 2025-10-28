# Forgot Password Feature - Implementation Guide

## ✅ What's Been Implemented

### 1. Database Schema
- **New Model**: `PasswordResetToken`
  - Stores reset tokens with email, hashed token, and expiration
  - Tokens expire after 1 hour
  - Unique constraint on token
  - Indexes on email and token for performance

### 2. Email Service (Resend) ✅
- **Integrated with Resend** for production email delivery
- **Automatic mode switching** between development (console) and production (email)
- **Beautiful HTML email template** with responsive design
- **Easy configuration** via environment variables

### 3. Rate Limiting ✅
- **Database-based rate limiting** (works across multiple server instances)
- **3 requests per email per hour** (customizable)
- Prevents brute-force attacks and abuse
- User-friendly error messages with time until reset
- Automatic cleanup of expired tokens
- HTTP 429 status code for rate limit violations

### 4. API Routes

#### `/api/auth/forgot-password` (POST)
- Accepts email address
- Generates secure reset token
- Stores hashed token in database
- Returns generic success message (prevents email enumeration)
- **Automatically sends email via Resend or logs to console** based on `EMAIL_MODE`

#### `/api/auth/reset-password` (POST)
- Accepts token and new password
- Validates token hasn't expired
- Updates user password
- Deletes used tokens
- Validates password meets requirements (min 6 characters)

### 4. UI Pages

#### `/auth/forgot-password`
- Clean, modern UI matching existing auth pages
- Email input form
- Success state with instructions
- Link back to sign-in

#### `/auth/reset-password?token=...`
- Password reset form with show/hide toggle
- Password confirmation
- Client-side validation
- Token validation
- Redirects to sign-in after success

#### Sign-In Page Updated
- Added "Forgot password?" link next to password field
- Maintains existing design consistency

## ⚙️ Configuration

### Email Mode Switching

The system **automatically switches** between development (console logging) and production (email sending) based on the `EMAIL_MODE` environment variable.

**Default behavior (zero config required!):**
- Development (`NODE_ENV=development`): 📝 Logs to console
- Production (`NODE_ENV=production`): 📧 Sends via Resend

**Manual override:**
Set `EMAIL_MODE` in your `.env.local`:

```env
# Force console mode (development/testing)
EMAIL_MODE="console"

# Force Resend mode (production/staging)
EMAIL_MODE="resend"
```

### Quick Config Examples

**Development (default):**
```env
# .env.local
# No email config needed - automatically logs to console!
```

**Staging/Testing with real emails:**
```env
# .env.local
EMAIL_MODE="resend"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="QnALive Staging <staging@yourdomain.com>"
```

**Production:**
```env
# .env.production or deployment platform
NODE_ENV="production"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="QnALive <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

### Required Environment Variables

```env
# Required for production email
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Optional: Customize email sender (defaults to QnALive <noreply@qnalive.com>)
EMAIL_FROM="YourApp <noreply@yourdomain.com>"

# Optional: Set reply-to address
EMAIL_REPLY_TO="support@yourdomain.com"

# Optional: Force email mode (defaults based on NODE_ENV)
EMAIL_MODE="console"  # or "resend"
```

## 🚀 How to Use

### Development Mode (Console)

1. **Default setup** - No configuration needed! Emails are logged to console.

2. **Test the feature:**
   ```bash
   npm run dev
   ```

3. Navigate to `http://localhost:3000/auth/forgot-password`

4. Enter an email address

5. **Check your terminal** for the reset link:
   ```
   === EMAIL (Development Mode) ===
   From: QnALive <noreply@qnalive.com>
   To: user@example.com
   Subject: Reset your QnALive password
   ---
   [HTML email content with reset link]
   ================================
   ```

6. Copy the reset link and open it in your browser

### Production Mode (Resend)

1. **Get your Resend API key** from https://resend.com/api-keys

2. **Add to `.env.local`:**
   ```env
   RESEND_API_KEY="re_xxxxxxxxxxxxx"
   EMAIL_MODE="resend"
   EMAIL_FROM="YourApp <noreply@yourdomain.com>"
   ```

3. **Verify your domain** in Resend dashboard (required for production)

4. **Deploy** and test - emails will be sent automatically!

### Creating Test Users

```bash
# Via signup page
Visit http://localhost:3000/auth/signup

# Or via Prisma Studio
npx prisma studio
# Create user with email, name, and passwordHash
```

### Testing Rate Limiting

To test the rate limiting feature:

1. **Test the 3-per-hour limit:**
   ```bash
   # Open http://localhost:3000/auth/forgot-password
   # Enter the same email 4 times within an hour
   # The 4th request should show: "Too many password reset requests. Please try again in X minutes."
   ```

2. **Check the error message:**
   - First 3 attempts: Success (email sent or generic success message)
   - 4th attempt: HTTP 429 with user-friendly error message
   - Error includes time until next allowed attempt

3. **Verify automatic cleanup:**
   - Wait 1 hour or restart server
   - Try again - should work (expired tokens cleaned up)

4. **Customize rate limit (optional):**
   ```typescript
   // In lib/rate-limit.ts
   // Change default config:
   { maxAttempts: 5, windowMs: 30 * 60 * 1000 } // 5 per 30 minutes
   ```

## 🛡️ How Rate Limiting Works

The rate limiting implementation uses the `PasswordResetToken` table to track requests:

### Architecture

```
1. User requests password reset for email@example.com
2. System checks PasswordResetToken table for recent requests
3. Count requests created in last hour for this email
4. If count < 3: Allow request, create new token
5. If count >= 3: Return HTTP 429 with time until reset
```

### Key Features

1. **Database-based**: Works across multiple server instances (no shared memory needed)
2. **Sliding window**: 1-hour window from oldest request, not fixed hourly resets
3. **Automatic cleanup**: Expired tokens removed on each request (opportunistic)
4. **Fail-open**: If rate limit check fails, allows request (prioritizes availability)
5. **Customizable**: Easy to adjust limits in `lib/rate-limit.ts`

### Example Timeline

```
10:00 AM - Request #1: ✅ Allowed (2 remaining)
10:15 AM - Request #2: ✅ Allowed (1 remaining)
10:30 AM - Request #3: ✅ Allowed (0 remaining)
10:45 AM - Request #4: ❌ Denied (try again at 11:00 AM)
11:00 AM - Request #5: ✅ Allowed (oldest request expired)
```

### Customizing Rate Limits

Edit `/lib/rate-limit.ts`:

```typescript
// Default configuration
export async function checkPasswordResetRateLimit(
  email: string,
  config: RateLimitConfig = { 
    maxAttempts: 3,           // Change this
    windowMs: 60 * 60 * 1000  // Or this (1 hour in ms)
  }
): Promise<RateLimitResult>
```

**Common configurations:**
- More lenient: `{ maxAttempts: 5, windowMs: 60 * 60 * 1000 }` (5 per hour)
- More strict: `{ maxAttempts: 2, windowMs: 30 * 60 * 1000 }` (2 per 30 min)
- Very strict: `{ maxAttempts: 1, windowMs: 60 * 60 * 1000 }` (1 per hour)

## 🔒 Security Features

1. **Token Security:**
   - Uses crypto.randomBytes() for secure token generation
   - Tokens are hashed (SHA-256) before storing in database
   - Original token never stored, only the hash

2. **Rate Limiting:** ✅ **IMPLEMENTED**
   - **Database-based rate limiting** that works across multiple server instances
   - **3 requests per email per hour** (configurable)
   - Returns helpful error messages with time until reset
   - Automatic cleanup of expired tokens
   - **HTTP 429** status code for rate limit errors
   - User-friendly error messages: "Too many password reset requests. Please try again in X minutes."

3. **Token Expiration:**
   - Tokens expire after 1 hour
   - Old tokens are automatically invalidated when new ones are requested
   - Used tokens are deleted immediately
   - Expired tokens are cleaned up automatically

4. **Email Enumeration Prevention:**
   - Always returns same success message regardless of whether email exists
   - Prevents attackers from discovering valid email addresses
   - Rate limiting applied before user lookup

5. **Password Requirements:**
   - Minimum 6 characters (configurable)
   - Hashed using bcrypt with 10 rounds
   - Passwords never stored in plain text

## 📋 Database Migration

The migration file has been created at:
```
prisma/migrations/20251028000000_add_password_reset_tokens/migration.sql
```

To apply it to your database:
```bash
# For development database
npx prisma migrate deploy

# Or if you have DATABASE_URL set
DATABASE_URL="your_db_url" npx prisma migrate deploy
```

The migration adds:
- `PasswordResetToken` table
- Indexes on `email` and `token`
- Unique constraint on `token`

## ✅ Testing Checklist

- [ ] User can request password reset with valid email
- [ ] User receives appropriate message with invalid email
- [ ] Reset link contains valid token
- [ ] Reset link expires after 1 hour
- [ ] User can reset password with valid token
- [ ] User cannot reuse same token
- [ ] Password meets minimum requirements
- [ ] User can sign in with new password
- [ ] Multiple reset requests invalidate previous tokens
- [ ] UI is responsive and accessible
- [ ] Error messages are clear and helpful

## 🔧 Troubleshooting

### "Property 'passwordResetToken' does not exist"
This is a TypeScript server caching issue. Fix it by:
1. Restarting your TypeScript server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
2. Or restarting your IDE
3. The Prisma client has been regenerated correctly, this is just a lint display issue

### Reset link doesn't work
1. Check that the token is correctly extracted from URL query params
2. Verify database has the PasswordResetToken table
3. Check token hasn't expired (1 hour limit)
4. Ensure Prisma client has been regenerated after schema changes

### Email not sending
1. Verify email service is configured correctly
2. Check environment variables are set
3. Review logs for email sending errors
4. In development, check console for reset link

## 📧 Email Template

The system includes a beautiful, responsive HTML email template with:
- Professional design matching modern email standards
- Prominent "Reset Password" button
- Fallback plain text link
- Mobile-responsive layout
- Security information (1-hour expiration notice)
- Plain text alternative for email clients that don't support HTML

You can customize the template in `/lib/email.ts` → `sendPasswordResetEmail()` function.

## 📝 Files Modified/Created

### Created:
- `lib/email.ts` - Email service with Resend integration
- `lib/rate-limit.ts` - **Rate limiting utilities for password reset**
- `prisma/migrations/20251028000000_add_password_reset_tokens/migration.sql` - Database migration
- `app/api/auth/forgot-password/route.ts` - Forgot password API with rate limiting
- `app/api/auth/reset-password/route.ts` - Reset password API
- `app/auth/forgot-password/page.tsx` - Forgot password UI with rate limit error handling
- `app/auth/reset-password/page.tsx` - Reset password UI

### Modified:
- `prisma/schema.prisma` - Added PasswordResetToken model
- `app/auth/signin/page.tsx` - Added "Forgot password?" link
- `package.json` - Added `resend` dependency

## 🎯 Next Steps

1. ✅ **Email service integrated** (Resend)
2. ✅ **Rate limiting implemented** (3 requests per hour per email)
3. **Deploy migration** to production database
4. **Set up Resend account** and verify domain for production
5. **Test thoroughly** with real email addresses
6. **Monitor** reset token usage and expiration

## 💡 Optional Enhancements

1. **Password Strength Meter** - Show password strength as user types
2. **Account Activity Email** - Notify users when password is changed
3. **Multiple Token Attempts** - Track and limit failed reset attempts
4. **Custom Token Expiry** - Make token duration configurable
5. **Audit Log** - Track password reset activities
6. **Two-Factor for Reset** - Add extra security for sensitive accounts

---

**Status:** ✅ **FULLY IMPLEMENTED** - Complete password reset with email & rate limiting!
**Last Updated:** October 28, 2025

### Quick Start Summary:
1. ✅ Database schema added (PasswordResetToken)
2. ✅ API routes implemented (forgot & reset)
3. ✅ UI pages created (beautiful, responsive)
4. ✅ Resend email service integrated
5. ✅ Auto-switching between dev/prod modes
6. ✅ Beautiful HTML email template
7. ✅ **Rate limiting implemented (3/hour per email)**
8. ✅ Database-based rate limiting (multi-instance support)
9. ✅ Automatic token cleanup
10. 🚀 Ready to use - just set `RESEND_API_KEY` for production!

### Security Checklist:
- ✅ Secure token generation (crypto.randomBytes)
- ✅ Token hashing (SHA-256)
- ✅ Rate limiting (3 requests/hour)
- ✅ Token expiration (1 hour)
- ✅ Email enumeration prevention
- ✅ Automatic cleanup
- ✅ Password hashing (bcrypt)
- ✅ User-friendly error messages

