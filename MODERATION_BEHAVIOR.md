# Moderation Behavior

## Overview
This document describes what happens to existing questions when the moderation setting is toggled.

## Scenario 1: Enable Moderation (OFF → ON)

**Existing Questions:**
- ✅ All existing questions remain **APPROVED** (they stay visible)
- ✅ They were already publicly visible, so no change needed

**New Questions (after enabling):**
- 🔒 Status = **PENDING** by default
- 🔒 Require moderator approval to become visible
- ✅ Visible only to the question creator until approved

**Rationale:** Existing questions were already vetted by being publicly visible. No need to retroactively hide them.

---

## Scenario 2: Disable Moderation (ON → OFF)

**Existing PENDING Questions:**
- ✅ **Auto-approve all PENDING questions** → Status becomes APPROVED
- ✅ They become visible to all participants
- 🔔 Socket.io broadcasts `question:new` events for newly visible questions

**Existing APPROVED Questions:**
- ✅ Remain **APPROVED** (no change)
- Already visible, stay visible

**Existing REJECTED Questions:**
- ⚠️ Remain **REJECTED** (stay hidden)
- They were rejected for a reason, so respect that decision
- Moderators can manually approve them later if desired

**Existing ARCHIVED Questions:**
- ✅ Remain **ARCHIVED** (stay hidden from participants)
- Archive status is independent of moderation

**New Questions (after disabling):**
- ✅ Status = **APPROVED** by default
- ✅ Immediately visible to everyone

**Rationale:** Disabling moderation means "less control", so pending questions should become visible. But rejected questions stay rejected because they were explicitly denied.

---

## Implementation

### Current Behavior (As-Is)
- ❌ No automatic status changes when toggling moderation
- ❌ PENDING questions stay pending even after disabling moderation
- ❌ This can confuse users who expect pending questions to appear

### Recommended Behavior (To-Do)

When updating event settings, if `moderationEnabled` changes from `true` to `false`:

```typescript
// Pseudo-code
if (previousSettings.moderationEnabled === true && newSettings.moderationEnabled === false) {
  // Auto-approve all PENDING questions
  await prisma.question.updateMany({
    where: {
      eventId: eventId,
      status: 'PENDING'
    },
    data: {
      status: 'APPROVED'
    }
  })
  
  // Emit Socket.io events for newly visible questions
  const approvedQuestions = await prisma.question.findMany({
    where: { eventId, status: 'APPROVED', /* ... */ }
  })
  
  approvedQuestions.forEach(q => {
    io.to(eventId).emit('question:new', { question: q })
  })
}
```

---

## Edge Cases

### Case 1: Toggling Multiple Times
- User enables moderation → disables → enables again
- **Expected:** Each toggle follows the rules above
- **Result:** Questions approved during "moderation off" stay approved

### Case 2: Moderator Reviewing After Disabling
- Moderation disabled → pending questions auto-approved
- Moderator goes to "Manage Questions" screen
- **Expected:** All questions show as APPROVED
- **Result:** Moderator can still archive/reject them if needed

### Case 3: Creator Submits While Moderation is Toggled
- Creator submits question → status = PENDING
- Before creator sees it, admin disables moderation
- **Expected:** Question becomes APPROVED, creator sees it
- **Result:** Socket.io emits `question:new` to event room

---

## User Experience

### For Event Owners:
1. **Enabling moderation:**
   - ✅ "Moderation enabled. New questions will require approval."
   - No disruption to existing questions

2. **Disabling moderation:**
   - ✅ "Moderation disabled. X pending questions have been approved and are now visible."
   - Clear feedback on what happened

### For Participants:
1. **When moderation is enabled:**
   - Submit question → See "Pending Review" badge
   - Wait for approval

2. **When moderation is disabled while their question is pending:**
   - Question automatically appears in the list
   - No action needed

### For Moderators:
1. **When moderation is disabled:**
   - Pending queue is cleared (all auto-approved)
   - Can still review/archive/reject approved questions if needed

---

## Testing Checklist

- [ ] Enable moderation → existing questions stay visible
- [ ] Enable moderation → new questions are pending
- [ ] Disable moderation → pending questions become visible
- [ ] Disable moderation → rejected questions stay hidden
- [ ] Disable moderation → new questions are immediately visible
- [ ] Toggle moderation multiple times → no duplicate questions
- [ ] Socket.io broadcasts when pending questions are auto-approved
- [ ] Creator sees their question appear when moderation is disabled
- [ ] Question count updates correctly when moderation is toggled

