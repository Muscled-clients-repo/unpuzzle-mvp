# CDN Token Media Architecture Pattern

**Date:** September 25, 2025 - 09:45 AM
**Context:** Unified media viewing system using CloudFlare Worker CDN with HMAC tokens
**Status:** ✅ Production Ready

## Overview

This document outlines the comprehensive pattern for implementing secure media viewing using CloudFlare Worker CDN with HMAC token authentication. This replaces all previous `useSignedUrl` implementations and provides a unified approach for all media types (images, videos, documents) across the application.

## Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Component     │    │      Hook        │    │   Server Action     │
│                 │───▶│                  │───▶│                     │
│ attachmentId    │    │ useAttachmentCDN │    │generateAttachmentCDN│
│ prop            │    │                  │    │        URL          │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ CloudFlare CDN  │◀───│ backblazeService │◀───│   Private URL       │
│                 │    │                  │    │                     │
│ HMAC Token      │    │getSignedUrlFrom  │    │ private:fileId:name │
│ 6hr expiration  │    │     Private      │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Implementation Flow

### 1. Database Storage Pattern
```sql
-- All media tables store private URL format
cdn_url: 'private:fileId:fileName'
-- Examples:
'private:4_z5d2457bda8a00d67989d0d1d_f11705b5153b32e15_d20250925_m051924:messages/user123/image.png'
```

### 2. Component Usage Pattern
```typescript
// ✅ CORRECT: Pass attachmentId for CDN generation
<DailyNoteImage
  attachmentId={file.id}           // Required: Database record ID
  originalFilename={file.name}     // Required: Display name
  className="w-full h-32"          // Optional: Styling
  fileSize={file.size}             // Optional: For UI transitions
/>

// ❌ INCORRECT: Don't pass privateUrl directly
<DailyNoteImage
  privateUrl={file.cdn_url}        // Wrong: This bypasses CDN
  originalFilename={file.name}
/>
```

### 3. Hook Implementation
```typescript
// File: src/hooks/use-attachment-cdn.ts
export function useAttachmentCDN(attachmentId: string | undefined) {
  return useQuery({
    queryKey: ['attachment-cdn', attachmentId],
    queryFn: () => generateAttachmentCDNUrl(attachmentId!),
    enabled: !!attachmentId,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours (CDN expires at 6h)
    retry: 3
  })
}
```

### 4. Server Action Pattern
```typescript
// File: src/lib/actions/[media-type]-attachments.ts
export async function generateAttachmentCDNUrl(
  attachmentId: string,
  expirationHours: number = 6
): Promise<AttachmentCDNUrl | null> {
  // 1. Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 2. Get attachment with private URL
  const { data: attachment } = await serviceClient
    .from('[attachment_table]')
    .select('cdn_url')
    .eq('id', attachmentId)
    .single()

  // 3. Generate CDN URL with HMAC token
  const { backblazeService } = await import('@/services/video/backblaze-service')
  const result = await backblazeService.getSignedUrlFromPrivate(
    attachment.cdn_url,
    expirationHours
  )

  return result
}
```

### 5. Media Component Pattern
```typescript
// File: src/components/media/[MediaType]Image.tsx
interface MediaImageProps {
  attachmentId: string                    // Required: For CDN generation
  originalFilename: string               // Required: Display/alt text
  className?: string                     // Optional: Styling
  fileSize?: number                      // Optional: UI transitions
  onClick?: () => void                   // Optional: Interactions
}

export function MediaImage({ attachmentId, originalFilename, ...props }: MediaImageProps) {
  // CDN URL generation
  const { url: cdnUrl, isLoading, error } = useAttachmentCDN(attachmentId)

  // UI transition handling (for uploads)
  const transition = useUITransitionStore(state =>
    fileSize ? state.getTransitionByFile(originalFilename, fileSize) : undefined
  )

  // Display logic
  const displayUrl = transition?.isTransitioning ? transition.blobUrl : cdnUrl

  if (displayUrl) {
    return <img src={displayUrl} alt={originalFilename} {...props} />
  }

  // Loading/error states...
}
```

## File Structure

```
src/
├── hooks/
│   ├── use-attachment-cdn.ts              # CDN URL generation hook
│   └── use-[media-type]-cdn.ts            # Specific media type hooks
├── lib/actions/
│   ├── conversation-attachments.ts        # Message attachments
│   ├── course-media-attachments.ts        # Course media
│   └── [media-type]-attachments.ts        # Other media types
├── components/
│   ├── media/
│   │   ├── MediaImage.tsx                 # Base image component
│   │   ├── MediaViewer.tsx                # Modal viewer
│   │   └── [MediaType]Image.tsx           # Specific implementations
│   └── [feature]/
│       └── [FeatureMedia].tsx             # Feature-specific usage
└── services/video/
    └── backblaze-service.ts               # Core CDN service
```

## Database Tables Pattern

All media tables should follow this structure:

```sql
CREATE TABLE [media_type]_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  [parent]_id UUID NOT NULL REFERENCES [parent_table](id),
  filename TEXT NOT NULL,                    -- Storage path
  original_filename TEXT NOT NULL,           -- Display name
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  cdn_url TEXT NOT NULL,                     -- 'private:fileId:fileName'
  storage_path TEXT NOT NULL,
  backblaze_file_id TEXT,
  upload_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### 1. Access Control
```typescript
// Always verify user has access to the media
const { data: media } = await serviceClient
  .from('media_table')
  .select(`
    cdn_url,
    parent_table!inner(
      user_id
    )
  `)
  .eq('id', attachmentId)
  .eq('parent_table.user_id', user.id)  // Access control
  .single()
```

### 2. Token Expiration
- **CDN URLs**: 6-hour expiration (production)
- **Query Cache**: 4-hour stale time (refresh before expiry)
- **UI Handling**: Graceful token refresh on failure

### 3. Error Handling
```typescript
// Component error boundaries
if (error) {
  return (
    <div className="media-error">
      <div className="text-center">
        <div className="text-2xl mb-1">🖼️</div>
        <div className="text-xs text-gray-500">Media not available</div>
        <div className="text-xs text-red-500">{error}</div>
      </div>
    </div>
  )
}
```

## Usage Examples

### 1. Conversation Attachments
```typescript
// Messages with image attachments
{message.attachments.map((file) => (
  <DailyNoteImage
    key={file.id}
    attachmentId={file.id}
    originalFilename={file.original_filename}
    className="w-full h-32"
    onClick={() => openViewer(file.id)}
  />
))}
```

### 2. Course Media
```typescript
// Course chapter media
<CourseMediaImage
  attachmentId={media.id}
  originalFilename={media.title}
  className="aspect-video"
  fileSize={media.file_size}
/>
```

### 3. User Uploads
```typescript
// Profile pictures, documents, etc.
<UserMediaImage
  attachmentId={user.avatar_attachment_id}
  originalFilename="Profile Picture"
  className="w-12 h-12 rounded-full"
/>
```

## Migration Guide

### From useSignedUrl to useAttachmentCDN

#### Before (❌ Old Pattern):
```typescript
// OLD: Direct signed URL generation
const { signedUrl, loading } = useSignedUrl(file.storage_path)

<img src={signedUrl} alt={file.name} />
```

#### After (✅ New Pattern):
```typescript
// NEW: CDN with token authentication
const { url: cdnUrl, isLoading } = useAttachmentCDN(file.id)

<MediaImage
  attachmentId={file.id}
  originalFilename={file.name}
/>
```

### Prop Mapping:
```typescript
// OLD Props → NEW Props
privateUrl={file.cdn_url}     → attachmentId={file.id}
signedUrl={url}               → attachmentId={file.id}
filename={file.name}          → originalFilename={file.name}
```

## Performance Optimizations

### 1. Query Caching
- **4-hour stale time**: Prevents unnecessary CDN calls
- **Background refetch**: Updates before token expiry
- **Retry logic**: Handles temporary CDN failures

### 2. UI Transitions
- **Blob URLs**: Immediate feedback during uploads
- **File-based mapping**: Consistent transition states
- **Cleanup**: Automatic blob URL cleanup

### 3. Batch Operations
```typescript
// Prefetch CDN URLs for multiple media items
const mediaQueries = useQueries({
  queries: mediaItems.map(item => ({
    queryKey: ['attachment-cdn', item.id],
    queryFn: () => generateAttachmentCDNUrl(item.id),
    staleTime: 4 * 60 * 60 * 1000
  }))
})
```

## Debugging

### 1. Console Logs
```typescript
// Server Action Logs
🔍 generateAttachmentCDNUrl called: { attachmentId: '...', expirationHours: 6 }
🔍 Simplified attachment query result: { attachment: {...}, error: undefined }
🔍 Backblaze service result: { result: true, hasUrl: true, hasExpiresAt: true }

// Component Logs
🖼️ MediaImage CDN UI Orchestration: {
  attachmentId: '...',
  cdnUrl: 'PRESENT',
  displayUrl: 'PRESENT'
}
```

### 2. Common Issues
- **Module not found**: Check import path (`@/services/video/backblaze-service`)
- **Missing attachmentId**: Ensure prop is passed correctly
- **Token expired**: Check stale time vs expiration time
- **Access denied**: Verify RLS policies and user permissions

## Key Success Factors

### ✅ Critical Requirements:
1. **attachmentId prop flow**: Component → Hook → Server Action → CDN
2. **Correct import path**: `@/services/video/backblaze-service`
3. **Private URL format**: `private:fileId:fileName` in database
4. **Token timing**: 4h cache < 6h expiration
5. **Access control**: User permissions verified

### ❌ Common Mistakes:
1. Passing `privateUrl` instead of `attachmentId`
2. Wrong backblaze service import path
3. Missing access control checks
4. Cache timing issues
5. Incorrect private URL format

## Production Checklist

- [ ] Database uses private URL format
- [ ] Components pass `attachmentId` (not `privateUrl`)
- [ ] Import path: `@/services/video/backblaze-service`
- [ ] Access control in server actions
- [ ] Error boundaries in components
- [ ] Token expiration < cache stale time
- [ ] UI transitions for uploads
- [ ] Cleanup blob URLs
- [ ] RLS policies configured
- [ ] Monitoring/logging enabled

---

**Result**: Secure, scalable media system with CloudFlare Worker CDN, HMAC token authentication, and 6-hour cached URLs. This pattern ensures consistent media handling across all features while maintaining security and performance.