# Phase 2: Simple Clear Plan
**Goal:** Fix domain.ts to be the single source of truth

---

## 🎯 **THE ACTUAL PROBLEMS**

### **Problem 1: Wrong Values**
```typescript
// app-types.ts has WRONG values:
role: 'learner'  // ❌ Should be 'student'
plan: 'premium'  // ❌ Should be 'pro'
```

### **Problem 2: Duplicate Type Names**
Both files have types with the SAME NAME but DIFFERENT structure:
- `UserPreferences` - exists in both files, different properties
- `TranscriptSegment` - exists in both files, different properties  
- `UserProfile` - exists in both files, COMPLETELY different purpose

### **Problem 3: Missing Type**
- `TranscriptReference` - only in app-types, needed for in/out points

---

## ✅ **WHAT I WILL DO**

### **Step 1: Check What's Actually Used**
Look at `user-slice.ts` and `ai-slice.ts` to see:
- Which properties are actually used
- Which can be deleted
- Which must be kept

### **Step 2: Fix domain.ts**

#### **2A: Add Missing Type**
```typescript
// Add to domain.ts:
export interface TranscriptReference {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId: string
  timestamp: Date
}
```

#### **2B: Fix UserPreferences Conflict**
```typescript
// OPTION 1: Merge both versions
export interface UserPreferences {
  // From domain version:
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: { email: boolean, push: boolean, inApp: boolean }
  privacy: { showProfile: boolean, showProgress: boolean }
  
  // Add from app-types version:
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}

// OR OPTION 2: Create separate type
export interface UIPreferences {
  theme: 'light' | 'dark'
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}
```

#### **2C: Fix UserProfile Confusion**
```typescript
// The issue: app-types.UserProfile is main user data, not profile info

// SOLUTION: Don't use the name UserProfile, use domain.User instead
// user-slice will import User from domain.ts
// app-types.UserProfile → domain.User (with correct values)
```

#### **2D: Fix TranscriptSegment Conflict**
```typescript
// Pick ONE version to keep:

// Keep domain version (more complete):
export interface TranscriptSegment {
  id: string
  videoId: string
  startTime: number
  endTime: number
  text: string
  speaker?: string
}

// OR keep simple version:
export interface TranscriptSegment {
  start: number
  end: number
  text: string
}
```

### **Step 3: Create Migration Map**
After fixing domain.ts, document what maps to what:
```
app-types.UserProfile     → domain.User
app-types.UserPreferences → domain.UserPreferences (or UIPreferences)
app-types.ChatMessage     → domain.AIMessage
app-types.VideoContext    → domain.VideoSegment
app-types.TranscriptReference → domain.TranscriptReference
```

---

## 📝 **DELIVERABLE**

### **Updated domain.ts with:**
1. ✅ TranscriptReference added
2. ✅ UserPreferences conflict resolved (merged or renamed)
3. ✅ TranscriptSegment conflict resolved (picked one version)
4. ✅ All values correct ('student' not 'learner', 'pro' not 'premium')

### **Migration map showing:**
- What each app-type maps to in domain.ts
- Ready for Phase 3 implementation

---

## ❓ **DECISIONS NEEDED FROM YOU**

1. **UserPreferences:** Merge both versions OR create separate UIPreferences?
2. **TranscriptSegment:** Use complex domain version OR simple app-types version?
3. **UserProfile:** OK to use domain.User instead of app-types.UserProfile?

---

**This is the simple plan. Should I proceed with this approach?**