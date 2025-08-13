# Phase 2 Step 1: Actual Usage Analysis
**Date:** 2025-08-13  
**Purpose:** Document what properties are ACTUALLY used in user-slice.ts and ai-slice.ts

---

## 📊 **USER-SLICE.TS USAGE**

### **From app-types.ts Imports:**
```typescript
import { UserState, UserActions, UserProfile, UserPreferences, CourseProgress } from '@/types/app-types'
```

### **UserState - How It's Used:**
```typescript
// Initial state (line 83-88):
const initialUserState: UserState = {
  id: null,                    // ✅ USED
  profile: null,               // ✅ USED
  preferences: initialUserPreferences,  // ✅ USED
  progress: {},                // ✅ USED
}
// ALL PROPERTIES USED
```

### **UserProfile - How It's Used:**
```typescript
// In setUser function (line 94-98):
setUser: (profile: UserProfile) => 
  set((state) => ({
    id: profile.id,           // ✅ Uses: id
    profile,                  // ✅ Stores entire profile
  }))

// In useAiInteraction (lines 126-169):
if (!state.profile?.subscription) return false
const subscription = state.profile.subscription
// ✅ Uses: subscription.plan ('premium', 'basic')
// ✅ Uses: subscription.dailyAiInteractions
// ✅ Uses: subscription.lastResetDate

// In updateSubscription (lines 184-190):
subscription: state.profile.subscription
// ✅ Updates entire subscription object

// PROPERTIES ACTUALLY USED:
- id ✅
- subscription ✅ (especially plan, dailyAiInteractions, lastResetDate)
// Note: name, email, avatar, role, moderatorStats NOT directly used in logic
```

### **UserPreferences - How It's Used:**
```typescript
// Initial preferences (lines 66-73):
const initialUserPreferences: UserPreferences = {
  theme: 'light',              // ✅ USED
  autoPlay: false,             // ✅ USED  
  playbackRate: VIDEO.DEFAULT_PLAYBACK_RATE,  // ✅ USED
  volume: 1,                   // ✅ USED
  sidebarWidth: UI.SIDEBAR.DEFAULT_WIDTH,     // ✅ USED
  showChatSidebar: true,       // ✅ USED
}
// ALL 6 PROPERTIES USED

// In updatePreferences (lines 100-106):
updatePreferences: (preferences: Partial<UserPreferences>)
// ✅ Updates any/all preferences
```

### **CourseProgress - How It's Used:**
```typescript
// In updateProgress (lines 108-122):
[courseId]: {
  ...state.progress[courseId],
  courseId,                    // ✅ USED
  progress: 0,                 // ✅ USED
  currentTimestamp: 0,         // ✅ USED
  completedVideos: [],         // ✅ USED
  lastAccessed: new Date(),    // ✅ USED
  ...progress,
}
// Note: currentVideoId is optional, not set by default
// ALL REQUIRED PROPERTIES USED
```

---

## 📊 **AI-SLICE.TS USAGE**

### **From app-types.ts Imports:**
```typescript
import { AIState, AIActions, ChatMessage, TranscriptReference, VideoContext } from '@/types/app-types'
```

### **AIState - How It's Used:**
```typescript
// Initial state (lines 8-20):
const initialAIState: AIState = {
  chatMessages: [],            // ✅ USED
  transcriptReferences: [],    // ✅ USED  
  isProcessing: false,         // ✅ USED
  activeInteractions: 0,       // ✅ USED
  error: null,                 // ✅ USED
  metrics: {                   // ✅ USED
    totalInteractions: 0,
    hintsGenerated: 0,
    quizzesCompleted: 0,
    reflectionsSubmitted: 0,
  },
}
// ALL PROPERTIES USED
```

### **ChatMessage - How It's Used:**
```typescript
// Creating user message (lines 50-56):
const userMessage: ChatMessage = {
  id: `msg-${Date.now()}-${Math.random()}`,  // ✅ USED
  content: validation.sanitized,              // ✅ USED
  timestamp: new Date(),                      // ✅ USED
  type: 'user',                              // ✅ USED
  context,                                    // ✅ USED (optional)
}

// Creating AI message (lines 91-97):
const aiMessage: ChatMessage = {
  id: result.data.id,          // ✅ USED
  content: result.data.content, // ✅ USED
  timestamp: result.data.timestamp, // ✅ USED
  type: 'ai',                  // ✅ USED
  context                      // ✅ USED (optional)
}
// ALL PROPERTIES USED
```

### **TranscriptReference - How It's Used:**
```typescript
// In sendChatMessage (lines 74-80):
const serviceTranscriptRef: ServiceTranscriptReference | undefined = transcriptRef ? {
  id: transcriptRef.id,              // ✅ USED
  text: transcriptRef.text,          // ✅ USED
  startTime: transcriptRef.startTime, // ✅ USED
  endTime: transcriptRef.endTime,    // ✅ USED
  videoId: transcriptRef.videoId     // ✅ USED
} : undefined
// Note: timestamp not passed to service (added later)

// In addTranscriptReference (lines 183-192):
const reference: TranscriptReference = {
  ...ref,  // All properties from input
  id: `ref-${Date.now()}-${Math.random()}`,  // ✅ USED
  timestamp: new Date(),                      // ✅ USED
}
// ALL PROPERTIES USED
```

### **VideoContext - How It's Used:**
```typescript
// Converting to service type (lines 68-72):
const serviceContext: ServiceVideoContext | undefined = context ? {
  videoId: context.videoId || '',     // ✅ USED
  timestamp: context.timestamp || 0,  // ✅ USED  
  transcript: context.transcript      // ✅ USED (optional)
} : undefined
// ALL 3 PROPERTIES USED
```

---

## 🚨 **CRITICAL FINDINGS**

### **1. VALUE MISMATCHES ACTIVELY USED:**
```typescript
// user-slice.ts line 146:
if (subscription.plan === 'premium')  // ❌ Uses 'premium' not 'pro'

// user-slice.ts line 149:
else if (subscription.plan === 'basic')  // ✅ 'basic' is correct
```
**'premium' is actively used in logic and will break if changed to 'pro'**

### **2. PROPERTIES NOT DIRECTLY USED:**
In UserProfile:
- `name` - stored but not used in logic
- `email` - stored but not used in logic  
- `avatar` - stored but not used in logic
- `role` - stored but not used in logic ('learner' value)
- `moderatorStats` - stored but not used in logic

### **3. TYPE CONFLICTS WITH SERVICES:**
```typescript
// ai-slice.ts imports BOTH:
import { VideoContext } from '@/types/app-types'
import { type VideoContext as ServiceVideoContext } from '@/services'
// Has to convert between them (lines 68-72)
```

### **4. ALL PREFERENCES ACTIVELY USED:**
All 6 UserPreferences properties are initialized and can be updated, suggesting they're used by components even if not in slice logic.

---

## 📋 **RECOMMENDATIONS FOR PHASE 2**

### **Priority 1: Fix Critical Value Mismatch**
- Change `'premium'` to `'pro'` will BREAK user-slice.ts logic
- Must update lines 146 & 149 when migrating

### **Priority 2: UserProfile Simplification**
- Only `id` and `subscription` are actively used in logic
- Other properties (name, email, avatar, role) are just stored
- Could simplify to just what's needed

### **Priority 3: Resolve Service Type Conflicts**
- ai-slice has to convert between app-types and service types
- This is the main complexity in the migration

### **Priority 4: Keep All Current Properties**
- Even though some UserProfile properties aren't used in logic, they're likely used by UI components
- All UserPreferences are initialized, suggesting UI needs them
- All TranscriptReference properties are used for in/out points

---

## 🎯 **NEXT STEP**

**Phase 2 decisions should focus on:**
1. How to handle the 'premium' → 'pro' breaking change
2. Whether to keep unused UserProfile properties
3. How to align service types with app-types to avoid conversion

**All imported types ARE being used, so we can't just delete anything.**