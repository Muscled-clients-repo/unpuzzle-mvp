# Conversation Attachments CDN Architecture Pattern
**Date**: 2025-09-24
**Status**: Active Implementation
**Architecture Compliance**: 001-Architecture-Principles-Course-Creation-Edit-Flow

## Current Implementation Overview

### Database Schema
```sql
-- Table: conversation_attachments (Migration 082)
CREATE TABLE conversation_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    cdn_url TEXT, -- Private URL format: "private:fileId:fileName"
    backblaze_file_id TEXT,
    upload_status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### File Structure (Current)
```
src/lib/actions/conversation-attachments.ts  ✅ (renamed from message-attachments.ts)
src/hooks/use-conversation-data.ts           ✅ (imports updated)
src/lib/types/conversation-types.ts          ✅ (ConversationAttachment interface)
src/components/conversation/index.ts         ✅ (exports updated)
```

### CDN Architecture Implementation

#### Storage Pattern (Consistent with Videos)
```typescript
// Store private URL format in database
const privateUrl = `private:${uploadResult.fileId}:${uniqueFilename}`

// Database storage
{
  cdn_url: "private:4_z5d2457bda8a00d67989d0d1d_f1168d0e92900c648_d20250924_m225518_c005_v0501034_t0045_u01758754518042:messages/f4469cc4-a6fe-4179-8db4-33447b53893d/1758754516280_1zm5dzdp3gy.png",
  backblaze_file_id: "4_z5d2457bda8a00d67989d0d1d_f1168d0e92900c648_d20250924_m225518_c005_v0501034_t0045_u01758754518042"
}
```

#### CDN Access Pattern
```typescript
// Server Action: Generate secure CDN URL
const cdnData = await generateAttachmentCDNUrl(attachmentId)
// Returns: { url: "https://cdn.unpuzzle.co/path?token=hmac_token", expiresAt: timestamp }

// Component Usage
<img src={cdnData.url} alt={attachment.original_filename} />
```

### Security Implementation

#### HMAC Token Authentication
- **6-hour token expiration**
- **File path validation**
- **User access verification** (student/instructor only)
- **IP binding support** (optional)

#### Access Control
```typescript
// Verify user has access to attachment
const conversation = attachment.message.conversation
const hasAccess = conversation.student_id === user.id || conversation.instructor_id === user.id
```

## Architecture Compliance Checklist ✅

### Following 001 Architecture Principles
- ✅ **Server Actions**: All file operations via server actions
- ✅ **TanStack Query**: File upload mutations and queries
- ✅ **Security-First**: Private URLs + HMAC tokens
- ✅ **Consistent Patterns**: Same CDN approach as videos
- ✅ **Layer Separation**: No credential exposure in components

### Performance Optimization
- ✅ **CDN Caching**: Through CloudFlare Worker proxy
- ✅ **Signed URLs**: With automatic expiration
- ✅ **Optimized Storage**: Backblaze B2 backend
- ✅ **File Validation**: Size and type limits

## TypeScript Interfaces (Current)

```typescript
// Primary interface (consistent with table name)
export interface ConversationAttachment {
  id: string
  message_id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  cdn_url: string // Private URL format
  backblaze_file_id?: string
  storage_path: string
  upload_status: 'uploading' | 'completed' | 'failed'
  created_at: string
}

// CDN URL response
export interface AttachmentCDNUrl {
  url: string // Full CDN URL with HMAC token
  expiresAt: number // Token expiration timestamp
}
```

## Migration History

### Migration 082: conversation_attachments Table Creation
```sql
-- Created conversation_attachments with all required columns
-- Added RLS policies for student/instructor access
-- Created performance indexes
-- Added backblaze_file_id column for CDN integration
```

### Naming Consistency Updates (2025-09-24)
- ✅ **File renamed**: `message-attachments.ts` → `conversation-attachments.ts`
- ✅ **Interface renamed**: `MessageAttachment` → `ConversationAttachment`
- ✅ **All imports updated**: Across 5+ files
- ✅ **Type exports updated**: Component index files

## Current Usage Example

### Upload Flow
```typescript
// 1. Upload via server action
const results = await uploadMessageAttachments({
  messageId: messageId,
  files: formData
})

// 2. Files stored with private URLs
// 3. Components get CDN URLs when needed
const cdnUrl = await generateAttachmentCDNUrl(attachmentId)
```

### Component Integration
```typescript
// Hook for file uploads (TanStack Query)
const uploadMutation = useUploadMessageAttachments()

// Upload with optimistic updates
uploadMutation.mutate({ messageId, files })
```

## CloudFlare Worker Integration

### CDN Proxy Configuration
```javascript
// cloudflared-worker.js handles:
// - HMAC token validation
// - File access control
// - CDN caching policies
// - Range request support for large files
```

### Environment Variables Required
```env
NEXT_PUBLIC_CDN_URL=https://cdn.unpuzzle.co
CDN_AUTH_SECRET=your_secret_key
```

## Performance Characteristics

### File Upload
- ✅ **Direct to Backblaze B2**: No server proxy overhead
- ✅ **Progress tracking**: Via WebSocket system
- ✅ **Validation**: Client + server-side
- ✅ **Error handling**: Graceful failures with retry

### File Access
- ✅ **CDN delivery**: Global edge locations
- ✅ **Token caching**: 6-hour validity period
- ✅ **Security**: No direct storage access
- ✅ **Performance**: Sub-100ms CDN response

## Testing Strategy

### Unit Tests
```typescript
// Test file upload validation
// Test CDN URL generation
// Test access control verification
```

### Integration Tests
```typescript
// Test student file upload → instructor access
// Test CDN token expiration handling
// Test file deletion cascade
```

## Future Considerations

### Potential Optimizations
- **Image resizing**: Via CloudFlare Image Resizing
- **Progressive JPEG**: For faster loading
- **WebP conversion**: Browser-specific optimization
- **Thumbnail generation**: For image previews

### Monitoring
- **Upload success rates**: Track via server actions
- **CDN hit ratios**: Monitor via CloudFlare analytics
- **Token validation failures**: Security monitoring
- **File access patterns**: Usage analytics

---

## Pattern Summary

This pattern establishes conversation attachments as **first-class citizens** in the application architecture, following the same security and performance principles as video files while maintaining clear separation of concerns and architectural consistency.

**Key Success Factors:**
1. **Consistent naming** across database, code, and types
2. **Security-first approach** with HMAC tokens
3. **Performance optimization** through CDN
4. **Architecture compliance** with 001 principles
5. **Comprehensive error handling** and validation

---

## Related Patterns

**See Pattern 23** for:
- Shared HMAC utility libraries (both TypeScript and CommonJS)
- Complete HMAC token generation documentation
- Worker integration patterns for CDN access
- Best practices to avoid code duplication