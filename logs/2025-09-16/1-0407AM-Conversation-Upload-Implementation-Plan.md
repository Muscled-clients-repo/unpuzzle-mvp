# Conversation Upload Implementation Plan

## Overview
Implementation plan for conversation message attachment uploads using existing patterns, focusing on real-time progress and existing attachment display.

## Core Strategy

### Pattern Sources (✅ All Verified)
- **WebSocket Progress:** `logs/2025-09-08/WebSocket-Real-Time-Upload-Progress-Pattern.md`
- **Observer Pattern:** `src/lib/course-event-observer.ts`
- **Upload Progress UI:** `src/components/ui/UploadProgress.tsx`
- **Media Progress Hook:** `src/hooks/use-media-progress.ts`

### Key Adaptations Needed
1. **Add upload events to existing CONVERSATION_EVENTS**
2. **Extend existing message form hook for upload progress**
3. **Reuse existing UploadProgress component in InlineMessageComposer**
4. **Show existing attachments when editing messages**

## Component Architecture

### Active Components (✅ All Verified)
- **Main UI:** `DailyGoalTrackerV2.tsx` - Timeline with message editing
- **Input:** `InlineMessageComposer.tsx` - File upload with drag/drop
- **Form:** `use-message-form.ts` - State management
- **WebSocket:** `use-conversation-websocket.ts` - Real-time updates
- **Progress:** `UploadProgress.tsx` - Reusable progress component

## Implementation Phases

### Phase 1: Show Existing Attachments
- Extend message form to handle existing attachments
- Display existing images in edit mode using DailyNoteImage
- Enable modal viewer for existing attachments

### Phase 2: Upload Progress Infrastructure
- Add upload events to CONVERSATION_EVENTS
- Extend conversation WebSocket hook for upload subscriptions
- Add progress tracking to message form hook

### Phase 3: Progress UI Integration
- Add progress overlay to InlineMessageComposer
- Reuse existing UploadProgress component
- Handle upload states in file previews

### Phase 4: Backend Integration
- Extend conversation actions for upload progress broadcasting
- Update WebSocket server routing
- Add error handling and retry logic

## Files to Modify

### Core Extensions
- **course-event-observer.ts** - Add 4 upload events to CONVERSATION_EVENTS
- **use-message-form.ts** - Add upload progress and existing attachment support
- **use-conversation-websocket.ts** - Subscribe to upload events
- **InlineMessageComposer.tsx** - Show existing attachments, add progress overlay
- **DailyGoalTrackerV2.tsx** - Pre-populate existing attachments on edit

### Backend Integration
- **conversation-actions.ts** - Add upload progress broadcasting
- **websocket-server.ts** - Route upload events to conversation participants

### Testing Strategy
Follow existing observer pattern testing approach from `logs/2025-09-08/observer-pattern-testing-plan.md`

## Verified Existing Components ✅

**Active Conversation Components:**
- `src/components/conversation/ConversationIntegrationV2.tsx` - Main integration component
- `src/components/conversation/DailyGoalTrackerV2.tsx` - Conversation UI with timeline
- `src/components/conversation/InlineMessageComposer.tsx` - Message input with file upload

**Supporting Infrastructure:**
- `src/hooks/use-conversation-websocket.ts` - Real-time WebSocket integration
- `src/hooks/use-message-form.ts` - Form state management
- `src/lib/course-event-observer.ts` - Event routing with CONVERSATION_EVENTS
- `src/lib/actions/conversation-actions.ts` - Server actions for conversations
- `src/components/ui/UploadProgress.tsx` - Reusable progress component
- `src/hooks/use-media-progress.ts` - Upload progress pattern reference

**Deleted/Unused Components (Cleaned up):**
- ❌ MessageCard, MessageList, UnifiedConversationContainer
- ❌ ConversationIntegration (V1), MessageComposer, ConversationHeader
- ❌ MessageAttachments, ImageViewerModal, test-import.tsx

## Conclusion

This implementation leverages **verified existing patterns** while extending them appropriately for conversation context. All referenced components have been confirmed to exist in the current codebase. The key is maintaining architectural consistency while adding conversation-specific features like message editing with mixed attachment types and real-time collaborative upload feedback.

**Implementation is ready to proceed** with confidence that all referenced patterns and components exist.