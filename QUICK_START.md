# Quick Start: Environment Variables

## TL;DR - Get Started in 3 Steps

```bash
# 1. Copy the example file to .env.local
cp .env.example .env.local

# 2. Generate a secret and update .env.local
openssl rand -base64 32

# 3. Edit .env.local with your database URL and the secret above
nano .env.local
```

## How Next.js Uses .env.local vs .env

### The Simple Answer

**In local development, Next.js will use `.env.local` instead of `.env`** (if both exist).

Think of it this way:
- **`.env`** = Default/template (can be committed to git)
- **`.env.local`** = Your personal secrets (never committed to git)

### File Priority Order

When you run `npm run dev`, Next.js loads environment files in this order:

```
1. .env                    (loaded first, lowest priority)
2. .env.local             (overrides .env values)
3. .env.development       (overrides both above)
4. .env.development.local (highest priority in dev)
```

**What this means:** If you have both `.env` and `.env.local`, and they both define `DATABASE_URL`, **the value from `.env.local` wins**.

### Example

**File: `.env`** (committed to git)
```env
DATABASE_URL="postgresql://localhost/example"
NEXTAUTH_SECRET="change-me"
```

**File: `.env.local`** (NOT committed, your personal file)
```env
DATABASE_URL="postgresql://postgres:mypass@localhost/qnalive"
NEXTAUTH_SECRET="wD8kXn+9LxYhP2qRs5tU6vW7xY0zA1bC2dE3fG4hI5j="
```

**Result when running app:**
- Uses `DATABASE_URL` from `.env.local` (your actual database)
- Uses `NEXTAUTH_SECRET` from `.env.local` (your secure secret)
- Values from `.env` are ignored because `.env.local` overrides them

## Why Use .env.local?

### ✅ Benefits

1. **Automatic .gitignore**: Next.js convention, already ignored
2. **Safe**: Your real credentials never accidentally get committed
3. **Team-friendly**: Each developer has their own `.env.local`
4. **Clean**: `.env.example` serves as template, everyone copies to `.env.local`

### ❌ What NOT to do

```bash
# ❌ Don't commit your .env.local
git add .env.local  # NEVER DO THIS!

# ✅ Do commit the example template
git add .env.example  # This is safe
```

## Setup for Your Project

### Step 1: Copy Template

```bash
cp .env.example .env.local
```

### Step 2: Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

Copy the output (something like `wD8kXn+9LxYhP2qRs5tU6vW7xY0zA1bC2dE3fG4hI5j=`)

### Step 3: Edit .env.local

Open `.env.local` in your editor:

```bash
nano .env.local
# or
code .env.local
# or
vim .env.local
```

Update these required values:

```env
# Your local PostgreSQL database
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/qnalive"

# The secret you just generated
NEXTAUTH_SECRET="wD8kXn+9LxYhP2qRs5tU6vW7xY0zA1bC2dE3fG4hI5j="

# These can stay as-is for local dev
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

### Step 4: Verify

```bash
# Check that .env.local exists
ls -la .env.local

# Verify it's NOT tracked by git
git status
# .env.local should NOT appear in the list

# Start your dev server
npm run dev
```

## Common Questions

### Q: Do I need both .env and .env.local?

**A:** No, you only need `.env.local` for local development. The `.env.example` is just a template.

### Q: What if I only have .env?

**A:** That works too, but:
- Make sure `.env` is in `.gitignore`
- Or better: rename it to `.env.local`

### Q: Can I use .env instead of .env.local?

**A:** Yes, but it's not recommended because:
- You might accidentally commit it to git
- `.env.local` is a Next.js convention
- It's safer to keep real credentials in `.env.local`

### Q: Do I need to restart the server after changing .env.local?

**A:** YES! Environment variables are only loaded when the server starts.

```bash
# Stop server
Ctrl + C

# Start again
npm run dev
```

### Q: Which variables are exposed to the browser?

**A:** Only variables with the `NEXT_PUBLIC_` prefix:

```env
# ❌ NOT exposed to browser (safe for secrets)
DATABASE_URL="..."
NEXTAUTH_SECRET="..."

# ✅ Exposed to browser (only use for non-secret values)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

## Troubleshooting

### Environment variables not loading?

1. Check file name is exactly `.env.local` (not `.env.local.txt`)
2. File must be in project root (same folder as `package.json`)
3. Restart dev server after any changes
4. Check for typos in variable names
5. No spaces around the `=` sign

### Still not working?

```bash
# Check if file exists
cat .env.local

# Check current directory
pwd
# Should be: /path/to/qnalive

# Check .gitignore is protecting it
git check-ignore -v .env.local
# Should output: .gitignore:26:.env*.local	.env.local
```

## Summary

| File | Purpose | Committed to Git? | Used in Dev? |
|------|---------|-------------------|--------------|
| `.env.example` | Template with examples | ✅ Yes | ❌ No |
| `.env.local` | Your actual credentials | ❌ Never | ✅ Yes (highest priority) |
| `.env` | Optional defaults | ❌ Usually not | ✅ Yes (lower priority) |

**Remember:**
- Always use `.env.local` for your real credentials
- Never commit `.env.local` to git
- Restart dev server after changing environment files
- Each developer has their own `.env.local`

**Next:** See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for detailed explanation of all environment variables.

