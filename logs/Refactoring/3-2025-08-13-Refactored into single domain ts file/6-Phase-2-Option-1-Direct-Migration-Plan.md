# Option 1: Direct Migration Plan for user-slice.ts
**Strategy:** Complete replacement of app-types with domain types  
**Risk Level:** High - Many breaking changes  
**Estimated Time:** 2-3 hours

---

## 📊 **CURRENT vs TARGET STATE**

### **Current State (app-types):**
```typescript
import { UserState, UserActions, UserProfile, UserPreferences, CourseProgress } from '@/types/app-types'

UserState {
  id: string | null
  profile: UserProfile | null        // app-types.UserProfile
  preferences: UserPreferences       // app-types.UserPreferences  
  progress: { [courseId: string]: CourseProgress }  // app-types.CourseProgress
}
```

### **Target State (domain):**
```typescript
import { User, Subscription, CourseProgress } from '@/types/domain'

UserState {
  id: string | null
  user: User | null                  // domain.User (renamed from 'profile')
  preferences: UIPreferences         // Local interface
  progress: { [courseId: string]: CourseProgress }  // domain.CourseProgress
}
```

---

## 🔄 **TYPE MAPPING REQUIREMENTS**

### **1. UserProfile → User Mapping**

| app-types.UserProfile | domain.User | Changes Needed |
|----------------------|-------------|----------------|
| `id: string` | `id: string` | ✅ No change |
| `name: string` | `name: string` | ✅ No change |
| `email: string` | `email: string` | ✅ No change |
| `avatar?: string` | `avatar?: string` | ✅ No change |
| `role: 'learner'` | `role: 'student'` | ❌ Fix value |
| `subscription?: { plan: 'premium' }` | `subscription: { plan: 'pro' }` | ❌ Fix value + structure |
| `moderatorStats?` | - | ❌ No equivalent, need to handle |
| - | `createdAt: string` | ⚠️ New required field |
| - | `updatedAt: string` | ⚠️ New required field |

### **2. UserPreferences → UIPreferences**

| app-types.UserPreferences | Local UIPreferences | Changes Needed |
|---------------------------|-------------------|----------------|
| `theme: 'light' \| 'dark'` | Same | ✅ Move to local |
| `autoPlay: boolean` | Same | ✅ Move to local |
| `playbackRate: number` | Same | ✅ Move to local |
| `volume: number` | Same | ✅ Move to local |
| `sidebarWidth: number` | Same | ✅ Move to local |
| `showChatSidebar: boolean` | Same | ✅ Move to local |

### **3. CourseProgress Property Mapping**

| app-types.CourseProgress | domain.CourseProgress | Changes Needed |
|--------------------------|----------------------|----------------|
| `courseId: string` | `courseId: string` | ✅ No change |
| `progress: number` | `percentComplete: number` | ❌ Rename |
| `currentVideoId?: string` | - | ❌ No equivalent |
| `currentTimestamp: number` | - | ❌ No equivalent |
| `completedVideos: string[]` | - | ❌ No equivalent |
| `lastAccessed: Date` | `lastAccessedAt: string` | ❌ Type change |
| - | `userId: string` | ⚠️ New required |
| - | `videosCompleted: number` | ⚠️ New required |
| - | `totalVideos: number` | ⚠️ New required |

### **4. Subscription Structure Changes**

| app-types Subscription | domain.Subscription | Changes Needed |
|-----------------------|-------------------|----------------|
| `plan: 'premium'` | `plan: 'pro'` | ❌ Value change |
| `dailyAiInteractions?: number` | - | ❌ UI-specific, need local storage |
| `lastResetDate?: string` | - | ❌ UI-specific, need local storage |
| - | `id: string` | ⚠️ New required |
| - | `userId: string` | ⚠️ New required |
| - | `status: string` | ⚠️ New required |
| - | `aiCredits: number` | ⚠️ New required |

---

## 📝 **DETAILED MIGRATION TASKS**

### **Task 1: Create Local Types (user-slice.ts)**
```typescript
// Add at top of user-slice.ts

// UI-specific preferences not in domain
interface UIPreferences {
  theme: 'light' | 'dark'
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}

// UI-specific subscription extension
interface UISubscriptionData {
  dailyAiInteractions: number
  lastResetDate: string
}

// Extended progress for UI needs
interface UIProgress extends Omit<CourseProgress, 'userId'> {
  currentVideoId?: string
  currentTimestamp: number
  completedVideos: string[]
  // Override to handle Date vs string
  lastAccessed: Date
}

// New UserState using domain types
interface UserState {
  id: string | null
  user: User | null  // Changed from 'profile'
  preferences: UIPreferences
  progress: { [courseId: string]: UIProgress }
  // Store UI-specific subscription data separately
  uiSubscriptionData?: UISubscriptionData
}
```

### **Task 2: Update All Property References**

#### **2A: Change 'profile' to 'user' (23 occurrences)**
```typescript
// BEFORE:
set((state) => ({
  id: profile.id,
  profile,
}))

// AFTER:
set((state) => ({
  id: user.id,
  user,
}))
```

**Files/Lines to change:**
- Line 85: `profile: null` → `user: null`
- Line 94-98: `setUser: (profile: UserProfile)` → `setUser: (user: User)`
- Line 96: `id: profile.id` → `id: user.id`
- Line 97: `profile` → `user`
- Line 126: `if (!state.profile?.subscription)` → `if (!state.user?.subscription)`
- Line 128: `const subscription = state.profile.subscription` → `const subscription = state.user.subscription`
- Lines 134-141: All `state.profile` → `state.user`
- Lines 157-163: All `state.profile` → `state.user`
- Lines 174-181: All `state.profile` → `state.user`
- Lines 186-189: All `state.profile` → `state.user`

#### **2B: Fix Subscription Plan Values**
```typescript
// Line 146 - BEFORE:
if (subscription.plan === 'premium')

// AFTER:
if (subscription.plan === 'pro')
```

#### **2C: Handle dailyAiInteractions Separately**
```typescript
// BEFORE (lines 132-140):
subscription: {
  ...state.profile.subscription!,
  dailyAiInteractions: 0,
  lastResetDate: today
}

// AFTER:
// Update uiSubscriptionData separately
uiSubscriptionData: {
  dailyAiInteractions: 0,
  lastResetDate: today
}
```

### **Task 3: Update Function Signatures**

#### **3A: setUser Function**
```typescript
// BEFORE:
setUser: (profile: UserProfile) => 

// AFTER:
setUser: (user: User) => 
  set({
    id: user.id,
    user,
    // Initialize UI subscription data
    uiSubscriptionData: {
      dailyAiInteractions: 0,
      lastResetDate: new Date().toDateString()
    }
  })
```

#### **3B: updateProgress Function**
```typescript
// BEFORE:
updateProgress: (courseId: string, progress: Partial<CourseProgress>) =>

// AFTER:
updateProgress: (courseId: string, progress: Partial<UIProgress>) =>
  set((state) => ({
    progress: {
      ...state.progress,
      [courseId]: {
        ...state.progress[courseId],
        courseId,
        percentComplete: progress.percentComplete || 0,  // Renamed
        lastAccessed: new Date(),  // Keep as Date for UI
        currentTimestamp: 0,  // UI-specific
        completedVideos: [],  // UI-specific
        currentVideoId: undefined,  // UI-specific
        ...progress,
      },
    },
  }))
```

#### **3C: useAiInteraction Function**
```typescript
// Major refactor needed - subscription structure changed
useAiInteraction: () => {
  const state = get()
  if (!state.user?.subscription) return false
  
  const subscription = state.user.subscription
  const uiData = state.uiSubscriptionData
  const today = new Date().toDateString()
  
  // Reset daily counter
  if (uiData?.lastResetDate !== today && subscription.plan === 'basic') {
    set({ uiSubscriptionData: { dailyAiInteractions: 0, lastResetDate: today }})
  }
  
  // Check limits - 'pro' instead of 'premium'
  if (subscription.plan === 'pro' || subscription.plan === 'team') {
    return true  // Unlimited
  } else if (subscription.plan === 'basic') {
    const dailyUsed = uiData?.dailyAiInteractions || 0
    if (dailyUsed >= 3) return false
    
    // Increment
    set({
      uiSubscriptionData: {
        dailyAiInteractions: dailyUsed + 1,
        lastResetDate: today
      }
    })
    return true
  }
  
  return false
}
```

### **Task 4: Handle Missing/New Fields**

#### **4A: Handle Required Fields Not in UI**
```typescript
// When creating/updating User, provide defaults:
const userWithDefaults: User = {
  ...inputUser,
  createdAt: inputUser.createdAt || new Date().toISOString(),
  updatedAt: inputUser.updatedAt || new Date().toISOString(),
  subscription: {
    ...inputUser.subscription,
    id: inputUser.subscription.id || `sub-${Date.now()}`,
    userId: inputUser.subscription.userId || inputUser.id,
    status: inputUser.subscription.status || 'active',
    currentPeriodEnd: inputUser.subscription.currentPeriodEnd || '',
    aiCredits: inputUser.subscription.aiCredits || 0,
    aiCreditsUsed: inputUser.subscription.aiCreditsUsed || 0,
    maxCourses: inputUser.subscription.maxCourses || 1,
    features: inputUser.subscription.features || []
  }
}
```

#### **4B: Handle ModeratorStats (no domain equivalent)**
```typescript
// Option 1: Store in separate state
interface UserState {
  // ... other fields
  moderatorStats?: {
    responsesProvided: number
    helpfulVotes: number
    // etc...
  }
}

// Option 2: Extend User locally
interface UIUser extends User {
  moderatorStats?: ModeratorStats
}
```

### **Task 5: Update Initial State**
```typescript
const initialUIPreferences: UIPreferences = {
  theme: 'light',
  autoPlay: false,
  playbackRate: VIDEO.DEFAULT_PLAYBACK_RATE,
  volume: 1,
  sidebarWidth: UI.SIDEBAR.DEFAULT_WIDTH,
  showChatSidebar: true,
}

const initialUserState: UserState = {
  id: null,
  user: null,  // Changed from 'profile'
  preferences: initialUIPreferences,
  progress: {},
  uiSubscriptionData: undefined,
}
```

---

## 🚨 **BREAKING CHANGES TO HANDLE**

### **1. Components Using the Store**
Any component accessing `state.profile` must change to `state.user`:
```typescript
// Find all components with:
const { profile } = useAppStore()

// Change to:
const { user } = useAppStore()
```

### **2. Property Name Changes**
```typescript
// CourseProgress
progress → percentComplete
lastAccessed (Date) → lastAccessedAt (string)

// Subscription  
plan: 'premium' → plan: 'pro'
```

### **3. Type Imports**
```typescript
// Remove:
import { UserProfile } from '@/types/app-types'

// Add:
import { User } from '@/types/domain'
```

---

## 📋 **MIGRATION CHECKLIST**

### **Phase 1: Preparation**
- [ ] Create backup of current user-slice.ts
- [ ] List all components using UserSlice
- [ ] Document current test coverage

### **Phase 2: Type Setup**
- [ ] Add domain imports
- [ ] Create local UIPreferences interface
- [ ] Create UISubscriptionData interface
- [ ] Create UIProgress interface
- [ ] Define new UserState structure

### **Phase 3: Code Changes**
- [ ] Replace all 'profile' with 'user' (23 occurrences)
- [ ] Update setUser function
- [ ] Update updateProgress function
- [ ] Refactor useAiInteraction function
- [ ] Update resetDailyAiInteractions function
- [ ] Update updateSubscription function
- [ ] Fix all 'premium' → 'pro' references
- [ ] Handle moderatorStats separately

### **Phase 4: Component Updates**
- [ ] Update all components using `profile`
- [ ] Fix all subscription plan checks
- [ ] Update progress property access

### **Phase 5: Testing**
- [ ] Test user login/logout
- [ ] Test AI interaction limits
- [ ] Test progress tracking
- [ ] Test preference updates
- [ ] Test subscription updates

---

## ⚠️ **RISKS & MITIGATIONS**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking all components | High | Create compatibility wrapper during migration |
| Lost UI-specific data | Medium | Store separately in uiSubscriptionData |
| Test failures | High | Update tests incrementally |
| Type mismatches | High | Use strict TypeScript checking |
| Runtime errors | High | Add runtime type guards |

---

## 🎯 **SUCCESS CRITERIA**

1. ✅ No more app-types imports in user-slice.ts
2. ✅ All components still work with new structure
3. ✅ TypeScript compilation passes
4. ✅ All tests pass
5. ✅ AI interaction limits still work
6. ✅ Progress tracking still works
7. ✅ No runtime errors

---

## ⏱️ **ESTIMATED TIMELINE**

| Task | Time | Complexity |
|------|------|------------|
| Type Setup | 30 min | Medium |
| Code Changes | 90 min | High |
| Component Updates | 45 min | High |
| Testing & Fixes | 45 min | High |
| **Total** | **3.5 hours** | **High** |

---

**This is a complex migration with many breaking changes. Consider Option 2 (Adapter Pattern) for lower risk.**