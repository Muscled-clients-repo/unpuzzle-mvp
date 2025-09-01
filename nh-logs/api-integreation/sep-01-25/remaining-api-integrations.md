# Remaining API Integrations for Existing Frontend Features
**Generated:** September 1, 2025  
**Project:** Unpuzzle MVP Frontend  
**API Version:** v1.0.0

## Executive Summary
This document identifies API endpoints that need to be integrated for **existing frontend UI features that are currently using mock data or have non-functional buttons/forms**. Only endpoints required for features already built in the UI are included.

## Implementation Status Overview

| Feature Area | UI Status | API Status | Priority |
|--------------|-----------|------------|----------|
| Student Management (Instructor) | ✅ Complete UI | ❌ Mock Data | Critical |
| Confusion/Reflection Responses | ✅ Complete UI | ❌ Mock Data | Critical |
| Lesson Creation & Publishing | ✅ Complete UI | ❌ Partial | Critical |
| Student Analytics Dashboard | ✅ Complete UI | ❌ Mock Data | High |
| AI Hint/Quiz in Video Player | ✅ UI Ready | ✅ Hint & Quiz Working | Low |
| Course Sections Organization | ✅ UI Ready | ❌ No API | High |
| Student Reflections Page | ✅ Complete UI | ❌ Mock Data | Medium |

---

## 🔴 CRITICAL - UI Features with Non-Functional APIs

### 1. Student Management System (Instructor Dashboard)
**Current State:** Full UI at `/instructor/students` using mock data
**User Impact:** Instructors cannot see real student data or track progress
```
❌ GET  /api/v1/instructor/students/                 - List all students
❌ GET  /api/v1/instructor/students/{id}/insights    - Student performance metrics
❌ GET  /api/v1/instructor/students/{id}/activity    - Student activity tracking
❌ GET  /api/v1/instructor/students/analytics        - Aggregate student analytics
```

### 2. Confusion/Reflection Response System
**Current State:** Full UI at `/instructor/confusions` and `/instructor/respond/[id]` using mock data
**User Impact:** Instructors cannot respond to student issues or manage confusions
```
❌ GET  /api/v1/instructor/confusions/               - List all confusions
❌ POST /api/v1/instructor/confusions/{id}/resolve   - Mark confusion resolved
❌ POST /api/v1/instructor/reflections/{id}/respond  - Respond to reflection
❌ GET  /api/v1/instructor/students/{id}/reflections - Get student reflections
```

### 3. Lesson Creation & Publishing
**Current State:** Complete UI at `/instructor/lesson/new` with non-functional publish
**User Impact:** Instructors cannot create or publish new lessons
```
❌ POST /api/v1/instructor/lessons/create            - Create new lesson
❌ POST /api/v1/instructor/lessons/{id}/publish      - Publish lesson
❌ POST /api/v1/instructor/lessons/{id}/videos       - Add video to lesson
❌ GET  /api/v1/instructor/lessons/{id}/share-link   - Generate share link
```

### 4. Course Content Sections
**Current State:** UI ready in course edit page but no API connection
**User Impact:** Cannot organize course content into sections
```
❌ GET  /api/v1/content/courses/{id}/sections/       - Get course sections
❌ POST /api/v1/content/courses/{id}/sections/       - Create section
❌ POST /api/v1/content/sections/{id}/media/         - Assign media to section
❌ PUT  /api/v1/content/sections/{id}/               - Update section
❌ DELETE /api/v1/content/sections/{id}/             - Delete section
```

---

## 🟡 HIGH PRIORITY - Features with Existing UI

### 5. AI Agents in Video Player (Mostly Working)
**Current State:** Hint and Quiz agents confirmed working ✅, others need verification
**User Impact:** Core AI learning features functional
```
✅ POST /api/v1/ai-assistant/agents/hint/            - Generate learning hints (WORKING)
✅ POST /api/v1/ai-assistant/agents/quiz/            - Generate quiz questions (WORKING)
❓ POST /api/v1/ai-assistant/agents/reflect/         - Reflection agent (needs testing)
❓ POST /api/v1/ai-assistant/agents/path/            - Learning path agent (needs testing)
```

### 6. Student Analytics Dashboard
**Current State:** Full UI at `/instructor/course/[id]/analytics` using mock data
**User Impact:** Instructors cannot see real course analytics
```
❌ GET  /api/v1/instructor/courses/{id}/analytics    - Course analytics
❌ GET  /api/v1/instructor/courses/{id}/students     - Course student list
❌ POST /api/v1/instructor/courses/{id}/analytics/export - Export analytics
```

### 7. Student Engagement Tracking
**Current State:** UI at `/instructor/engagement` using mock data
**User Impact:** Cannot track real student engagement
```
❌ GET  /api/v1/instructor/engagement/journeys       - Student learning journeys
❌ GET  /api/v1/instructor/engagement/activity       - Student activity feed
❌ GET  /api/v1/instructor/engagement/metrics        - Engagement metrics
```

---

## 🟢 MEDIUM PRIORITY - Features with Partial UI

### 8. Student Reflections Page
**Current State:** UI at `/student/reflections` showing mock data
**User Impact:** Students cannot see their real reflections with AI insights
```
❌ GET  /api/v1/student/reflections/ai-insights      - Get AI insights for reflections
❌ GET  /api/v1/student/reflections/sentiment        - Reflection sentiment analysis
```

### 9. Email Verification
**Current State:** "Resend email" button exists but has TODO comment
**User Impact:** Users cannot resend verification emails
```
❌ POST /api/v1/auth/resend-verification             - Resend verification email
```

### 10. Media Library Management
**Current State:** UI exists in course edit modal but limited functionality
**User Impact:** Cannot fully manage uploaded media
```
❌ GET  /api/v1/media/upload/progress/{id}           - Upload progress tracking
❌ DELETE /api/v1/media/{id}                         - Delete media file
```

---

## Implementation Recommendations

### Phase 1 - Fix Non-Functional UI (Week 1)
1. **Student Management APIs** - Make instructor dashboard functional
2. **Confusion/Reflection Response** - Enable instructor responses
3. **Lesson Publishing** - Complete lesson creation flow
4. **Course Sections** - Organize content properly

### Phase 2 - Complete Existing Features (Week 2)
1. **AI Agents in Video** - Connect hint/quiz buttons to backend
2. **Analytics Dashboard** - Replace mock data with real metrics
3. **Student Engagement** - Real activity tracking

### Phase 3 - Enhancement (Week 3)
1. **Student Reflections Page** - Add AI insights
2. **Email Verification** - Fix resend functionality
3. **Media Library** - Complete upload management

---

## Quick Implementation Guide

### Priority Order for Implementation:
1. **First**: APIs for features with complete UI but mock data
2. **Second**: APIs for features with buttons that don't work
3. **Third**: APIs for features partially implemented

### Service File Template:
```typescript
// Example: instructor-service.ts
export const getStudentInsights = async (
  studentId: string
): Promise<StudentInsights> => {
  const response = await apiClient.get(
    `/api/v1/instructor/students/${studentId}/insights`
  );
  return response.data;
};
```

---

## Summary

### Features with UI but Missing APIs:
- **7 Critical Features** - Complete UI, non-functional
- **4 High Priority Features** - UI ready, not connected
- **3 Medium Priority Features** - Partial UI implementation

### Total Missing Endpoints for Existing UI:
- **Student Management**: 4 endpoints
- **Confusion/Reflection**: 4 endpoints
- **Lesson Creation**: 4 endpoints
- **Course Sections**: 5 endpoints
- **AI Agents**: 2 endpoints (hint & quiz working)
- **Analytics**: 3 endpoints
- **Engagement**: 3 endpoints
- **Other**: 3 endpoints
- **Total**: ~28 endpoints needed for existing UI

## Next Steps

1. **Immediate**: Connect student management APIs (instructor dashboard)
2. **This Week**: Fix all non-functional buttons and forms
3. **Testing**: Verify each connection with real backend data

---

## Note on Excluded Features

The following were excluded because they have **no UI implementation**:
- Payment history page
- Subscription management page
- Notification center
- OAuth account linking page
- Certificate generation
- Course reviews display
- Session management
- Billing/invoice pages

These features should be added to the UI first before their APIs are integrated.

---

*Document generated on September 1, 2025*
*Analysis based on actual UI components found in codebase*
*Only includes APIs needed for existing frontend features*