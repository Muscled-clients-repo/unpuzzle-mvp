# NEW vs OLD Architecture File Mapping

## Core Principle
**TanStack Query = SSOT for ALL server data**  
**Zustand = ONLY UI state (modals, forms, drag state, preferences)**

---

## ✅ NEW ARCHITECTURE FILES (Use These Only)

### Core Store & Types
- `/src/stores/course-creation-ui.ts` - NEW: Zustand UI-only store
- `/src/stores/app-store-new.ts` - NEW: Minimal Zustand for UI state
- `/src/stores/slices/ui-slice.ts` - NEW: UI state slice
- `/src/types/course.ts` - NEW: Clean TypeScript types

### TanStack Query Hooks (SSOT for Server Data)
- `/src/hooks/use-course-queries.ts` - NEW: Course server state management
- `/src/hooks/use-chapter-queries.ts` - NEW: Chapter server state management  
- `/src/hooks/use-video-queries.ts` - NEW: Video server state management
- `/src/hooks/use-course-mutations.ts` - NEW: Course mutations (old, can be merged)

### Server Actions
- `/src/app/actions/course-actions.ts` - NEW: Clean server actions
- `/src/app/actions/chapter-actions.ts` - NEW: Chapter server actions
- `/src/app/actions/video-actions.ts` - NEW: Video server actions

### NEW UI Components (Enhanced with New Architecture)
- `/src/components/course/EnhancedChapterManager.tsx` - NEW: Wraps old UI with new data layer
- `/src/app/instructor/course/[id]/edit-v3/page.tsx` - NEW: Edit page using new architecture

---

## ❌ OLD ARCHITECTURE FILES (Avoid These)

### Old Pages (Mixed Server/UI State)
- `/src/app/instructor/course/[id]/edit/page.tsx` - OLD: Mixed state management
- `/src/app/instructor/course/[id]/edit-v2/page.tsx` - OLD: Previous iteration
- `/src/app/instructor/course/[id]/edit-new/page.tsx` - OLD: Mixed architecture
- `/src/app/instructor/course/new/page.tsx` - OLD: Needs migration to new architecture
- `/src/app/instructor/course/new-v2/page.tsx` - OLD: Previous iteration

### Old Store Files
- `/src/stores/course-creation.ts` - OLD: Mixed server/UI state (if exists)
- Any other stores that mix server and UI state

### Old Hook Files
- Any hooks that mix server state with UI state
- Hooks that don't use TanStack Query for server data

---

## 🔄 FILES TO MIGRATE

### Course Creation Flow
- `/src/app/instructor/course/new/page.tsx` - NEEDS MIGRATION: Currently has errors, should use new architecture

### Existing UI Components  
- `/src/components/course/ChapterManager.tsx` - KEEP: Pure UI component, wrapped by Enhanced version
- `/src/components/course/VideoList.tsx` - KEEP: Pure UI component
- All other UI components in `/src/components/course/` - KEEP: These are pure UI

---

## 🎯 CURRENT TESTING FOCUS

### What's Working (Tested)
- ✅ Course info editing (`/instructor/course/[id]/edit-v3`)
- ✅ Video filename changes with batch save
- ✅ Optimistic updates with rollback

### What Needs Testing
- ❌ Course creation flow (currently broken due to old architecture)
- ❌ Chapter management (create, edit, delete, reorder)
- ❌ Video upload with progress tracking
- ❌ Video deletion with Backblaze cleanup
- ❌ Drag & drop functionality
- ❌ Error scenarios and rollback

---

## 🚨 RULES FOR DEVELOPMENT

1. **NEVER** modify old architecture files to fix new architecture issues
2. **ALWAYS** use TanStack Query hooks for any server data
3. **ONLY** use Zustand for UI state (modals, forms, preferences, drag state)
4. **MIGRATE** old pages to new architecture instead of maintaining compatibility
5. **FOCUS** on `/edit-v3/` and new architecture files only

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Fix course creation**: Migrate `/instructor/course/new/page.tsx` to use new architecture
2. **Test new architecture**: Focus on `edit-v3` page and new components only
3. **Ignore old files**: Don't try to maintain compatibility with old edit pages
4. **Complete testing**: Test all features using only new architecture files

---

## 📝 NOTES

- The error `useCourse is not a function` is happening because old edit pages are trying to use new hooks
- **SOLUTION**: Migrate course creation to new architecture, don't add compatibility functions
- User correctly identified the problem: we shouldn't maintain compatibility with old architecture
- Focus should be on completing and testing the new clean TanStack+Zustand SSOT system