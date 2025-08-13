# Simplifying domain.ts - Usage Analysis and Cleanup Plan
**Date:** 2025-08-13  
**Current State:** domain.ts has 403 lines with many unused types  
**Goal:** Reduce to only actively used types (~150-200 lines)

---

## 📊 **USAGE ANALYSIS**

### **1. ACTIVELY USED TYPES** ✅
These types are imported and used in the application:

```typescript
// User & Auth (used in user-slice.ts, multiple components)
✅ User
✅ UserRole 
✅ Subscription
✅ UIPreferences

// Course & Video (used in course/video slices)
✅ Course
✅ Video
✅ CourseProgress

// AI Features (used in ai-slice.ts)
✅ AIMessage
✅ TranscriptReference  
✅ VideoSegment

// Student Features (used in student-video-slice.ts)
✅ StudentVideoData
✅ Reflection
✅ Quiz

// Instructor Features (used in instructor-video-slice.ts)
✅ InstructorVideoData
✅ StudentActivity

// Common
✅ TranscriptEntry
✅ Instructor
```

**Total: ~18 types actively used**

---

## 🚫 **NEVER IMPORTED/UNUSED TYPES**
These types exist but are NEVER imported anywhere:

```typescript
// AI Metrics (Future feature)
❌ AIEngagementMetrics - 8 lines
❌ AIPrompt - 10 lines
❌ QuizAttempt - 6 lines

// Standalone Lessons (Not implemented)
❌ Lesson - 19 lines
❌ StudentLessonData - 7 lines  
❌ InstructorLessonData - 10 lines

// Analytics (Future feature)
❌ ConfusionHotspot - 6 lines
❌ VideoMetrics - 9 lines

// User Features (Not implemented)
❌ UserProfile - 10 lines
❌ UserPreferences - 12 lines (different from UIPreferences)
❌ UserLearningPath - 10 lines
❌ UserAchievement - 9 lines

// Metadata (Not used)
❌ VideoMetadata - 10 lines
❌ TranscriptSegment - 8 lines (different from VideoSegment)

// Service Types (Might be used elsewhere)
❌ ServiceResult - 5 lines
❌ PaginatedResult - 7 lines

// AI Chat (Partially used)
❌ AIChat - 8 lines (only AIMessage is used)
❌ VideoProgress - 11 lines
```

**Total: ~155 lines of unused code (38% of file!)**

---

## 🎯 **RECOMMENDED APPROACH**

### **Phase 1: Immediate Cleanup (NOW)**

#### **Step 1: Create domain-future.ts**
Move types that represent planned features but aren't implemented yet:

```typescript
// domain-future.ts
// Types for features planned but not yet implemented

// ========== Q1 2025: AI Analytics ==========
export interface AIEngagementMetrics { ... }
export interface AIPrompt { ... }

// ========== Q2 2025: Standalone Lessons ==========
export interface Lesson { ... }
export interface StudentLessonData { ... }

// ========== Q2 2025: Advanced Analytics ==========
export interface ConfusionHotspot { ... }
export interface VideoMetrics { ... }
```

#### **Step 2: Create domain-deprecated.ts**
Move types that might be legacy or duplicates:

```typescript
// domain-deprecated.ts
// Types that might be replaced or are duplicates

export interface UserProfile { ... }  // Conflicts with User
export interface UserPreferences { ... }  // Replaced by UIPreferences
export interface TranscriptSegment { ... }  // Replaced by VideoSegment
export interface VideoMetadata { ... }  // Might be duplicate of Video
```

#### **Step 3: Keep domain.ts lean**
Only keep actively used types:

```typescript
// domain.ts - Single source of truth for ACTIVE types
// ~200 lines instead of 403

// ============= USER & ROLES =============
export type UserRole = 'student' | 'instructor' | 'moderator' | 'admin'
export interface User { ... }
export interface Subscription { ... }
export interface UIPreferences { ... }

// ============= COURSES & VIDEOS =============
export interface Course { ... }
export interface Video { ... }
export interface CourseProgress { ... }
export interface TranscriptEntry { ... }

// ============= STUDENT FEATURES =============
export interface StudentVideoData { ... }
export interface Reflection { ... }
export interface Quiz { ... }

// ============= INSTRUCTOR FEATURES =============
export interface InstructorVideoData { ... }
export interface StudentActivity { ... }
export interface Instructor { ... }

// ============= AI FEATURES =============
export interface AIMessage { ... }
export interface TranscriptReference { ... }
export interface VideoSegment { ... }
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Immediate Actions (15 minutes)**
- [ ] Create `domain-future.ts` file
- [ ] Move unused "future feature" types to domain-future.ts
- [ ] Create `domain-deprecated.ts` file  
- [ ] Move potentially legacy types to domain-deprecated.ts
- [ ] Clean up domain.ts to only active types
- [ ] Update imports if any files use moved types
- [ ] Test that app still builds

### **Validation Steps**
```bash
# 1. Check what's actually imported
grep -r "import.*from.*domain" src/ --include="*.ts" --include="*.tsx"

# 2. For each type in domain.ts, check usage
grep -r "AIEngagementMetrics" src/ --include="*.ts" --include="*.tsx"

# 3. Ensure build still works
npm run build
```

---

## 📈 **EXPECTED OUTCOMES**

### **Before:**
- domain.ts: 403 lines
- Mix of used/unused types
- Unclear what's implemented vs planned
- Hard to maintain

### **After:**
- domain.ts: ~200 lines (50% reduction!)
- Only actively used types
- domain-future.ts: ~100 lines (planned features)
- domain-deprecated.ts: ~50 lines (to be removed)
- Clear separation of concerns

---

## ⚠️ **RISKS & MITIGATIONS**

| Risk | Mitigation |
|------|------------|
| Breaking imports | Search for each type before moving |
| Losing planned types | Keep in domain-future.ts with documentation |
| Future confusion | Add clear headers explaining each file's purpose |
| Git history loss | One commit with clear message explaining reorganization |

---

## 🚀 **FUTURE CONSIDERATIONS**

### **When domain.ts grows again:**
1. **At 300 lines:** Consider role-based splitting
2. **At 500 lines:** Definitely split by role
3. **Pattern to follow:**
   ```
   /types/
     core.ts          // Shared base types
     student.ts       // Student-specific
     instructor.ts    // Instructor-specific
     ai.ts           // AI features
     analytics.ts    // Metrics & analytics
   ```

### **Documentation to add:**
```typescript
/**
 * domain.ts - Active production types only
 * domain-future.ts - Planned features (see roadmap)
 * domain-deprecated.ts - To be removed in next major version
 * 
 * Last cleanup: 2025-08-13
 * Next review: 2025-09-13
 */
```

---

## 💡 **RECOMMENDATION**

**Do the cleanup NOW because:**
1. You just finished type consolidation - perfect timing
2. 38% of domain.ts is unused - significant bloat
3. Takes only 15 minutes
4. Makes codebase much clearer
5. Easier to maintain going forward

**Start with Step 1:** Create domain-future.ts and move the obviously unused types there. This is safe and reversible.