# Simple Execution Plan: Single Source of Truth (domain.ts)
**Goal:** Delete app-types.ts, use only domain.ts  
**Risk Level:** Low-Medium  
**Estimated Time:** 70 minutes

## 🚨 **CRITICAL EXECUTION RULES - NEVER SKIP**

### **MANDATORY CHECKPOINT PROTOCOL:**
1. **STOP after EVERY step** - Do NOT proceed to next step
2. **WAIT for user confirmation** - User must say "all good" or report errors
3. **NO AUTOMATION** - Each step requires manual user verification
4. **SHOW checkpoint message** - Display the exact checkpoint text from this document
5. **NEVER ASSUME** - Even if everything looks good, WAIT for user

### **How This Works:**
```
Claude: "Step X complete. [Shows CHECKPOINT X section]"
User: "all good" or "error: [description]"
Claude: "Ready to execute Step X+1"
User: "yes" or "go"
[Only then Claude proceeds]
```

**⛔ VIOLATIONS:**
- Running multiple steps without checkpoints = WRONG
- Assuming success and continuing = WRONG  
- Skipping user confirmation = WRONG
- Running npm/build commands without user asking = WRONG

---

## ✅ **STEP 1: Add Missing Types to domain.ts**

### 🚨 **BEFORE STARTING STEP 1:**
**CLAUDE MUST CHECK:**
- [ ] Did user say "yes" or "go" to start this step?
- [ ] If NO → STOP and wait for user permission

**AFTER COMPLETING STEP 1:**
- [ ] MUST show CHECKPOINT 1 in full
- [ ] MUST WAIT for user to say "all good"
- [ ] CANNOT proceed to Step 2 without confirmation

### **1A: Add ModeratorStats to User**
```typescript
// In domain.ts, find User interface and add:
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  subscription: Subscription
  moderatorStats?: {  // ADD THIS
    responsesProvided: number
    helpfulVotes: number
    endorsedByInstructor: number
    specialization: string[]
    trustScore: number
    promotedAt: string
    promotedBy: string
  }
  createdAt: string
  updatedAt: string
}
```

### **1B: Add UIPreferences**
```typescript
// In domain.ts, add near UserPreferences:
export interface UIPreferences {
  theme: 'light' | 'dark'
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}
```

### **1C: Add TranscriptReference**
```typescript
// In domain.ts, add near other transcript types:
export interface TranscriptReference {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId: string
  timestamp: string  // ISO string format
}
```

### **1D: Note What Already Exists**
```typescript
// These already exist in domain.ts:
✅ AIMessage (replaces ChatMessage)
✅ VideoSegment (replaces VideoContext)
✅ CourseProgress (exists but different properties)
✅ User (replaces UserProfile)
```

---

## ✅ **STEP 2: Update user-slice.ts**

### 🚨 **BEFORE STARTING STEP 2:**
**CLAUDE MUST CHECK:**
- [ ] Did user confirm Step 1 with "all good"?
- [ ] Did user say "yes" or "go" to start Step 2?
- [ ] If NO to either → STOP and wait

**AFTER COMPLETING STEP 2:**
- [ ] MUST show CHECKPOINT 2 in full
- [ ] MUST WAIT for user to say "all good"
- [ ] CANNOT proceed to Step 3 without confirmation

### **2A: Change Imports**
```typescript
// REMOVE:
import { UserState, UserActions, UserProfile, UserPreferences, CourseProgress } from '@/types/app-types'

// ADD:
import { User, UIPreferences, CourseProgress } from '@/types/domain'
```

### **2B: Define Local Types**
```typescript
// Add these interfaces at the top of user-slice.ts:

interface UserState {
  id: string | null
  profile: User | null  // Keep name as 'profile' for now to avoid breaking changes
  preferences: UIPreferences
  progress: { [courseId: string]: CourseProgress }
  dailyAiInteractions?: number  // UI-specific field
  lastResetDate?: string  // UI-specific field
}

interface UserActions {
  setUser: (profile: User) => void
  updatePreferences: (preferences: Partial<UIPreferences>) => void
  updateProgress: (courseId: string, progress: Partial<CourseProgress>) => void
  useAiInteraction: () => boolean
  resetDailyAiInteractions: () => void
  updateSubscription: (subscription: User['subscription']) => void
  logout: () => void
}
```

### **2C: Fix Value Mismatches**
```typescript
// Line 146 - FIND:
if (subscription.plan === 'premium')

// REPLACE WITH:
if (subscription.plan === 'pro')

// Line 149 - CHECK:
else if (subscription.plan === 'basic')  // This is already correct
```

### **2D: Fix Type References**
```typescript
// Line 94 - FIND:
setUser: (profile: UserProfile) =>

// REPLACE WITH:
setUser: (profile: User) =>

// Line 184 - FIND:
updateSubscription: (subscription: UserProfile['subscription']) =>

// REPLACE WITH:
updateSubscription: (subscription: User['subscription']) =>
```

### **2E: Handle UI-Specific Subscription Fields**
```typescript
// The problem: domain.Subscription doesn't have dailyAiInteractions or lastResetDate
// Solution: Add them to UserState interface defined in 2B above

// In UserState from 2B, add these fields:
  dailyAiInteractions?: number
  lastResetDate?: string

// Update line 132-140 to use separate fields:
// BEFORE:
subscription: {
  ...state.profile.subscription!,
  dailyAiInteractions: 0,
  lastResetDate: today
}

// AFTER:
set((state) => ({
  dailyAiInteractions: 0,
  lastResetDate: today
}))
```

---

## ✅ **STEP 3: Update ai-slice.ts**

### 🚨 **BEFORE STARTING STEP 3:**
**CLAUDE MUST CHECK:**
- [ ] Did user confirm Step 2 with "all good"?
- [ ] Did user say "yes" or "go" to start Step 3?
- [ ] If NO to either → STOP and wait

**AFTER COMPLETING STEP 3:**
- [ ] MUST show CHECKPOINT 3 in full
- [ ] MUST WAIT for user to say "all good"
- [ ] CANNOT proceed to Step 4 without confirmation

### **3A: Change Imports**
```typescript
// REMOVE:
import { AIState, AIActions, ChatMessage, TranscriptReference, VideoContext } from '@/types/app-types'

// ADD:
import { AIMessage, TranscriptReference, VideoSegment } from '@/types/domain'
```

### **3B: Define Local Types**
```typescript
// Add these interfaces at the top of ai-slice.ts:

interface AIState {
  chatMessages: AIMessage[]  // Changed from ChatMessage
  transcriptReferences: TranscriptReference[]
  isProcessing: boolean
  activeInteractions: number
  error: string | null
  metrics: {
    totalInteractions: number
    hintsGenerated: number
    quizzesCompleted: number
    reflectionsSubmitted: number
  }
}

interface AIActions {
  sendChatMessage: (content: string, context?: VideoSegment, transcriptRef?: TranscriptReference) => Promise<void>
  loadChatHistory: (sessionId?: string) => Promise<void>
  clearChatHistory: (sessionId?: string) => Promise<void>
  addChatMessage: (content: string, context?: VideoSegment, type?: 'user' | 'ai') => void
  addTranscriptReference: (ref: Omit<TranscriptReference, 'id' | 'timestamp'>) => void
  setIsProcessing: (isProcessing: boolean) => void
  incrementInteractions: () => void
  clearChat: () => void
  removeTranscriptReference: (id: string) => void
  clearError: () => void
}
```

### **3C: Update Type References**
```typescript
// Note: AIMessage structure in domain.ts doesn't have 'context' field
// Store context separately if needed for in/out points

// Line 50 - FIND:
const userMessage: ChatMessage = {

// REPLACE WITH:
const userMessage: AIMessage = {
  id: `msg-${Date.now()}-${Math.random()}`,
  content: validation.sanitized,
  timestamp: new Date().toISOString(),
  role: 'user',  // domain.AIMessage uses 'role' not 'type'
}

// Line 91 - FIND:
const aiMessage: ChatMessage = {

// REPLACE WITH:
const aiMessage: AIMessage = {
  id: result.data.id,
  content: result.data.content,
  timestamp: result.data.timestamp,
  role: 'assistant',  // 'assistant' for AI messages
}

// Line 26 & 158 - FIND:
context?: VideoContext

// REPLACE WITH:
context?: VideoSegment
```

---

## ✅ **STEP 4: Delete app-types.ts**

### 🚨 **BEFORE STARTING STEP 4:**
**CLAUDE MUST CHECK:**
- [ ] Did user confirm Step 3 with "all good"?
- [ ] Did user say "yes" or "go" to start Step 4?
- [ ] If NO to either → STOP and wait

**AFTER COMPLETING STEP 4:**
- [ ] MUST show CHECKPOINT 4 in full
- [ ] MUST WAIT for user to say "all good"
- [ ] CANNOT proceed to Step 5 without confirmation

### **4A: Delete the File**
```bash
rm src/types/app-types.ts
```

### **4B: Check for Any Other Imports**
```bash
# Run this to find any other files importing app-types:
grep -r "from '@/types/app-types'" src/

# If found, update them to use domain.ts types
```

---

## ✅ **STEP 5: Test & Fix**

### 🚨 **BEFORE STARTING STEP 5:**
**CLAUDE MUST CHECK:**
- [ ] Did user confirm Step 4 with "all good"?
- [ ] Did user say "yes" or "go" to start Step 5?
- [ ] If NO to either → STOP and wait

**AFTER COMPLETING STEP 5:**
- [ ] MUST show FINAL CHECKPOINT in full
- [ ] MUST WAIT for user to confirm all tests pass
- [ ] Task is NOT complete until user confirms

### **5A: Run TypeScript Check**
```bash
npm run typecheck
# or
npx tsc --noEmit
```

### **5B: Fix Any Errors**
Common errors and fixes:
- `Property 'type' does not exist` → Change to 'role'
- `Type 'Date' is not assignable to type 'string'` → Use .toISOString()
- `Property 'premium' not found` → Change to 'pro'

### **5C: Test Key Features**
1. User login/logout
2. AI chat functionality
3. Video player with in/out points
4. Moderator features (if role is moderator)

---

---

## ⚠️ **POTENTIAL ISSUES & FIXES**

| Issue | Fix |
|-------|-----|
| `ChatMessage` type not found | Use `AIMessage` instead |
| `VideoContext` type not found | Use `VideoSegment` instead |
| `'premium'` value error | Change to `'pro'` |
| `'learner'` value error | Change to `'student'` |
| `type` property doesn't exist | Change to `role` |
| Date vs string mismatch | Use `.toISOString()` |
| Missing dailyAiInteractions | Already added to UserState in 2B |

---

## 🎯 **END RESULT**

✅ **app-types.ts:** DELETED  
✅ **domain.ts:** Single source of truth  
✅ **Slices:** Using domain types + local state types  
✅ **No duplicates:** Each type defined once  
✅ **Clean imports:** Only importing from domain.ts  

---

## ⏱️ **TIME ESTIMATE**

| Step | Time |
|------|------|
| Step 1: Update domain.ts | 10 min |
| Step 2: Fix user-slice.ts | 20 min |
| Step 3: Fix ai-slice.ts | 20 min |
| Step 4: Delete & check | 5 min |
| Step 5: Test & debug | 15 min |
| **TOTAL** | **70 minutes** |

---

## 🔄 **INCREMENTAL EXECUTION WITH CHECKPOINTS**

### **⚠️ MANDATORY WORKFLOW - NEVER DEVIATE:**
1. **Claude says:** "Ready to execute Step X" 
2. **User says:** "yes" or "go"
3. **Claude makes the changes**
4. **Claude MUST STOP and say:** "Step X complete. CHECKPOINT X:" [Shows full checkpoint section]
5. **Claude WAITS** - No further action until user responds
6. **User tests and responds:** "all good" or "error: [description]"
7. **Only after user confirmation:** Claude can say "Ready to execute Step X+1"
8. **Repeat from step 2**

**🛑 CRITICAL:** Claude must NEVER:
- Skip showing the checkpoint
- Continue without user's "all good"
- Run verification commands unless user asks
- Assume everything is working

---

## ✅ **CHECKPOINT PLAN - MANDATORY STOPS**

**⚠️ THESE ARE HARD STOPS - CLAUDE MUST WAIT FOR USER AT EACH ONE**

### **CHECKPOINT 1 - After domain.ts Update** 🛑 **HARD STOP**

**CLAUDE MUST:** 
1. Show this entire checkpoint section
2. WAIT for user response
3. NOT proceed until user says "all good"

**You will verify:**
- [ ] Run `npm run typecheck` - should pass
- [ ] Check domain.ts in VSCode - no red squiggles
- [ ] New types are present and correct
- [ ] No existing functionality broken

**How to check:**
```bash
npm run typecheck
# Should see: "No errors found"
```

---

### **CHECKPOINT 2 - After user-slice.ts Update** 🛑 **HARD STOP**

**CLAUDE MUST:**
1. Show this entire checkpoint section
2. WAIT for user response  
3. NOT proceed until user says "all good"

**You will verify:**
- [ ] Open user-slice.ts - no red squiggles
- [ ] Run `npm run dev` - app starts
- [ ] Test user login functionality
- [ ] Check user profile displays correctly
- [ ] Verify preferences still work

**How to check:**
```bash
npm run dev
# Then: Try to log in, check profile
```

---

### **CHECKPOINT 3 - After ai-slice.ts Update** 🛑 **HARD STOP**

**CLAUDE MUST:**
1. Show this entire checkpoint section
2. WAIT for user response
3. NOT proceed until user says "all good"

**You will verify:**
- [ ] Open ai-slice.ts - no red squiggles
- [ ] AI chat sidebar opens
- [ ] Can type in chat input
- [ ] No console errors when opening AI chat
- [ ] In/out points feature still visible

**How to check:**
```bash
# Open browser console (F12)
# Navigate to a video page
# Open AI chat sidebar
# Check for any red errors in console
```

---

### **CHECKPOINT 4 - After Deleting app-types.ts** 🛑 **HARD STOP**

**CLAUDE MUST:**
1. Show this entire checkpoint section
2. WAIT for user response
3. NOT proceed until user says "all good"

**You will verify:**
- [ ] File is deleted
- [ ] No remaining imports of app-types
- [ ] App still compiles
- [ ] No TypeScript errors

**How to check:**
```bash
# Check for any remaining imports:
grep -r "app-types" src/

# Should return: NO results

# Then run:
npm run build
# Should complete successfully
```

---

### **FINAL CHECKPOINT - Complete Testing** 🛑 **FINAL HARD STOP**

**CLAUDE MUST:**
1. Show this entire checkpoint section
2. WAIT for user to run all tests
3. NOT consider task complete until user confirms

**You will verify:**
- [ ] Browse courses page works
- [ ] Video player loads
- [ ] AI chat functions
- [ ] User profile/settings work
- [ ] Moderator features work (if applicable)
- [ ] No console errors
- [ ] TypeScript compilation passes

**How to check:**
```bash
# Full test sequence:
1. npm run typecheck  # No errors
2. npm run build      # Builds successfully
3. npm run dev        # App runs

# Then manually test:
- Navigate to /courses
- Open a course
- Play a video
- Open AI chat
- Check user menu
```

---

## 🚨 **IF ERRORS OCCUR**

### **Common Issues & Quick Fixes:**

| Error | Solution |
|-------|----------|
| "Cannot find name 'ChatMessage'" | Change to `AIMessage` |
| "Property 'premium' does not exist" | Change to `'pro'` |
| "Property 'type' does not exist" | Change to `role` |
| "Type 'Date' is not assignable" | Use `.toISOString()` |
| "Cannot find module '@/types/app-types'" | Check imports, should use domain |

### **Rollback Plan:**
If critical errors occur:
```bash
git diff  # See all changes
git checkout -- src/types/domain.ts  # Revert domain.ts
git checkout -- src/stores/slices/user-slice.ts  # Revert user-slice
git checkout -- src/stores/slices/ai-slice.ts  # Revert ai-slice
```

---

## 📋 **EXECUTION TRACKER**

### **Step 1: Update domain.ts**
- [ ] Claude: "Ready to execute Step 1"
- [ ] User: Confirms "yes"
- [ ] Claude: Adds types to domain.ts
- [ ] User: Runs checks, confirms "all good"

### **Step 2: Fix user-slice.ts**
- [ ] Claude: "Ready to execute Step 2"
- [ ] User: Confirms "yes"
- [ ] Claude: Updates user-slice.ts
- [ ] User: Tests login, confirms "all good"

### **Step 3: Fix ai-slice.ts**
- [ ] Claude: "Ready to execute Step 3"
- [ ] User: Confirms "yes"
- [ ] Claude: Updates ai-slice.ts
- [ ] User: Tests AI chat, confirms "all good"

### **Step 4: Delete app-types.ts**
- [ ] Claude: "Ready to execute Step 4"
- [ ] User: Confirms "yes"
- [ ] Claude: Deletes file, checks imports
- [ ] User: Verifies build, confirms "all good"

### **Step 5: Final Testing**
- [ ] User: Runs full test suite
- [ ] User: Confirms "all features working"
- [ ] Ready to commit changes

---

## 📋 **EXECUTION TRACKER**

### **Step 1: Update domain.ts**
- [ ] Claude: "Ready to execute Step 1"
- [ ] User: Confirms "yes"
- [ ] Claude: Adds types to domain.ts
- [ ] Claude: Shows CHECKPOINT 1 and WAITS
- [ ] User: Runs checks, confirms "all good"

### **Step 2: Fix user-slice.ts**
- [ ] Claude: "Ready to execute Step 2"
- [ ] User: Confirms "yes"
- [ ] Claude: Updates user-slice.ts
- [ ] Claude: Shows CHECKPOINT 2 and WAITS
- [ ] User: Tests login, confirms "all good"

### **Step 3: Fix ai-slice.ts**
- [ ] Claude: "Ready to execute Step 3"
- [ ] User: Confirms "yes"
- [ ] Claude: Updates ai-slice.ts
- [ ] Claude: Shows CHECKPOINT 3 and WAITS
- [ ] User: Tests AI chat, confirms "all good"

### **Step 4: Delete app-types.ts**
- [ ] Claude: "Ready to execute Step 4"
- [ ] User: Confirms "yes"
- [ ] Claude: Deletes file, checks imports
- [ ] Claude: Shows CHECKPOINT 4 and WAITS
- [ ] User: Verifies build, confirms "all good"

### **Step 5: Final Testing**
- [ ] Claude: "Ready to execute Step 5"
- [ ] User: Confirms "yes"
- [ ] Claude: Assists with testing
- [ ] Claude: Shows FINAL CHECKPOINT and WAITS
- [ ] User: Runs full test suite
- [ ] User: Confirms "all features working"
- [ ] Ready to commit changes

---

**Ready to begin incremental execution with Step 1?**