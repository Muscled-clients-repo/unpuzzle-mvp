# Conversation Upload Implementation Plan

## Overview
Implementation plan for conversation message attachment uploads using existing patterns from the video/media upload system, adapted for real-time conversation context.

## Existing Patterns Analysis

### Pattern 1: WebSocket Upload Progress Pattern
**File:** `logs/2025-09-08/WebSocket-Real-Time-Upload-Progress-Pattern.md`

**Current Implementation:**
- WebSocket Server broadcasts upload events
- Observer pattern routes events to components
- TanStack Query manages cache invalidation
- Individual progress tracking per upload

**Adaptations Needed for Conversations:**
1. **New Event Types:**
   ```typescript
   CONVERSATION_UPLOAD_EVENTS = {
     MESSAGE_ATTACHMENT_UPLOAD_START: 'message-attachment-upload-start',
     MESSAGE_ATTACHMENT_UPLOAD_PROGRESS: 'message-attachment-upload-progress',
     MESSAGE_ATTACHMENT_UPLOAD_COMPLETE: 'message-attachment-upload-complete',
     MESSAGE_ATTACHMENT_UPLOAD_ERROR: 'message-attachment-upload-error'
   }
   ```

2. **Context-Specific Data:**
   - `messageId` (for existing message updates)
   - `conversationId`
   - `studentId`
   - `attachmentType: 'new' | 'replacement'`

### Pattern 2: Observer Pattern Implementation
**File:** `logs/2025-09-08/observer-pattern-websocket-implementation-plan.md`

**Current Implementation:**
- `courseEventObserver` centralized event routing
- Type-safe event handling
- Subscription management

**Extensions for Conversations:**
1. **New Observer Events in `course-event-observer.ts`:**
   ```typescript
   export const CONVERSATION_UPLOAD_EVENTS = {
     ATTACHMENT_UPLOAD_START: 'conversation-attachment-upload-start',
     ATTACHMENT_UPLOAD_PROGRESS: 'conversation-attachment-upload-progress',
     ATTACHMENT_UPLOAD_COMPLETE: 'conversation-attachment-upload-complete'
   } as const
   ```

2. **Event Data Interfaces:**
   ```typescript
   interface ConversationAttachmentUploadProgressEvent {
     uploadId: string
     messageId?: string
     conversationId: string
     fileName: string
     progress: number
     timeRemaining?: number
     status: 'uploading' | 'processing' | 'completed' | 'error'
   }
   ```

### Pattern 3: Media Upload Architecture
**File:** `logs/patterns/16-Multiple-Video-Upload-Management-Pattern.md`

**Current Implementation:**
- Zustand store for upload state
- Per-file progress tracking
- Queue management
- Error handling

**Conversation-Specific Adaptations:**
1. **New Upload Store Slice:**
   ```typescript
   interface ConversationUploadState {
     uploads: Record<string, ConversationUploadItem>
     activeUploads: string[]
     editModeUploads: Record<string, string[]> // messageId -> uploadIds
   }
   ```

2. **Upload Item Structure:**
   ```typescript
   interface ConversationUploadItem {
     id: string
     messageId?: string // For edits
     file: File
     progress: number
     status: 'queued' | 'uploading' | 'completed' | 'error'
     error?: string
     attachmentId?: string // After completion
   }
   ```

## Implementation Phases

### Phase 1: Existing Attachments Display
**Pattern Used:** Component reuse from `DailyGoalTrackerV2`

**Implementation:**
1. **Extend `handleEditStudentNote`:**
   ```typescript
   const handleEditStudentNote = (message) => {
     // Set text content
     messageForm.setMessageText(message.content)

     // Pre-populate existing attachments
     const existingAttachments = message.attachments?.map(att => ({
       id: att.id,
       type: 'existing',
       url: att.cdn_url,
       name: att.original_filename,
       size: att.file_size,
       mimeType: att.mime_type
     })) || []

     messageForm.setExistingAttachments(existingAttachments)
   }
   ```

2. **Enhanced Form State:**
   - `existingAttachments`: Server attachments with CDN URLs
   - `newAttachments`: File objects for new uploads
   - Combined display logic

### Phase 2: WebSocket Upload Progress Integration
**Patterns Used:**
- `WebSocket-Real-Time-Upload-Progress-Pattern.md`
- `use-media-progress.ts` architecture

**New Hook: `use-conversation-upload-progress.ts`**
```typescript
export function useConversationUploadProgress(conversationId: string) {
  const uploadStore = useConversationUploadStore()
  const userId = useAppStore(state => state.user?.id)

  // Reuse WebSocket connection
  useWebSocketConnection(userId || '')

  useEffect(() => {
    // Subscribe to conversation upload events
    const unsubscribe = courseEventObserver.subscribe(
      CONVERSATION_UPLOAD_EVENTS.ATTACHMENT_UPLOAD_PROGRESS,
      handleUploadProgress
    )
    return unsubscribe
  }, [conversationId])
}
```

### Phase 3: Upload Queue Management
**Pattern Used:** `16-Multiple-Video-Upload-Management-Pattern.md`

**Implementation:**
1. **Queue Processing:**
   - Sequential uploads per conversation
   - Parallel uploads across conversations
   - Priority for edit mode (update existing message)

2. **State Management:**
   ```typescript
   // In InlineMessageComposer
   const uploadQueue = useConversationUploadStore(state =>
     state.getUploadsForMessage(editingMessageId)
   )

   const startUpload = (files: File[]) => {
     files.forEach(file => {
       uploadStore.addUpload({
         id: generateUploadId(),
         messageId: editingMessageId,
         file,
         conversationId
       })
     })
   }
   ```

### Phase 4: Progress UI Components
**Pattern Used:** `UploadProgress.tsx` + `UploadProgressPanel.tsx`

**New Component: `ConversationUploadProgress.tsx`**
```typescript
interface ConversationUploadProgressProps {
  uploadId: string
  className?: string
  showFileName?: boolean
}

export function ConversationUploadProgress({ uploadId }: ConversationUploadProgressProps) {
  const upload = useConversationUploadStore(state => state.uploads[uploadId])

  return (
    <div className="relative">
      {/* Image thumbnail with progress overlay */}
      <DailyNoteImage
        privateUrl={URL.createObjectURL(upload.file)}
        originalFilename={upload.file.name}
        className="w-full h-32"
      />

      {/* Progress overlay */}
      <div className="absolute inset-0 bg-black/50">
        <UploadProgress item={{
          uploadProgress: upload.progress,
          uploadTimeRemaining: upload.timeRemaining,
          status: upload.status
        }} />
      </div>
    </div>
  )
}
```

## Pattern Modifications Required

### 1. WebSocket Server Extensions
**File:** `src/lib/websocket-server.ts`

**Additions:**
```typescript
// Add conversation upload event routing
case 'message-attachment-upload-progress':
  // Route to conversation participants
  const conversationParticipants = await getConversationParticipants(data.conversationId)
  conversationParticipants.forEach(userId => {
    broadcastToUser(userId, event)
  })
  break
```

### 2. Course Event Observer Extensions
**File:** `src/lib/course-event-observer.ts`

**Additions:**
```typescript
export const CONVERSATION_UPLOAD_EVENTS = {
  ATTACHMENT_UPLOAD_START: 'conversation-attachment-upload-start',
  ATTACHMENT_UPLOAD_PROGRESS: 'conversation-attachment-upload-progress',
  ATTACHMENT_UPLOAD_COMPLETE: 'conversation-attachment-upload-complete',
  ATTACHMENT_UPLOAD_ERROR: 'conversation-attachment-upload-error'
} as const

// Event interfaces for conversation uploads
export interface ConversationAttachmentUploadStartEvent {
  uploadId: string
  messageId?: string
  conversationId: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface ConversationAttachmentUploadProgressEvent {
  uploadId: string
  progress: number
  timeRemaining?: number
  status: 'uploading' | 'processing'
}

export interface ConversationAttachmentUploadCompleteEvent {
  uploadId: string
  attachmentId: string
  cdnUrl: string
}
```

### 3. Upload Actions Integration
**File:** `src/lib/actions/conversation-actions.ts`

**New Function:**
```typescript
export async function uploadMessageAttachmentsWithProgress(
  messageId: string,
  files: FormData,
  onProgress?: (uploadId: string, progress: number) => void
) {
  // Implementation that broadcasts progress via WebSocket
  // Follows same pattern as video upload actions
}
```

### 4. Form State Management
**File:** `src/hooks/use-message-form.ts`

**Extensions:**
```typescript
interface MessageFormState {
  // Existing fields...
  existingAttachments: ExistingAttachment[]
  newAttachments: File[]
  uploadProgress: Record<string, number>
}

interface ExistingAttachment {
  id: string
  url: string
  name: string
  size: number
  mimeType: string
}
```

## Implementation Order

1. **Phase 1 (Immediate):** Show existing attachments in edit mode
   - Extend form state to handle existing attachments
   - Reuse `DailyNoteImage` component
   - Enable modal viewer for existing images

2. **Phase 2 (Core Functionality):** WebSocket upload progress
   - Extend event observer with conversation events
   - Create conversation upload progress hook
   - Add per-file progress indicators

3. **Phase 3 (Enhanced UX):** Upload queue management
   - Add upload store for conversation attachments
   - Implement queue processing
   - Add error handling and retry logic

4. **Phase 4 (Polish):** Advanced progress UI
   - Create specialized progress components
   - Add batch upload indicators
   - Implement upload cancellation

## Testing Strategy

**Pattern Used:** `logs/2025-09-08/observer-pattern-testing-plan.md`

1. **Unit Tests:**
   - Upload progress hook behavior
   - Form state management with mixed attachment types
   - Event observer subscription/unsubscription

2. **Integration Tests:**
   - WebSocket event flow
   - Upload queue processing
   - Error handling and recovery

3. **E2E Tests:**
   - Complete upload flow from file selection to completion
   - Edit mode with existing attachments
   - Modal viewer functionality

## Conclusion

This implementation leverages existing patterns while extending them appropriately for conversation context. The key is maintaining architectural consistency while adding conversation-specific features like message editing with mixed attachment types and real-time collaborative upload feedback.