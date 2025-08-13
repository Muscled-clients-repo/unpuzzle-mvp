# CORRECTED: Simplifying domain.ts - Accurate Usage Analysis
**Date:** 2025-08-13  
**Current State:** domain.ts has 403 lines, 35 exported types
**Goal:** Identify which types are actually used vs unused

---

## 🔴 **CRITICAL CORRECTIONS FROM PREVIOUS ANALYSIS**

The previous analysis had MAJOR ERRORS. Many types marked as "unused" are actually imported by service files.

---

## 📊 **ACCURATE USAGE ANALYSIS**

### **1. Types Imported from domain.ts** ✅

Based on comprehensive grep analysis of ALL files:

#### **From Slices:**
- `AIMessage` - ai-slice.ts
- `Course` - multiple slices
- `CourseProgress` - user-slice.ts, student-course-slice.ts
- `InstructorVideoData` - instructor-video-slice.ts
- `Quiz` - student-video-slice.ts
- `Reflection` - student-video-slice.ts, instructor-video-service.ts
- `StudentActivity` - instructor-video-slice.ts, instructor-course-service.ts
- `StudentVideoData` - student-video-slice.ts, student-video-service.ts
- `TranscriptReference` - ai-slice.ts
- `UIPreferences` - user-slice.ts
- `User` - user-slice.ts
- `UserRole` - multiple components
- `Video` - instructor-course-slice.ts, student-course-service.ts
- `VideoSegment` - ai-slice.ts, student-video-slice.ts, student-video-service.ts

#### **From Service Files (MISSED IN PREVIOUS ANALYSIS):**
- `AIChat` - student-video-service.ts
- `ConfusionHotspot` - instructor-video-service.ts
- `InstructorLessonData` - instructor-course-service.ts
- `Lesson` - student-course-service.ts, instructor-course-service.ts
- `ServiceResult` - multiple service files
- `StudentLessonData` - student-course-service.ts
- `VideoMetrics` - instructor-video-service.ts, role-services.ts
- `VideoProgress` - student-video-service.ts, role-services.ts

**Total Actually Imported: 22 types** (not 14 as previously stated!)

---

### **2. Types Used as Nested Properties (Never Imported Directly)** ⚠️

```typescript
⚠️ Subscription     // Used as User.subscription
⚠️ TranscriptEntry  // Used as Video.transcript[]
⚠️ Instructor      // Used as Course.instructor
```

**Total: 3 types**

---

### **3. TRULY UNUSED TYPES** ❌

After thorough verification, these are NEVER imported from domain.ts:

```typescript
❌ AIEngagementMetrics - Never imported
❌ AIPrompt - Never imported
❌ QuizAttempt - Never imported
❌ UserProfile - Never imported
❌ UserPreferences - Never imported (different from UIPreferences!)
❌ UserLearningPath - Never imported
❌ UserAchievement - Never imported
❌ VideoMetadata - Never imported
❌ TranscriptSegment - Never imported (different from VideoSegment!)
❌ PaginatedResult - Never imported
```

**Total Truly Unused: 10 types** (not 18 as previously stated!)

---

## 📈 **CORRECTED METRICS**

### **Breakdown of 35 total types:**
- **22 types** - Actively imported and used (63%)
- **3 types** - Used as nested properties (8%)
- **10 types** - Never imported or used (29%)

### **Previous Analysis Errors:**
- Said 14 types were imported → Actually 22
- Said 18 types were unused → Actually only 10
- Incorrectly marked 8 types as unused when they're actually imported by services

---

## 🎯 **REVISED RECOMMENDATION**

### **Keep in domain.ts (25 types):**
All 22 imported types + 3 nested property types

### **Move to domain-future.ts (10 types):**
The 10 truly unused types that represent planned features

### **Impact:**
- Only 29% of types are unused (not 51% as previously stated)
- Reduction would be smaller: 403 → ~300 lines (not 403 → 180)
- Services heavily use domain types (was completely missed before)

---

## ⚠️ **LESSONS LEARNED**

1. **Services use many domain types** - Must check service files, not just components/slices
2. **grep needs full paths** - `src/**/*.{ts,tsx}` to catch everything
3. **Multi-line imports** - Need to check for types in multi-line import statements
4. **Export vs Import** - Some files re-export types without importing them

---

## 💡 **FINAL CORRECTED RECOMMENDATION**

The cleanup is still worthwhile but less dramatic than initially thought:
- **29% unused** is still significant bloat
- Move the 10 unused types to keep domain.ts focused
- Services are correctly using domain types (good architecture!)
- The type system is more integrated than initially analyzed

**This analysis has been completely verified and corrected.**