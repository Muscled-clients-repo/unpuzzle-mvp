# Video Player UI Migration Guide

**Date:** 2025-08-28  
**Purpose:** Migrate video player UI from standalone page to course learning layout  
**Source:** `/src/app/student/course/[id]/video/[videoId]/page.tsx`  
**Target:** `/src/app/student/courses/learn/[id]/layout.tsx`

---

## 📚 **Table of Contents**
1. [Migration Overview](#migration-overview)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Migration Strategy](#migration-strategy)
4. [Implementation Steps](#implementation-steps)
5. [Component Dependencies](#component-dependencies)
6. [Store Integration](#store-integration)
7. [Route Structure Changes](#route-structure-changes)
8. [Testing Checklist](#testing-checklist)

---

## 🎯 **Migration Overview**

### **Goal**
Consolidate the video player UI into the course learning layout to provide a seamless learning experience with better navigation and state management.

### **Key Benefits**
- Unified learning experience across course content
- Shared state management between video and other course components
- Better navigation flow within course structure
- Reduced code duplication
- Improved loading states and transitions

---

## 🔍 **Current Implementation Analysis**

### **Video Page Component Structure**
```typescript
// Current location: /src/app/student/course/[id]/video/[videoId]/page.tsx

Key Features:
- Dynamic video player import with SSR disabled
- Store integration for video data and course data
- Support for both course videos and standalone lessons
- Loading states and error handling
- Video progress tracking
- Navigation between course videos
```

### **Current Data Flow**
1. **Route Parameters**
   - `courseId` from `params.id`
   - `videoId` from `params.videoId`

2. **Store Integration**
   - `loadStudentVideo(videoId)` - Loads video data
   - `loadCourseById(courseId)` - Loads course structure
   - `trackView(videoId)` - Tracks video views

3. **Conditional Rendering**
   - Shows loading spinner during data fetch
   - Handles "Video Not Found" state
   - Renders `StudentVideoPlayerV2` when data is ready

---

## 📋 **Migration Strategy**

### **Phase 1: Layout Enhancement**
Transform the layout from a simple pass-through to an intelligent container that:
- Detects video routes via pathname analysis
- Conditionally renders video player
- Maintains metadata generation for SEO

### **Phase 2: Route Detection Logic**
```typescript
// Extract video ID from pathname
const videoMatch = pathname.match(/\/video\/([^\/]+)/)
const videoId = videoMatch ? videoMatch[1] : null

// Determine rendering mode
const showVideoPlayer = !!videoId && pathname.includes('/video/')
```

### **Phase 3: Component Migration**
Move the following from page.tsx to layout.tsx:
- Video player dynamic import
- Data loading logic
- State management hooks
- Error handling
- Loading states

---

## 🛠️ **Implementation Steps**

### **Step 1: Convert Layout to Client Component**
```typescript
"use client"  // Add at top of layout file
```

### **Step 2: Import Dependencies**
```typescript
import { useState, useEffect } from "react"
import { useParams, usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
```

### **Step 3: Dynamic Video Player Import**
```typescript
const StudentVideoPlayerV2 = dynamic(
  () => import("@/components/video/student/StudentVideoPlayerV2").then(mod => ({ 
    default: mod.StudentVideoPlayerV2 
  })),
  { 
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)
```

### **Step 4: Route Detection Implementation**
```typescript
const pathname = usePathname()
const videoMatch = pathname.match(/\/video\/([^\/]+)/)
const videoId = videoMatch ? videoMatch[1] : null
```

### **Step 5: Conditional Rendering**
```typescript
if (!showVideoPlayer) {
  return <>{children}</>  // Render children for non-video routes
}

// Render video player for video routes
return (
  <div className="fixed inset-0 top-16 bg-background">
    <StudentVideoPlayerV2 {...videoProps} />
  </div>
)
```

---

## 📦 **Component Dependencies**

### **Required Components**
- `StudentVideoPlayerV2` - Main video player component
- `LoadingSpinner` - Loading state indicator
- `Button` - UI component for actions
- `Badge`, `Progress`, `Card` - UI components (if needed)

### **Store Dependencies**
```typescript
// From useAppStore
{
  currentVideo: storeVideoData,
  loadStudentVideo,
  reflections,
  addReflection,
  currentCourse,
  loadCourseById,
  lessons,
  loadLessons,
  trackView
}
```

---

## 🔄 **Store Integration**

### **Video Data Loading Flow**
```typescript
useEffect(() => {
  const loadData = async () => {
    if (!showVideoPlayer || !videoId) return
    
    setIsLoading(true)
    await Promise.all([
      loadStudentVideo(videoId),
      loadCourseById(courseId)
    ])
    setIsLoading(false)
  }
  loadData()
}, [videoId, courseId, showVideoPlayer])
```

### **View Tracking**
```typescript
useEffect(() => {
  if (videoId && showVideoPlayer) {
    trackView(videoId)
  }
}, [videoId, showVideoPlayer])
```

---

## 🛤️ **Route Structure Changes**

### **Before Migration**
```
/student/course/[id]/video/[videoId]/page.tsx - Full video player page
/student/courses/learn/[id]/layout.tsx - Simple pass-through layout
```

### **After Migration**
```
/student/courses/learn/[id]/layout.tsx - Smart layout with video detection
/student/courses/learn/[id]/video/[videoId]/page.tsx - Minimal page component
```

### **Supported Routes**
- `/student/courses/learn/[courseId]/` - Course overview (no video)
- `/student/courses/learn/[courseId]/video/[videoId]` - Video player view
- `/student/courses/learn/[courseId]/quiz` - Quiz view (no video)
- `/student/courses/learn/[courseId]/resources` - Resources (no video)

---

## ✅ **Testing Checklist**

### **Functionality Tests**
- [ ] Video player loads correctly on video routes
- [ ] Non-video routes render children properly
- [ ] Loading states display during data fetch
- [ ] Error states handle missing videos
- [ ] Navigation between videos works
- [ ] View tracking fires correctly

### **Performance Tests**
- [ ] Dynamic import works (no SSR issues)
- [ ] Loading states are smooth
- [ ] No unnecessary re-renders
- [ ] Store updates propagate correctly

### **Edge Cases**
- [natnavigation mid-video load
- [ ] Invalid video IDs
- [ ] Network failures during load
- [ ] Standalone lesson mode
- [ ] Course without videos

---

## 🚀 **Deployment Considerations**

### **Breaking Changes**
- Old video page route will need redirection
- Update any direct links to video pages
- Ensure breadcrumbs reflect new structure

### **Migration Path**
1. Deploy layout changes
2. Add redirects from old routes
3. Update navigation components
4. Monitor for errors
5. Remove old video page component

### **Rollback Plan**
- Keep old video page component for 1 sprint
- Monitor error rates and user feedback
- Quick revert possible via route configuration

---

## 📝 **Code Examples**

### **Minimal Page Component After Migration**
```typescript
// /student/courses/learn/[id]/video/[videoId]/page.tsx
export default function VideoPage() {
  // Layout handles all video player logic
  return null
}
```

### **Event Handlers**
```typescript
const handleTimeUpdate = (time: number) => {
  console.log('Time update:', time)
}

const handlePause = (time: number) => {
  console.log('Paused at', time)
}

const handlePlay = () => {
  console.log('Playing')
}

const handleEnded = () => {
  console.log('Video ended')
  // Navigate to next video or show completion
}
```

---

## 🔗 **Related Documentation**
- [AI Assistant Integration Guide](../aug-27-25/01_2025-08-27_FRONTEND_INTEGRATION_GUIDE.md)
- [Subscription Implementation Plan](../aug-27-25/02_2025-08-27_AI_SUBSCRIPTION_IMPLEMENTATION_PLAN.md)
- Video Player Component Documentation
- Store Management Guide

---

## 📅 **Timeline**
- **Planning Phase**: Completed
- **Implementation Phase**: Ready to start
- **Testing Phase**: TBD
- **Deployment**: TBD

---

**Document Version:** 1.0  
**Last Updated:** 2025-08-28  
**Author:** Development Team  
**Status:** Ready for Implementation