# Incremental Backend Implementation Plan
Date: August 14, 2025

## Core Principles (from CLAUDE.md)
1. **ALWAYS Check Existing Code First** - Never create new implementations without searching
2. **Reuse Patterns** - Course/Lesson pages share base components
3. **Domain.ts is Single Source of Truth** - All types come from here
4. **Zustand Store Patterns Must Be Respected** - Use existing store architecture
5. **Manual Verification Required** - Hard stops at each phase

## CLAUDE.md Context Management

**IMPORTANT:** Review CLAUDE.md file at these checkpoints:
- [ ] Before starting each phase
- [ ] After completing each major service
- [ ] When creating new components
- [ ] Before any architectural decisions
- [ ] At each HARD STOP verification

This ensures core development principles stay in context throughout the implementation journey.

**⚠️ CRITICAL RULE:** If you encounter ANY of the following, STOP immediately and ask for direction:
- Issues or ambiguities in implementation
- Confusion about which pattern to follow
- Contradictions between different parts of the codebase
- Conflicts with CLAUDE.md principles
- Uncertainty about architectural decisions
- Missing information needed to proceed

**DO NOT ASSUME OR PROCEED WITH UNCERTAINTY - ASK FOR CLARIFICATION**

## Implementation Phases

### Phase 1: Foundation & Authentication
📖 **Re-read CLAUDE.md before starting this phase**
⚠️ **STOP if any conflicts/confusion with CLAUDE.md - ask for direction**
**Migrations to Apply:** 001_initial_setup.sql, 002_users_and_auth.sql

#### Step 1.1: Apply Foundation Migrations
```bash
# Apply to Supabase
supabase migration up 001_initial_setup.sql
supabase migration up 002_users_and_auth.sql
```

#### Step 1.2: Configure Supabase Auth
- [ ] Enable Email/Password authentication in Supabase dashboard
- [ ] Configure email templates (confirmation, reset password)
- [ ] Enable Google OAuth provider in Supabase dashboard
- [ ] Enable LinkedIn OAuth provider in Supabase dashboard
- [ ] Configure redirect URLs for OAuth
- [ ] Test auth flows in Supabase dashboard

**✅ MANUAL CHECK: Verify Email/Password and OAuth providers are working in Supabase dashboard**

#### Step 1.3: Create Auth Service Layer
📖 **Review CLAUDE.md: Check existing patterns first**
⚠️ **STOP if patterns unclear - ask for direction**
**Location:** `/src/services/supabase/auth-service.ts`
- [ ] Search for similar service patterns before creating
- [ ] Create auth service following existing service patterns
- [ ] Map snake_case from DB to camelCase for TypeScript
- [ ] Use domain.ts User and Subscription interfaces

**✅ MANUAL CHECK: Auth service correctly maps DB fields to domain.ts types**

#### Step 1.4: Update Zustand User Store
📖 **Review CLAUDE.md: Respect Zustand patterns**
⚠️ **STOP if store interface unclear - ask for direction**
**Location:** `/src/store/slices/user-slice.ts`
- [ ] Update to use Supabase auth instead of mock data
- [ ] Maintain existing store interface
- [ ] Add auth state management

**✅ MANUAL CHECK: Zustand store maintains same interface, only data source changed**

#### Step 1.5: Test Auth Flow
- [ ] Sign up with email/password
- [ ] Email confirmation flow
- [ ] Login with email/password
- [ ] Password reset flow
- [ ] Login with Google
- [ ] Login with LinkedIn
- [ ] Profile creation for all auth methods
- [ ] Subscription initialization
- [ ] Logout

**✅ MANUAL CHECK: Complete auth flow works end-to-end with email/password and OAuth providers**

**🛑 HARD STOP: Manual verification required before proceeding**
📖 **Review CLAUDE.md before continuing to next phase**
⚠️ **STOP if any unresolved issues - ask for direction**

### Phase 2: Content Structure
📖 **Re-read CLAUDE.md before starting this phase**
⚠️ **STOP if any conflicts/confusion with CLAUDE.md - ask for direction**
**Migration to Apply:** 003_courses_and_content.sql

#### Step 2.1: Apply Content Migration
```bash
supabase migration up 003_courses_and_content.sql
```

**✅ MANUAL CHECK: Verify tables created in Supabase dashboard, check RLS policies**

#### Step 2.2: Create Content Services
📖 **Review CLAUDE.md: Reuse existing patterns**
⚠️ **STOP if patterns conflict - ask for direction**
**Locations:**
- `/src/services/supabase/course-service.ts`
- `/src/services/supabase/video-service.ts`
- `/src/services/supabase/lesson-service.ts`

- [ ] Search and reuse existing mock service interfaces
- [ ] Implement gradual fallback to mock data
- [ ] Use feature flags for testing

**✅ MANUAL CHECK: Services maintain exact same interface as mock services**

#### Step 2.3: Update Zustand Stores
📖 **Review CLAUDE.md: Maintain store architecture**
⚠️ **STOP if integration approach unclear - ask for direction**
**Locations:**
- `/src/store/slices/course-slice.ts`
- `/src/store/slices/video-slice.ts`

- [ ] Add Supabase integration
- [ ] Maintain mock data fallback
- [ ] Keep existing store interfaces

**✅ MANUAL CHECK: Store updates don't break any existing components**

#### Step 2.4: Test Content Display
- [ ] Course listing page
- [ ] Course detail page
- [ ] Video player page
- [ ] Lesson listing
- [ ] Instructor dashboard

**✅ MANUAL CHECK: All pages display data correctly from Supabase**

**🛑 HARD STOP: Manual verification required before proceeding**
📖 **Review CLAUDE.md before continuing to next phase**
⚠️ **STOP if any unresolved issues - ask for direction**

### Phase 3: Student Features
📖 **Re-read CLAUDE.md before starting this phase**
⚠️ **STOP if any conflicts/confusion with CLAUDE.md - ask for direction**
**Migrations to Apply:** 004_progress_tracking.sql, 005_student_features.sql

#### Step 3.1: Apply Student Feature Migrations
```bash
supabase migration up 004_progress_tracking.sql
supabase migration up 005_student_features.sql
```

**✅ MANUAL CHECK: All student tables created, foreign keys valid, triggers working**

#### Step 3.2: Create Progress Services
📖 **Review CLAUDE.md: Follow existing patterns**
⚠️ **STOP if implementation unclear - ask for direction**
**Locations:**
- `/src/services/supabase/progress-service.ts`
- `/src/services/supabase/reflection-service.ts`
- `/src/services/supabase/quiz-service.ts`

#### Step 3.3: Update Student Components
📖 **Review CLAUDE.md: Reuse component patterns**
⚠️ **STOP if component patterns conflict - ask for direction**
- [ ] Video progress tracking
- [ ] Reflection submission
- [ ] Quiz attempts
- [ ] Course progress

**✅ MANUAL CHECK: Components update without breaking existing functionality**

#### Step 3.4: Test Student Features
- [ ] Watch video and track progress
- [ ] Submit reflection
- [ ] Take quiz
- [ ] View course progress

**✅ MANUAL CHECK: Progress saves to DB, reflections submit, quizzes record attempts**

**🛑 HARD STOP: Manual verification required before proceeding**
📖 **Review CLAUDE.md before continuing to next phase**
⚠️ **STOP if any unresolved issues - ask for direction**

### Phase 4: Advanced Features
📖 **Re-read CLAUDE.md before starting this phase**
⚠️ **STOP if any conflicts/confusion with CLAUDE.md - ask for direction**
**Migrations to Apply:** 006_ai_features.sql, 007_instructor_analytics.sql

#### Step 4.1: Apply Advanced Migrations
```bash
supabase migration up 006_ai_features.sql
supabase migration up 007_instructor_analytics.sql
```

**✅ MANUAL CHECK: AI and analytics tables created, functions work correctly**

#### Step 4.2: Create AI & Analytics Services
📖 **Review CLAUDE.md: Maintain consistency**
⚠️ **STOP if architecture uncertain - ask for direction**
**Locations:**
- `/src/services/supabase/ai-service.ts`
- `/src/services/supabase/analytics-service.ts`

#### Step 4.3: Update AI Components
📖 **Review CLAUDE.md: Follow established patterns**
⚠️ **STOP if AI integration unclear - ask for direction**
- [ ] AI chat integration
- [ ] Credit management
- [ ] Context segments

**✅ MANUAL CHECK: AI features integrate without breaking existing chat UI**

#### Step 4.4: Update Instructor Analytics
- [ ] Student activity tracking
- [ ] Confusion hotspots
- [ ] Video metrics
- [ ] Course analytics

**✅ MANUAL CHECK: Analytics dashboards show real data from database**

#### Step 4.5: Test Advanced Features
- [ ] AI chat with video context
- [ ] Credit usage tracking
- [ ] Instructor analytics dashboard
- [ ] Confusion hotspot visualization

**✅ MANUAL CHECK: All advanced features work with real data, credits deduct properly**

**🛑 HARD STOP: Final verification before production**

## Service Layer Pattern

All services follow this pattern for snake_case to camelCase conversion:

```typescript
// Example: course-service.ts
import { Course } from '@/types/domain';

// DB returns snake_case
const dbCourse = await supabase
  .from('courses')
  .select('*');

// Convert to camelCase matching domain.ts
const course: Course = {
  id: dbCourse.id,
  title: dbCourse.title,
  enrollmentCount: dbCourse.enrollment_count, // snake_case to camelCase
  createdAt: dbCourse.created_at,
  // etc...
};
```

## Feature Flag Strategy

Use environment variables for gradual rollout:

```typescript
// .env.local
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
NEXT_PUBLIC_USE_SUPABASE_COURSES=false
NEXT_PUBLIC_USE_SUPABASE_PROGRESS=false
NEXT_PUBLIC_USE_SUPABASE_AI=false
```

## Rollback Strategy

Each phase can be rolled back independently:
1. Disable feature flag
2. Falls back to mock data
3. No data loss as mock data remains

## Testing Checklist

Before merging each phase to main:
- [ ] All existing features still work
- [ ] No TypeScript errors
- [ ] Zustand stores maintain state correctly
- [ ] Mock data fallback works
- [ ] Database operations are performant
- [ ] RLS policies are working
- [ ] No console errors

## Git Strategy

```bash
# For each phase
git checkout -b supabase-phase-1-auth
# Complete phase 1
git add .
git commit -m "feat: Supabase auth integration (Phase 1)"
git push origin supabase-phase-1-auth
# Create PR, test, merge to main

# Next phase
git checkout main
git pull origin main
git checkout -b supabase-phase-2-content
# Continue...
```

## Important Reminders

📖 **CLAUDE.md is your North Star - Review it regularly!**

1. **NEVER** skip manual verification steps
2. **ALWAYS** test rollback before proceeding
3. **CHECK** existing patterns before creating new ones
4. **MAINTAIN** TypeScript types from domain.ts
5. **PRESERVE** Zustand store interfaces
6. **TEST** each phase thoroughly before moving forward

## Current Status

- [x] Migrations created and verified (001-007)
- [ ] Phase 1: Foundation & Authentication - NOT STARTED
- [ ] Phase 2: Content Structure - NOT STARTED
- [ ] Phase 3: Student Features - NOT STARTED
- [ ] Phase 4: Advanced Features - NOT STARTED

## Next Action

Start with Phase 1: Apply migrations 001-002 and implement authentication.