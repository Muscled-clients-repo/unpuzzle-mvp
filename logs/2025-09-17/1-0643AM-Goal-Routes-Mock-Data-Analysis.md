# Goal Routes Mock Data Analysis

**Date:** September 17, 2025
**Time:** 6:43 AM EST
**Context:** Comprehensive audit of mock data usage across goal-related routes after fixing instructor/student data inconsistencies

## Problem Discovery

While debugging why instructor and student views showed different goal data for the same student (instructor showing "Day 8, $4K target" vs student showing "Day 1"), we discovered extensive mock data usage across goal routes that needed systematic cleanup.

## Mock Data Locations Found

### 🚨 Critical Active Routes Using Mock Data

#### 1. **Instructor Student Goals List** (`/instructor/student-goals/page.tsx`)
- **Lines 69-70, 87-88**: Hardcoded values in `realStudentGoals` transformation
- **Issue**: All students show identical mock goals
```typescript
currentAmount: '$0',
targetAmount: '$1,000',  // Should be from real assigned goals
goalTitle: 'Goal in Progress', // Should be actual goal descriptions
```
- **Impact**: Instructor sees wrong goal amounts, generic titles
- **Priority**: HIGH - Main instructor workflow affected

#### 2. **Individual Student Fallback** (`/instructor/student-goals/[studentId]/page.tsx`)
- **Lines 17-26**: Mock student data fallback in `getStudentInfo()`
- **Issue**: Uses hardcoded student mapping instead of database lookup
```typescript
const students = {
  '1': { name: 'Sarah Mitchell', email: '12@123.com' },
  '2': { name: 'Michael Chen', email: 'michael.chen@email.com' },
  // ... more hardcoded students
}
```
- **Impact**: Falls back to fake data when real student not found
- **Priority**: MEDIUM - Only affects edge cases

### 🎨 UI Components with Mock Data

#### 3. **Goal Timeline Component** (`/student/goals/components/GoalTimeline.tsx`)
- **Lines 35-37**: Hardcoded goal in `mockGoal` constant
```typescript
title: 'Shopify Agency to $5K/month',
currentAmount: '$3,750',
targetAmount: '$5,000',
```
- **Impact**: Always shows same fake goal data
- **Priority**: LOW - Component may be unused

#### 4. **Goal Conversation Components**
Multiple components with extensive mock data:
- `GoalConversationMinimal.tsx` (Lines 51-53, 100-102)
- `GoalConversation.tsx` (Lines 51-196)
- Mock goals with fake conversations, progress amounts, dates

- **Impact**: Wrong data if these components are used
- **Priority**: LOW - Legacy components, may not be in active use

### ✅ Already Fixed Components

#### 5. **DailyGoalTracker.tsx** - FIXED ✅
- **Issue**: Mock fallback showed `currentAmount: '$450'` instead of `$0`
- **Solution**: Updated fallback values to show `$0` and `progress: 0`
- **Status**: Fixed in this session

#### 6. **InstructorStudentGoalTracker.tsx** - FIXED ✅
- **Issue**: No `goalProgress` prop passed, causing fallback to mock data
- **Solution**: Added real database query identical to `StudentGoalDashboard.tsx`
- **Status**: Fixed in this session

## Mock Data vs Real Data Usage

### ✅ Routes Using Real Database Data
- `/student/goals/` → `StudentGoalDashboard.tsx` with proper DB queries
- `/instructor/student-goals/[studentId]/` → Now uses real data (fixed)

### 🚨 Routes Still Using Mock Data
- `/instructor/student-goals/` → Main student list (needs real goal data)
- Various UI components → Should accept props instead of hardcoded data

### 🧪 Intentional Mock Data (OK)
- `/student/goals-mock/` → Entire folder for demo/preview purposes

## Root Cause Analysis

The data inconsistency between instructor and student views occurred because:

1. **Different Data Sources**: Student view used real database queries while instructor view used mock data from app store
2. **Missing Props**: `ConversationIntegrationV2` wasn't receiving `goalProgress` prop in instructor context
3. **Fallback Logic**: Components fell back to hardcoded mock values when real data wasn't available

## Impact Assessment

### High Impact Issues
- **Instructor workflow broken**: Wrong goal amounts and generic titles
- **Data confusion**: Same student showing different data in different views
- **Training/onboarding issues**: Instructors can't properly track student progress

### Medium Impact Issues
- **Edge case fallbacks**: Wrong student info when database lookup fails
- **Progress tracking**: Mock amounts prevent accurate progress monitoring

### Low Impact Issues
- **UI component inconsistencies**: Legacy components showing wrong data
- **Demo data pollution**: Mock data mixed with real data in same codebase

## Recommended Fixes

### Priority 1: Critical Route Fixes
1. **Update instructor student list** to fetch real goal assignments from database
2. **Replace hardcoded student mapping** with proper database lookup
3. **Add error handling** for missing goal data instead of fallback to mocks

### Priority 2: Component Cleanup
1. **Make UI components prop-driven** instead of using internal mock data
2. **Remove unused legacy components** or update them to use real data
3. **Standardize data fetching patterns** across all goal-related components

### Priority 3: Code Organization
1. **Move all mock data** to dedicated `__mocks__` or `fixtures` folders
2. **Add feature flags** to toggle between mock and real data for development
3. **Document mock data usage** clearly for future developers

## Database Schema Context

Real goal assignments are stored in:
- `profiles.current_goal_id` → References `track_goals.id`
- `track_goals` → Contains goal definitions (agency-1k, agency-5k, etc.)
- `goal_conversations` → Contains conversation state and goal_title

The progressive revenue structure was recently updated (migration 029) to include:
- Agency goals: agency-1k ($1,000) through agency-500k ($500,000)
- SaaS goals: saas-1k-mrr ($1,000 MRR) through saas-20k-mrr ($20,000 MRR)

## Next Steps

1. Fix instructor student goals list to use real database queries
2. Update student info lookup to use proper database calls
3. Test end-to-end goal assignment and tracking workflow
4. Consider removing unused UI components with mock data
5. Add proper error handling for missing goal assignments

## Technical Debt Notes

This analysis revealed significant technical debt around data consistency and mock data management. The mixing of real and mock data in the same application flow created confusion and bugs. A more systematic approach to data fetching and component props is needed going forward.