# Authentication Flow for Questions

## Overview
The "Allow Anonymous Questions" setting controls whether participants need to be signed in to ask questions at an event.

## Setting Behavior

### Allow Anonymous Questions = ON (Default)
- ✅ Anyone can submit questions without signing in
- ✅ Participants can optionally provide their name (or remain "Anonymous")
- ✅ Signed-in users automatically use their account name

### Allow Anonymous Questions = OFF
- 🔒 Only signed-in users can submit questions
- 🔒 Non-authenticated users see a "Sign In" button instead of the question form
- ✅ Questions automatically use the signed-in user's name from their account

## Implementation Details

### API Validation (`/api/events/[eventId]/questions`)
```typescript
if (settings.allowAnonymous === false && !session?.user?.id) {
  return 401 error: 'You must be signed in to ask questions at this event.'
}
```

### UI Behavior (`/e/[code]/page.tsx`)

**When allowAnonymous = false AND user not signed in:**
```tsx
<div className="text-center py-8">
  <p>You must be signed in to ask questions at this event.</p>
  <Button asChild>
    <a href="/auth/signin">Sign In to Ask Questions</a>
  </Button>
</div>
```

**When allowAnonymous = true OR user is signed in:**
- Shows question submission form
- For authenticated users: Name field is hidden, uses account name
- For anonymous users: Shows optional "Your Name" field

## Default Settings

New events are created with:
```json
{
  "allowAnonymous": true,
  "moderationEnabled": false,
  "showResultsImmediately": true,
  "allowParticipantPolls": false
}
```

## Use Cases

### Public Town Hall (Anonymous Allowed)
- Anyone can join with event code
- Anyone can ask questions
- Optional name field for participants who want to identify themselves

### Corporate Q&A (Authentication Required)
- Enable: "Allow Anonymous Questions" = OFF
- Only authenticated employees can ask questions
- Questions automatically show employee name from their account
- Ensures accountability and authenticity

### Hybrid Events
- Enable: "Allow Anonymous Questions" = ON
- Signed-in users: Questions show their real name
- Anonymous users: Can provide a name or remain anonymous
- Flexibility for different audience types

## Testing

1. **Test Anonymous Allowed**
   - Visit event page without signing in
   - Should see question form with optional name field
   - Submit question → Works ✅

2. **Test Authentication Required**
   - Create event, disable "Allow Anonymous Questions"
   - Visit event page without signing in
   - Should see "Sign In" button instead of form
   - Try to submit via API → Returns 401 error
   - Sign in → Form appears, name auto-populated ✅

3. **Test Authenticated User**
   - Sign in to account
   - Visit any event
   - Name field should NOT appear (uses account name)
   - Submit question → Uses account name automatically ✅

