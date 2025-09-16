# Unified Conversation System

This directory contains the new unified conversation system that replaces the fragmented 6-table approach with an optimized 3-table design following industry best practices.

## Architecture Overview

The system follows a 3-layer SSOT (Single Source of Truth) pattern:

1. **Server State** (TanStack Query): Conversation data from database
2. **Form State** (React Hook Form): Message composition and validation
3. **UI State** (Zustand): Interface preferences and interactions

## Database Schema

The unified system uses 3 optimized tables:

- `goal_conversations`: Student-instructor conversation pairs
- `conversation_messages`: All message types (daily notes, responses, activities)
- `message_attachments`: File attachments linked to messages

## Components

### Core Components

- **`UnifiedConversationContainer`**: Main container with 3-layer architecture
- **`MessageList`**: Chronological message display with threading
- **`MessageCard`**: Individual message with actions and metadata
- **`MessageComposer`**: Unified message creation with file uploads
- **`ConversationHeader`**: Conversation metadata and actions
- **`ImageViewerModal`**: Full-screen image viewer with navigation
- **`MessageAttachments`**: File attachment display and interaction

### Integration Component

- **`ConversationIntegration`**: Drop-in replacement for existing pages

## Usage

### Basic Integration

```tsx
import { ConversationIntegration } from '@/components/conversation'

// In student/goals page
<ConversationIntegration
  studentId={userId}
  isInstructorView={false}
  enableUnifiedSystem={true}
/>

// In instructor/student-goals page
<ConversationIntegration
  studentId={studentId}
  instructorId={instructorId}
  isInstructorView={true}
  enableUnifiedSystem={true}
/>
```

### Advanced Usage

```tsx
import { UnifiedConversationContainer } from '@/components/conversation'

<UnifiedConversationContainer
  studentId="uuid"
  instructorId="uuid"
  isInstructorView={true}
  className="custom-styling"
/>
```

## Migration Strategy

1. **Phase 1**: Deploy unified system alongside existing system
2. **Phase 2**: Run data migration from old tables to new schema
3. **Phase 3**: Switch pages to use `enableUnifiedSystem={true}`
4. **Phase 4**: Remove old table references and components

### Migration Commands

```sql
-- Run migration function
SELECT * FROM migrate_to_unified_conversations();

-- Validate migration
SELECT * FROM validate_conversation_migration();

-- Create backups before cleanup
SELECT backup_old_conversation_data();
```

## Features

### Message Types
- `daily_note`: Student daily progress entries
- `instructor_response`: Instructor feedback and guidance
- `activity`: Student activity logging
- `milestone`: Achievement markers

### File Attachments
- Drag & drop upload support
- Image preview with modal viewer
- Download and sharing capabilities
- Backblaze B2 integration

### Real-time Features
- Optimistic updates for instant UI feedback
- Automatic refresh every 30 seconds
- WebSocket support (future enhancement)

### UI Features
- Compact and expanded view modes
- Message threading and replies
- Date-based grouping
- Search and filtering (planned)
- Keyboard navigation

## Hooks

### Data Hooks
- `useConversationData()`: Main conversation data fetching
- `useCreateMessage()`: Message creation with optimistic updates
- `useUpdateMessage()`: Message editing
- `useDeleteMessage()`: Message deletion

### Form Hooks
- `useMessageForm()`: Message composition state
- `useDailyNoteForm()`: Specialized for student notes
- `useInstructorResponseForm()`: Specialized for instructor responses
- `useResponseTemplates()`: Quick response templates

### UI Hooks
- `useConversationUI()`: Main UI state management
- `useInstructorConversationUI()`: Instructor-specific UI helpers
- `useStudentConversationUI()`: Student-specific UI helpers

## Performance Optimizations

1. **Single Query Pattern**: One query fetches complete conversation data
2. **Optimistic Updates**: Immediate UI feedback before server confirmation
3. **Lazy Loading**: Images and files loaded on demand
4. **Memoization**: React.memo for component optimization
5. **Indexed Queries**: Database indexes for chronological access patterns

## Error Handling

- Automatic retry on network failures
- Graceful degradation for missing data
- User-friendly error messages
- Rollback on optimistic update failures

## TypeScript Support

Comprehensive TypeScript types provided in `@/lib/types/conversation-types`:

- `Conversation`: Conversation metadata
- `ConversationMessage`: Message structure
- `MessageAttachment`: File attachment data
- `ConversationData`: Complete conversation response
- `CreateMessageRequest`: Message creation payload

## Testing

Components follow existing testing patterns:

```tsx
import { render, screen } from '@testing-library/react'
import { ConversationIntegration } from '@/components/conversation'

test('renders conversation integration', () => {
  render(
    <ConversationIntegration
      studentId="test-id"
      enableUnifiedSystem={true}
    />
  )
  // Test implementation
})
```

## Contributing

When extending the conversation system:

1. Follow existing 3-layer SSOT pattern
2. Use provided TypeScript types
3. Implement optimistic updates for mutations
4. Add comprehensive error handling
5. Follow accessibility guidelines
6. Maintain performance optimizations

## Migration Notes

- Old tables preserved during migration with `backup_` prefix
- All existing data migrated with `migrated_from` metadata
- File attachments preserved with original URLs
- Conversation IDs generated for existing student-instructor pairs
- Migration is idempotent and can be re-run safely