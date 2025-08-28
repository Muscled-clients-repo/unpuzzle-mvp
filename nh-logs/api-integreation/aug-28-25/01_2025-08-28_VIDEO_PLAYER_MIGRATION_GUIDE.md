# AI Sidebar V2 Migration Guide

**Date:** 2025-08-28  
**Purpose:** Migrate advanced AI sidebar (V2) from video page to learn page  
**Source:** `StudentVideoPlayerV2` component integrated AI sidebar
**Target:** `/src/app/student/courses/learn/[id]/page.tsx`
**Focus:** AIChatSidebarV2 with advanced features (agents, quiz, reflection, segments)

---

## 📚 **Table of Contents**
1. [AI Sidebar Analysis](#ai-sidebar-analysis)
2. [Current Implementation Comparison](#current-implementation-comparison)
3. [Migration Strategy](#migration-strategy)
4. [Phase 1: Extract V2 Sidebar Components](#phase-1-extract-v2-sidebar-components)
5. [Phase 2: Integrate Advanced Features](#phase-2-integrate-advanced-features)
6. [State Management Migration](#state-management-migration)
7. [Component Integration](#component-integration)
8. [Testing & Validation](#testing--validation)

---

## 🎯 **AI Sidebar Analysis**

### **Goal**
Migrate the advanced AI sidebar (V2) from the video page's `StudentVideoPlayerV2` component to the learn page, replacing the basic V1 sidebar with enhanced features.

### **Key Features to Migrate**
- **AIChatSidebarV2**: Advanced AI chat with state machine integration
- **Agent System**: AI agents (hint, quiz, reflect, path) with video integration
- **Video Integration**: Segment handling, time-based interactions
- **State Management**: `useVideoAgentSystem` for complex AI workflows
- **Advanced Interactions**: Quiz answers, reflections, segment selection

### **Benefits**
- Enhanced AI learning experience in the comprehensive learn page
- Advanced video-AI integration features
- Better user experience with richer AI interactions
- Unified AI system across the platform

---

## 🔍 **Current Implementation Comparison**

### **V1 AI Sidebar (Learn Page)** 
```typescript
// Current: Basic AIChatSidebar
const AIChatSidebar = dynamic(
  () => import("@/components/student/ai/ai-chat-sidebar"),
  { ssr: false }
)

// Usage:
<AIChatSidebar
  courseId={isCourse ? contentId : "lesson"} 
  videoId={isCourse ? currentVideoId : contentId}
  currentTime={currentTime}
  onAgentTrigger={handleAgentTrigger}
/>
```

**Features:**
- Basic AI chat functionality
- Simple agent triggering
- Limited video integration
- Basic state management

### **V2 AI Sidebar (Video Page)**
```typescript  
// Target: Advanced AIChatSidebarV2
const AIChatSidebarV2 = dynamic(
  () => import("@/components/student/ai/AIChatSidebarV2"),
  { ssr: false }
)

// Usage:
<AIChatSidebarV2
  messages={context.messages}
  isVideoPlaying={context.videoState?.isPlaying || false}
  onAgentRequest={handleAgentRequest}
  onAgentAccept={(id) => dispatch({ type: 'ACCEPT_AGENT', payload: id })}
  onAgentReject={(id) => dispatch({ type: 'REJECT_AGENT', payload: id })}
  onQuizAnswer={handleQuizAnswer}
  onReflectionSubmit={handleReflectionSubmit}
  onReflectionTypeChosen={handleReflectionTypeChosen}
  onReflectionCancel={handleReflectionCancel}
  onSetInPoint={handleSetInPoint}
  onSetOutPoint={handleSetOutPoint}
  onClearSegment={handleClearSegment}
  onSendSegmentToChat={handleSendSegmentToChat}
  context={context}
/>
```

**Advanced Features:**
- State machine integration (`useVideoAgentSystem`)
- Complex agent workflows (hint, quiz, reflect, path)
- Video segment handling and selection
- Rich reflection system with multiple types
- Advanced quiz system with answer handling
- Bidirectional video-AI communication

### **Learn Page Component Complexity**
```typescript
// Major Components in Learn Page:
- VideoPlayer (StudentVideoPlayer) - Different from V2!
- AIChatSidebar - Resizable sidebar with AI features
- CommentsSection - User discussions
- RelatedLessonsCarousel - Course recommendations
- Course Content Navigation - Section-based video lists
- Email Capture Modals - Lead generation
- Exit Intent Popups - User retention

// Advanced Features:
- Lazy loading of section videos
- Background video preloading
- Resizable sidebar with drag handles
- Multiple video player states
- Course vs standalone lesson modes
- Instructor preview mode
- Free tier limitations and upsells
```

### **Data Flow Differences**

#### **Video Page Data Flow**
1. **Route Parameters**: `courseId`, `videoId`
2. **Store Integration**: Basic video and course loading
3. **Rendering**: Simple conditional - loading → video → error

#### **Learn Page Data Flow**
1. **Complex State Management**:
   - Multiple loading states (`courseLoadingState`, `lessonLoading`)
   - Section video lazy loading (`sectionVideos`, `loadingSections`)
   - UI state (sidebar width, modals, email capture)
   - AI interaction tracking and limits

2. **Advanced Data Loading**:
   - Course sections with lazy-loaded videos
   - Background API calls for section media
   - Multiple data sources (course, lessons, sections)
   - Conditional loading based on content type

3. **Route Management**:
   - Query param handling (`?video=`, `?instructor=`)
   - URL updates on video switching
   - Redirect logic for 404s and access control

---

## 📋 **Migration Strategy**

### **🎯 AI SIDEBAR V2 MIGRATION APPROACH**

**Philosophy:** Replace the basic V1 AI sidebar in the learn page with the advanced V2 sidebar from the video page, including all enhanced features and state management.

### **Two-Phase Migration Strategy**

#### **Phase 1: Component & UI Migration**
1. **Replace AIChatSidebar with AIChatSidebarV2**: Update dynamic import
2. **Extract State Machine**: Add `useVideoAgentSystem` to learn page
3. **Migrate Handler Functions**: Copy all V2 event handlers 
4. **Update Sidebar Props**: Pass V2-specific props and context
5. **Visual Integration**: Ensure V2 sidebar fits learn page layout

#### **Phase 2: Feature Integration & Testing**
1. **Agent System Integration**: Connect agents to learn page video player
2. **Video Player Bridge**: Create communication between V1 player and V2 sidebar
3. **Context Management**: Ensure proper context flow for AI features
4. **Event Handler Testing**: Verify all interactions work
5. **State Synchronization**: Ensure learn page state works with V2 features

### **Benefits of This Approach**
- **Lower Risk**: UI changes isolated from API changes
- **Easier Testing**: Visual verification before functionality
- **Cleaner Code**: Separation of concerns during migration
- **Rollback Safety**: Can revert UI or API changes independently

### **Migration Targets**

#### **UI Components to Extract:**
```typescript
// From video page to layout:
- StudentVideoPlayerV2 (full component)
- Loading states and spinners
- Error handling UI
- Fixed viewport layout structure
- Video controls and overlays
```

#### **Keep in Learn Page:**
```typescript
// Existing learn page retains:
- StudentVideoPlayer (for comparison)
- Course navigation and sections
- Comments and related content
- AI sidebar and modals
- Complex state management
```

---

## 🛠️ **Phase 1: Extract V2 Sidebar Components**

### **Step 1: Replace AIChatSidebar Import**
```typescript
// In /src/app/student/courses/learn/[id]/page.tsx

// REMOVE: Old V1 sidebar
// const AIChatSidebar = dynamic(
//   () => import("@/components/student/ai/ai-chat-sidebar").then(mod => ({
//     default: mod.AIChatSidebar
//   })),
//   { ssr: false }
// )

// ADD: New V2 sidebar
const AIChatSidebarV2 = dynamic(
  () => import("@/components/student/ai/AIChatSidebarV2").then(mod => ({
    default: mod.AIChatSidebarV2
  })),
  { 
    loading: () => (
      <div className="h-full flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
)
```

### **Step 2: Extract Video UI Components**
```typescript
// Create VideoLayoutWrapper with static UI first
function VideoLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 top-16 bg-background">
      <StudentVideoPlayerV2
        videoUrl="https://example.com/placeholder-video.mp4" // Static for now
        title="Sample Video Title"
        transcript=""
        videoId="placeholder-id"
        onTimeUpdate={() => {}}
        onPause={() => {}}
        onPlay={() => {}}
        onEnded={() => {}}
      />
    </div>
  )
}
```

### **Step 3: Create Video Page Stub**
```typescript
// /src/app/student/courses/learn/[id]/video/[videoId]/page.tsx
export default function VideoPage() {
  // Layout now handles all UI rendering
  return null
}
```

### **Step 4: Test UI Rendering**
- Verify video player loads in layout
- Check responsive behavior
- Test loading states
- Validate visual appearance

---

## 🔌 **Phase 2: API Re-integration**

### **Step 1: Move Store Connections to Layout**
```typescript
// Add Zustand store integration
export default function LearnLayout({ children }: LayoutProps) {
  const {
    currentVideo,
    loadStudentVideo,
    currentCourse,
    loadCourseById
  } = useAppStore()
  
  // ... route detection logic
}
```

### **Step 2: Implement Data Loading**
```typescript
function VideoLayoutWrapper({ children, videoId, courseId }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const { currentVideo, loadStudentVideo, loadCourseById } = useAppStore()
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([
        loadStudentVideo(videoId),
        loadCourseById(courseId)
      ])
      setIsLoading(false)
    }
    loadData()
  }, [videoId, courseId])
  
  // ... rest of implementation
}
```

### **Step 3: Extract Route Parameters**
```typescript
export default function LearnLayout({ children }: LayoutProps) {
  const pathname = usePathname()
  const params = useParams()
  
  // Extract IDs from pathname
  const videoMatch = pathname.match(/\/video\/([^\/]+)/)
  const videoId = videoMatch ? videoMatch[1] : null
  const courseId = params.id as string
  
  // ... pass to VideoLayoutWrapper
}
```

### **Step 4: Implement Event Handlers**
```typescript
function VideoLayoutWrapper(props: Props) {
  const handleTimeUpdate = (time: number) => {
    // Re-implement time tracking logic
  }
  
  const handlePause = (time: number) => {
    // Re-implement pause logic
  }
  
  const handlePlay = () => {
    // Re-implement play logic
  }
  
  const handleEnded = () => {
    // Re-implement video end logic
  }
  
  return (
    <div className="fixed inset-0 top-16 bg-background">
      <StudentVideoPlayerV2
        videoUrl={currentVideo?.videoUrl || ''}
        title={currentVideo?.title || ''}
        transcript={currentVideo?.transcript?.join(' ') || ''}
        videoId={props.videoId}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handleEnded}
      />
    </div>
  )
}
```

### **Step 5: Handle Error States**
```typescript
// Add error handling back to layout
if (isLoading) {
  return <LoadingState />
}

if (!currentVideo) {
  return <VideoNotFoundState />
}
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

## 📋 **Component Extraction Plan**

### **Components to Move to Layout**
```typescript
// From VideoPlayerPage to LearnLayout:
1. StudentVideoPlayerV2 import and configuration
2. Loading state UI and error handling
3. Fixed viewport structure (fixed inset-0 top-16)
4. Video data transformation logic
5. Event handlers (onTimeUpdate, onPause, etc.)
```

### **Layout Structure**
```typescript
// New layout.tsx structure:
export default function LearnLayout({ children }) {
  const isVideoRoute = useVideoRouteDetection()
  
  if (isVideoRoute) {
    return <VideoPlayerLayout />
  }
  
  return <StandardLearnLayout>{children}</StandardLearnLayout>
}
```

---

## 🛤️ **Layout Implementation**

### **Phase 1: Static UI Layout**
```typescript
// Initial implementation with placeholder data
const VideoPlayerLayout = () => (
  <div className="fixed inset-0 top-16 bg-background">
    <StudentVideoPlayerV2
      videoUrl="placeholder"
      title="Loading..."
      // ... static props
    />
  </div>
)
```

### **Phase 2: Dynamic Data Integration**
```typescript
// Add real data loading and state management
const VideoPlayerLayout = () => {
  const { videoId, courseId } = useRouteParams()
  const { currentVideo, isLoading } = useVideoData(videoId, courseId)
  
  if (isLoading) return <VideoLoadingState />
  if (!currentVideo) return <VideoNotFoundState />
  
  return (
    <div className="fixed inset-0 top-16 bg-background">
      <StudentVideoPlayerV2
        videoUrl={currentVideo.videoUrl}
        title={currentVideo.title}
        // ... dynamic props
      />
    </div>
  )
}
```

### **Route Integration**
- **Existing Routes**: Continue to work unchanged
- **New Routes**: `/courses/learn/[id]/video/[videoId]` handled by layout
- **Fallback**: Non-video routes render standard learn page

---

## ✅ **Testing & Validation**

### **Phase 1: UI Testing (Static Implementation)**
- [ ] **Route Detection**: Layout correctly identifies `/video/` paths
- [ ] **Component Loading**: `StudentVideoPlayerV2` renders in layout
- [ ] **Visual Consistency**: Matches original video page appearance
- [ ] **Responsive Design**: Works across device sizes
- [ ] **Loading States**: Spinner displays during component load
- [ ] **Error Boundaries**: Graceful handling of component failures
- [ ] **Navigation**: Can access video routes without crashes

### **Phase 2: API Integration Testing**
- [ ] **Data Loading**: Store functions execute in layout context
- [ ] **Route Parameters**: Correct extraction of `videoId`/`courseId`
- [ ] **Store Connection**: Video data flows to component props
- [ ] **Loading States**: Real API loading states function
- [ ] **Error Handling**: Missing videos show proper error UI
- [ ] **Event Handlers**: Video events (play, pause, time) work
- [ ] **View Tracking**: Analytics and tracking still function

### **Integration & Regression Testing**
- [ ] **Learn Page Preservation**: Original learn page unaffected
- [ ] **Course Navigation**: Section navigation still works
- [ ] **AI Features**: Chat sidebar and AI interactions preserved
- [ ] **Comments**: User comments section functioning
- [ ] **Mobile Experience**: Touch interactions and responsiveness
- [ ] **Performance**: No significant load time increases
- [ ] **Memory Management**: No memory leaks in layout

### **Migration Success Criteria**
- [ ] **Zero Functionality Loss**: All original features work
- [ ] **Improved Architecture**: Cleaner separation of concerns
- [ ] **Maintainable Code**: Easy to understand and modify
- [ ] **User Experience**: Seamless video viewing experience

---

## 🚀 **Deployment Considerations**

### **⚠️ REVISED DEPLOYMENT STRATEGY**

### **Breaking Changes Assessment**
- **MINIMAL IMPACT**: Layout approach preserves existing functionality
- **NO ROUTE CHANGES**: Existing learn page routes continue to work
- **COMPONENT PRESERVATION**: Both video players can coexist
- **FEATURE CONTINUITY**: Rich learning experience remains intact

### **Phased Migration Path**
1. **Phase 1**: Enhance layout with conditional rendering
2. **Phase 2**: Test fullscreen video routes in layout
3. **Phase 3**: Gradually integrate V2 player features into learn page
4. **Phase 4**: Standardize on single video player (if desired)

### **Risk Mitigation**
- **Feature Flags**: Control migration rollout per user segment
- **A/B Testing**: Compare video player performance
- **Rollback Ready**: Original learn page stays functional
- **User Experience**: No disruption to existing workflows

### **Testing Requirements**
- **Learn Page**: All existing features must work (comments, AI, navigation)
- **Video Routes**: Fullscreen experience should be seamless
- **Course Navigation**: Section-based video switching
- **Mobile Experience**: Responsive behavior on all devices
- **Performance**: Lazy loading and background API calls

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