# AI Sidebar V2 Migration - Implementation Steps

**Date:** 2025-08-28  
**Task:** Migrate AIChatSidebarV2 from video page to learn page
**Source:** `StudentVideoPlayerV2` → **Target:** Learn page

---

## 🛠️ **Phase 1: Component Replacement**

### **Step 1: Update Dynamic Import in Learn Page**
```typescript
// File: /src/app/student/courses/learn/[id]/page.tsx

// REMOVE this import:
const AIChatSidebar = dynamic(
  () => import("@/components/student/ai/ai-chat-sidebar").then(mod => ({
    default: mod.AIChatSidebar
  })),
  { ssr: false }
)

// REPLACE with V2 import:
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

### **Step 2: Add Video Agent System Hook**
```typescript
// Add this import at the top:
import { useVideoAgentSystem } from "@/lib/video-agent-system"

// Add this hook in the component:
export default function StandaloneLessonPage() {
  // ... existing code ...
  
  // ADD: Video agent system for V2 sidebar
  const { context, dispatch, setVideoRef } = useVideoAgentSystem()
  
  // ... rest of component
}
```

### **Step 3: Add V2 Event Handlers**
```typescript
// ADD: All V2 event handlers (copy from StudentVideoPlayerV2)

const handleAgentRequest = (agentType: string) => {
  const currentTime = 0 // Get from video player ref
  console.log('[Learn Page] Agent button clicked:', agentType, currentTime)
  
  dispatch({
    type: 'AGENT_BUTTON_CLICKED',
    payload: { agentType, time: currentTime }
  })
}

const handleQuizAnswer = (questionId: string, selectedAnswer: number) => {
  console.log('[Learn Page] Quiz answer selected:', { questionId, selectedAnswer })
  
  dispatch({
    type: 'QUIZ_ANSWER_SELECTED',
    payload: { questionId, selectedAnswer }
  })
}

const handleReflectionSubmit = (type: string, data: any) => {
  console.log('[Learn Page] Reflection submitted:', { type, data })
  
  dispatch({
    type: 'REFLECTION_SUBMITTED',
    payload: { type, data }
  })
}

const handleReflectionTypeChosen = (reflectionType: string) => {
  console.log('[Learn Page] Reflection type chosen:', reflectionType)
  
  dispatch({
    type: 'REFLECTION_TYPE_CHOSEN',
    payload: { reflectionType }
  })
}

const handleReflectionCancel = () => {
  console.log('[Learn Page] Reflection cancelled')
  
  dispatch({
    type: 'REFLECTION_CANCELLED',
    payload: {}
  })
}

const handleSetInPoint = () => {
  console.log('[Learn Page] Setting in point')
  dispatch({
    type: 'SET_IN_POINT',
    payload: {}
  })
}

const handleSetOutPoint = () => {
  console.log('[Learn Page] Setting out point')
  dispatch({
    type: 'SET_OUT_POINT',
    payload: {}
  })
}

const handleClearSegment = () => {
  console.log('[Learn Page] Clearing segment')
  dispatch({
    type: 'CLEAR_SEGMENT',
    payload: {}
  })
}

const handleSendSegmentToChat = () => {
  console.log('[Learn Page] Sending segment to chat')
  dispatch({
    type: 'SEND_SEGMENT_TO_CHAT',
    payload: {}
  })
}
```

### **Step 4: Update Sidebar Usage**
```typescript
// REPLACE the old sidebar usage:
{showChatSidebar && (
  <>
    {/* Resize Handle - keep existing */}
    <div
      className="w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors relative group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
    </div>
    
    {/* Sidebar - REPLACE AIChatSidebar with AIChatSidebarV2 */}
    <div 
      ref={sidebarRef}
      className="flex-shrink-0 h-full overflow-hidden border-l"
      style={{ width: `${sidebarWidth}px` }}
    >
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
    </div>
  </>
)}
```

---

## 🔌 **Phase 2: Video Player Integration**

### **Step 5: Connect V2 Sidebar to V1 Video Player**
```typescript
// The learn page uses StudentVideoPlayer (V1)
// We need to bridge it with the V2 sidebar

const handleTimeUpdate = (time: number) => {
  // Existing functionality
  // ... existing code ...
  
  // NEW: Update V2 context with time
  dispatch({
    type: 'VIDEO_TIME_UPDATE',
    payload: { time }
  })
}

const handleVideoPause = (time: number) => {
  console.log('Paused at', time)
  
  // NEW: Notify V2 context
  dispatch({
    type: 'VIDEO_MANUALLY_PAUSED',
    payload: { time }
  })
}

const handleVideoPlay = () => {
  console.log('Playing')
  
  // NEW: Notify V2 context
  dispatch({
    type: 'VIDEO_PLAYED',
    payload: {}
  })
}
```

### **Step 6: Update Video Player Props**
```typescript
// Update the VideoPlayer component usage:
<VideoPlayer
  videoUrl={currentVideo?.videoUrl || ''}
  title={currentVideo?.title || ''}
  transcript={currentVideo?.transcript || []}
  videoId={isCourse ? currentVideoId : contentId}
  onTimeUpdate={handleTimeUpdate}
  onPause={handleVideoPause}        // Updated
  onPlay={handleVideoPlay}          // Updated
  onEnded={() => console.log('Video ended')}
/>
```

### **Step 7: Add Video Player Reference**
```typescript
// If you need imperative control, add a ref
import { useRef } from 'react'
import { StudentVideoPlayerRef } from '@/components/video/student/StudentVideoPlayer'

const videoPlayerRef = useRef<StudentVideoPlayerRef>(null)

// Pass ref to VideoPlayer
<VideoPlayer
  ref={videoPlayerRef}
  // ... other props
/>

// Update agent request handler to use ref
const handleAgentRequest = (agentType: string) => {
  const currentTime = videoPlayerRef.current?.getCurrentTime() || 0
  console.log('[Learn Page] Agent button clicked:', agentType, currentTime)
  
  dispatch({
    type: 'AGENT_BUTTON_CLICKED',
    payload: { agentType, time: currentTime }
  })
}
```

---

## ✅ **Testing Checklist**

### **Phase 1: UI Integration**
- [ ] V2 sidebar loads without errors
- [ ] Sidebar renders in learn page layout
- [ ] Resize functionality still works
- [ ] No TypeScript errors
- [ ] All event handlers are defined

### **Phase 2: Functionality**
- [ ] Agent buttons trigger correctly
- [ ] Quiz interactions work
- [ ] Reflection system functions
- [ ] Segment selection works
- [ ] Video-sidebar communication works
- [ ] Time updates flow to V2 context
- [ ] State machine updates correctly

### **Integration Testing**
- [ ] Learn page functionality preserved
- [ ] Course navigation still works
- [ ] V1 video player works with V2 sidebar
- [ ] No memory leaks
- [ ] Performance acceptable

---

## 🚨 **Common Issues & Solutions**

### **Import Errors**
```typescript
// If you get import errors:
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useVideoAgentSystem } from "@/lib/video-agent-system"
```

### **Context/State Issues**
```typescript
// Make sure context is passed correctly:
context={context}  // Pass the full context object

// Check that dispatch is working:
console.log('Context:', context)
console.log('Dispatch:', dispatch)
```

### **Video Player Bridge Issues**
```typescript
// If video events aren't reaching sidebar:
// 1. Check that all event handlers are connected
// 2. Verify dispatch calls are correct
// 3. Check that context.videoState is updating
```

---

## 🎯 **Success Criteria**

✅ **V2 Sidebar fully functional in learn page**  
✅ **All AI features work (agents, quiz, reflection, segments)**  
✅ **Video player communicates with V2 sidebar**  
✅ **No regression in learn page functionality**  
✅ **Performance is acceptable**  
✅ **User experience is seamless**

---

**Migration Complete!** 🎉

The learn page now has the advanced V2 AI sidebar with all enhanced features while maintaining its comprehensive learning experience.