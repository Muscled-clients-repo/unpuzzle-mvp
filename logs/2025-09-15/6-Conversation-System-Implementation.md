# Student-Instructor Conversation System Implementation Guide

**Date:** September 15, 2025
**Architecture Reference:** [00-Architecture-Principles-Course-Creation-Edit-Flow-0939AM-2025-09-07.md](../patterns/00-Architecture-Principles-Course-Creation-Edit-Flow-0939AM-2025-09-07.md)

## Overview

This document provides the technical implementation details for migrating from the current fragmented conversation system to a unified conversation architecture following the established 3-layer SSOT principles.

## Current System Analysis

### Current Table Structure (Fragmented)
```
❌ CURRENT: 6 separate tables
├── user_daily_notes
├── daily_note_files
├── user_actions
├── instructor_goal_responses
├── instructor_response_files
└── action_types
```

### Current Performance Issues
- **N+1 Query Problem:** Each conversation page makes 10+ database queries
- **Complex State Management:** Multiple TanStack queries for single conversation view
- **File Handling Duplication:** Separate file logic for student vs instructor attachments
- **Real-time Complexity:** WebSocket updates across multiple table watchers

## Proposed Unified Schema

### New Table Structure (Consolidated)
```sql
-- 1. Single conversation container
CREATE TABLE goal_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    instructor_id UUID REFERENCES profiles(id),
    goal_id UUID REFERENCES track_goals(id),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Unified message stream
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES goal_conversations(id) NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    message_type TEXT NOT NULL, -- 'daily_note', 'instructor_response', 'activity', 'milestone'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Activity details, response type, etc.
    reply_to_id UUID REFERENCES conversation_messages(id), -- For threading
    target_date DATE, -- For daily entries
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Unified attachment handling
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES conversation_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    cdn_url TEXT NOT NULL,
    backblaze_file_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance Indexes
```sql
-- Optimized for conversation access patterns
CREATE INDEX idx_conversations_student ON goal_conversations(student_id);
CREATE INDEX idx_conversations_instructor ON goal_conversations(instructor_id);

-- Optimized for chronological message access
CREATE INDEX idx_messages_conversation_date ON conversation_messages(conversation_id, target_date DESC NULLS LAST, created_at DESC);
CREATE INDEX idx_messages_type_sender ON conversation_messages(message_type, sender_id);
CREATE INDEX idx_messages_reply_thread ON conversation_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Optimized for attachment retrieval
CREATE INDEX idx_attachments_message ON message_attachments(message_id);
```

## API Layer Implementation

### Single Query for Complete Conversation
```typescript
// NEW: Single query replaces 10+ queries
export async function getConversationData(studentId: string, options: {
  startDate?: string
  endDate?: string
  limit?: number
} = {}) {
  const supabase = await createClient()

  // Single optimized query with all data
  const { data, error } = await supabase
    .from('conversation_messages')
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, role, avatar_url),
      attachments:message_attachments(*),
      reply_to:conversation_messages!reply_to_id(id, content, sender_id)
    `)
    .eq('conversation.student_id', studentId)
    .gte('target_date', options.startDate || '2024-01-01')
    .lte('target_date', options.endDate || '2025-12-31')
    .order('target_date', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(options.limit || 50)

  if (error) throw error
  return data
}
```

### Unified Message Creation
```typescript
export async function createMessage(data: {
  conversationId: string
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  content: string
  targetDate?: string
  replyToId?: string
  metadata?: Record<string, any>
  attachments?: FormData
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Create message
  const { data: message, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: data.conversationId,
      sender_id: user.id,
      message_type: data.messageType,
      content: data.content,
      target_date: data.targetDate,
      reply_to_id: data.replyToId,
      metadata: data.metadata || {}
    })
    .select()
    .single()

  if (error) throw error

  // Handle file attachments if present
  if (data.attachments) {
    const uploadResults = await uploadMessageAttachments({
      messageId: message.id,
      files: data.attachments
    })
  }

  return message
}
```

## Frontend Implementation

### TanStack Query Integration
```typescript
// Conversation data hook
export function useConversationData(studentId: string) {
  return useQuery({
    queryKey: ['conversation', studentId],
    queryFn: () => getConversationData(studentId),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  })
}

// Message creation mutation
export function useCreateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMessage,
    onSuccess: (newMessage) => {
      // Optimistic update
      queryClient.setQueryData(
        ['conversation', newMessage.conversation_id],
        (old: any[]) => [...old, newMessage]
      )

      // Revalidate for real-time sync
      queryClient.invalidateQueries({
        queryKey: ['conversation', newMessage.conversation_id]
      })
    }
  })
}
```

### Form State Management
```typescript
// Message composition form
export function useMessageForm() {
  const [messageText, setMessageText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [replyToId, setReplyToId] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setMessageText('')
    setAttachedFiles([])
    setReplyToId(null)
  }, [])

  return {
    messageText,
    setMessageText,
    attachedFiles,
    setAttachedFiles,
    replyToId,
    setReplyToId,
    resetForm,
    isDirty: messageText.trim() !== '' || attachedFiles.length > 0
  }
}
```

### Zustand UI State
```typescript
interface ConversationUIState {
  // Message threading
  expandedThreads: Set<string>
  expandThread: (messageId: string) => void
  collapseThread: (messageId: string) => void

  // File viewer
  imageViewer: {
    isOpen: boolean
    messageId: string | null
    fileIndex: number
  }
  openImageViewer: (messageId: string, fileIndex: number) => void
  closeImageViewer: () => void

  // Selection and bulk operations
  selectedMessages: Set<string>
  toggleMessageSelection: (messageId: string) => void
  clearSelection: () => void

  // UI preferences
  compactMode: boolean
  toggleCompactMode: () => void
}

export const useConversationUI = create<ConversationUIState>((set, get) => ({
  // Implementation details...
}))
```

## Component Architecture

### Main Conversation Component
```
ConversationContainer/
├── ConversationHeader.tsx          # Participant info, settings
├── MessageList/
│   ├── MessageList.tsx            # Virtualized message list
│   ├── MessageItem.tsx            # Individual message display
│   ├── MessageThread.tsx          # Threaded replies
│   └── MessageAttachments.tsx     # File display component
├── MessageComposer/
│   ├── MessageComposer.tsx        # Message input form
│   ├── FileDropZone.tsx           # Drag & drop attachments
│   └── MessageTemplates.tsx       # Quick response templates
└── ConversationModals/
    ├── ImageViewer.tsx            # Modal image viewer
    └── MessageOptions.tsx         # Message actions menu
```

### Component Data Flow
```typescript
// ConversationContainer.tsx - Main orchestrator
export function ConversationContainer({ studentId }: { studentId: string }) {
  // TanStack Query: Server state
  const { data: messages, isLoading } = useConversationData(studentId)

  // Form State: Message composition
  const messageForm = useMessageForm()

  // Zustand: UI state
  const { expandedThreads, selectedMessages } = useConversationUI()

  // UI Orchestration (no data mixing)
  const handleSendMessage = async () => {
    if (!messageForm.isDirty) return

    await createMessageMutation.mutateAsync({
      conversationId: conversation.id,
      messageType: 'daily_note',
      content: messageForm.messageText,
      attachments: messageForm.attachedFiles
    })

    messageForm.resetForm()
  }

  return (
    <div className="conversation-container">
      <MessageList
        messages={messages}
        expandedThreads={expandedThreads}
        selectedMessages={selectedMessages}
      />
      <MessageComposer
        messageText={messageForm.messageText}
        onMessageChange={messageForm.setMessageText}
        attachedFiles={messageForm.attachedFiles}
        onFilesChange={messageForm.setAttachedFiles}
        onSend={handleSendMessage}
        isLoading={createMessageMutation.isPending}
      />
    </div>
  )
}
```

## File System Organization

```
src/
├── lib/
│   ├── actions/
│   │   ├── conversation-actions.ts        # Server actions
│   │   └── message-attachments.ts         # File handling
│   └── hooks/
│       ├── use-conversation-data.ts       # TanStack Query hooks
│       ├── use-message-form.ts            # Form state hooks
│       └── use-conversation-ui.ts         # Zustand hooks
├── components/
│   └── conversation/
│       ├── ConversationContainer.tsx
│       ├── MessageList/
│       ├── MessageComposer/
│       └── ConversationModals/
└── pages/
    └── instructor/
        └── student-goals/
            └── [studentId]/
                └── page.tsx               # Route implementation
```

## Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)
1. **Create new database tables** alongside existing ones
2. **Implement new API actions** with unified queries
3. **Build new React components** following 3-layer pattern
4. **Create migration scripts** for existing data

### Phase 2: Feature Parity (Week 3-4)
1. **Implement all current features** in new system
2. **Add file upload functionality** with unified handling
3. **Real-time updates** through WebSocket integration
4. **A/B testing** between old and new systems

### Phase 3: Migration & Cleanup (Week 5-6)
1. **Data migration** from old tables to new schema
2. **Route updates** to use new conversation system
3. **Remove old code** after successful migration
4. **Performance monitoring** and optimization

## Performance Targets

### Query Performance
- **Single conversation load:** < 200ms for 50 messages with attachments
- **Message creation:** < 100ms optimistic update
- **File upload:** Progress tracking with < 50ms UI updates
- **Real-time updates:** < 100ms message delivery

### Scalability Targets
- **Concurrent conversations:** 1000+ active conversations
- **Message throughput:** 100+ messages/second
- **File storage:** 10TB+ with CDN delivery
- **Database performance:** < 5ms query time for conversation data

## Security Considerations

### Access Control
```sql
-- RLS policies for conversation security
CREATE POLICY "Students access own conversations" ON conversation_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Instructors access assigned conversations" ON conversation_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE instructor_id = auth.uid()
        )
    );
```

### File Security
- **Message-level file permissions:** Files inherit message access permissions
- **Signed URL generation:** All file access through temporary signed URLs
- **Virus scanning:** All uploads scanned before storage
- **Content moderation:** Automated scanning for inappropriate content

## Testing Strategy

### Unit Tests
- **API actions:** Test conversation data retrieval and message creation
- **Hooks:** Test TanStack Query hooks and form state management
- **Components:** Test message display and composition components

### Integration Tests
- **Conversation flow:** Test complete conversation creation and message exchange
- **File uploads:** Test attachment upload and display functionality
- **Real-time updates:** Test WebSocket message delivery

### Performance Tests
- **Load testing:** Simulate high-volume conversation activity
- **Database performance:** Test query performance with large datasets
- **Memory usage:** Test for memory leaks in long-running conversations

## Real-time Implementation

### WebSocket Integration
```typescript
// Extend existing WebSocket server for conversation events
export interface ConversationEvent {
  type: 'message-created' | 'message-updated' | 'typing-indicator' | 'read-receipt'
  conversationId: string
  messageId?: string
  senderId: string
  data: any
}

// Client-side event handling
export function useConversationWebSocket(conversationId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL)

    ws.onmessage = (event) => {
      const data: ConversationEvent = JSON.parse(event.data)

      if (data.conversationId === conversationId) {
        switch (data.type) {
          case 'message-created':
            queryClient.invalidateQueries(['conversation', conversationId])
            break
          case 'typing-indicator':
            // Update typing state in Zustand
            break
        }
      }
    }

    return () => ws.close()
  }, [conversationId])
}
```

---

## Next Steps

**⚠️ IMPLEMENTATION APPROVAL REQUIRED**

This implementation document provides the technical blueprint for migrating to the unified conversation system. Before proceeding with implementation:

1. **Review architecture alignment** with existing patterns
2. **Validate performance targets** against current system requirements
3. **Confirm migration timeline** and resource allocation
4. **Approve database schema changes** and migration strategy

**Ready for implementation approval and next phase planning.**