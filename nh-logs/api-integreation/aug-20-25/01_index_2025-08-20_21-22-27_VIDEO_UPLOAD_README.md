# 🎥 Video Upload & Backblaze Integration

**Document:** Video Upload System Implementation with User Ownership  
**Created:** 2025-08-20  
**Updated:** 2025-08-20  
**Version:** 2.0 with User Ownership  

This document describes the implementation of video upload functionality using Backblaze B2 Cloud Storage with CDN delivery via Bunny.net. **All media files are now user-owned and access-controlled.**

## Overview

The system provides:
- **🔒 User-Based Ownership**: All media files belong to authenticated users
- **Direct browser-to-storage uploads** using presigned URLs
- **Comprehensive metadata tracking** in the database
- **Video processing** with ffmpeg for metadata extraction
- **CDN integration** for fast global video delivery
- **Progress tracking** for upload sessions
- **File management** with soft delete functionality
- **🛡️ Access Control**: Users can only access their own media files

## Architecture

```
Frontend → API → Backblaze B2 → Bunny.net CDN → End Users
    ↓         ↓
Database ← Processing
```

### Key Components

1. **MediaFile Model**: Stores file metadata and storage information
2. **UploadSession Model**: Tracks upload progress and session data
3. **BackblazeStorageService**: Handles cloud storage operations
4. **VideoProcessingService**: Extracts video metadata using ffmpeg
5. **Media Upload API**: RESTful endpoints for file operations

## Database Schema

### MediaFile Table
- **🔑 user_id**: Owner of the media file (NEW)
- File identification (name, path, type)
- Storage information (provider, bucket, URLs)
- Processing status and metadata
- Video-specific fields (duration, resolution, codec)
- Audit trail and soft delete support

### UploadSession Table
- **🔑 user_id**: Owner of the upload session (NEW)
- Session tracking with unique keys
- Progress monitoring (bytes uploaded, percentage)
- Error handling and status management
- Relationship to final MediaFile

### Enhanced Video Table
- `media_file_id`: Links to MediaFile record
- `video_quality`: Quality level (480p, 720p, 1080p, 4k)
- `has_captions`: Caption availability flag
- `caption_languages`: Array of available caption languages

## API Endpoints

### Upload Workflow

#### 1. Initiate Upload
```http
POST /api/v1/media/upload/initiate
Content-Type: application/json
Authorization: Bearer {token}

{
  "filename": "video.mp4",
  "fileSize": 10485760,
  "contentType": "video/mp4",
  "courseId": "optional-course-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionKey": "uuid-session-key",
    "uploadUrl": "https://backblaze-presigned-url",
    "fields": {
      "key": "videos/user-id/timestamp_hash_video.mp4",
      "Content-Type": "video/mp4",
      // ... other presigned fields
    },
    "storageKey": "videos/user-id/timestamp_hash_video.mp4",
    "expiresIn": 3600
  }
}
```

#### 2. Upload File (Direct to Backblaze)
```javascript
const formData = new FormData();
Object.entries(fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', videoFile);

fetch(uploadUrl, {
  method: 'POST',
  body: formData
});
```

#### 3. Complete Upload
```http
POST /api/v1/media/upload/complete
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionKey": "uuid-session-key",
  "storageKey": "videos/user-id/timestamp_hash_video.mp4"
}
```

#### 4. Monitor Progress
```http
GET /api/v1/media/upload/progress/{sessionKey}
Authorization: Bearer {token}
```

### Media Management

#### Get Media File Info
```http
GET /api/v1/media/media/{mediaFileId}
Authorization: Bearer {token}
```

#### Process Video Metadata
```http
POST /api/v1/media/media/{mediaFileId}/process
Authorization: Bearer {token}
```

#### Attach to Course Video
```http
POST /api/v1/media/media/{mediaFileId}/attach-video
Content-Type: application/json
Authorization: Bearer {token}

{
  "videoId": "video-uuid"
}
```

#### List User Media Files
```http
GET /api/v1/media/user/media?page=1&limit=20&type=video
Authorization: Bearer {token}
```

#### Delete Media File
```http
DELETE /api/v1/media/media/{mediaFileId}
Authorization: Bearer {token}
```

## Configuration

### Environment Variables

```bash
# Backblaze B2 Configuration
BB_KEY_ID="your-key-id"
BB_KEY_NAME="your-key-name"
BB_APPLICATION_KEY="your-application-key"
BB_ENDPOINT="s3.us-west-002.backblazeb2.com"
BB_BUCKET_ID="your-bucket-id"

# CDN Configuration
CDN_URL="https://your-domain.b-cdn.net"

# Video Processing Configuration
MAX_VIDEO_SIZE_MB=500
ALLOWED_VIDEO_FORMATS=mp4,webm,avi,mov
VIDEO_PROCESSING_QUEUE=video_processing
THUMBNAIL_GENERATION_ENABLED=true

# Upload Configuration
UPLOAD_SESSION_TIMEOUT=3600  # 1 hour
MAX_CONCURRENT_UPLOADS=5
CHUNK_SIZE_MB=5

# Video Quality Constraints
MIN_VIDEO_WIDTH=320
MIN_VIDEO_HEIGHT=240
MAX_VIDEO_DURATION_SECONDS=7200  # 2 hours
```

## Frontend Integration

### React Hook Example

```javascript
import { useState } from 'react';

const useVideoUpload = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');

  const uploadVideo = async (file, courseId) => {
    try {
      setStatus('initiating');
      
      // Step 1: Initiate upload
      const initResponse = await fetch('/api/v1/media/upload/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          contentType: file.type,
          courseId
        })
      });

      const initData = await initResponse.json();
      const { sessionKey, uploadUrl, fields } = initData.data;

      setStatus('uploading');

      // Step 2: Upload to Backblaze with progress
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      setStatus('completing');

      // Step 3: Complete upload
      const completeResponse = await fetch('/api/v1/media/upload/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionKey,
          storageKey: fields.key
        })
      });

      const result = await completeResponse.json();
      setStatus('completed');
      setProgress(100);

      return result.data;

    } catch (error) {
      setStatus('error');
      throw error;
    }
  };

  return { uploadVideo, progress, status };
};
```

### Progress Tracking

```javascript
const trackUploadProgress = async (sessionKey) => {
  const response = await fetch(`/api/v1/media/upload/progress/${sessionKey}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const data = await response.json();
  return {
    progress: data.data.uploadProgress,
    status: data.data.status,
    eta: data.data.etaSeconds,
    speed: data.data.uploadSpeedMbps
  };
};
```

## Video Processing

The system automatically extracts video metadata using ffmpeg:

- **Duration**: Video length in seconds
- **Resolution**: Width and height in pixels
- **Codec**: Video codec (H.264, VP9, etc.)
- **Bitrate**: Video bitrate
- **Frame Rate**: Frames per second
- **Quality Classification**: 360p, 480p, 720p, 1080p, 4k

### Processing Flow

1. Video uploaded to Backblaze
2. MediaFile record created with "pending" status
3. Background job processes video (extracts metadata)
4. MediaFile updated with extracted information
5. Video becomes available for playback

## Security & Permissions

### Authentication
- All endpoints require valid JWT token
- User must have appropriate roles for course access

### File Validation
- MIME type checking for supported formats
- File size limits (configurable)
- Duration limits (configurable)

### Access Control
- Users can only access their own uploaded files
- Course instructors can upload to their courses
- Soft delete maintains audit trail

## Performance Optimizations

### Upload Performance
- **Direct browser-to-storage**: Bypasses server for file transfer
- **Presigned URLs**: Secure, time-limited upload authorization
- **Chunked uploads**: Handles large files reliably

### Delivery Performance
- **CDN integration**: Global edge caching
- **Adaptive streaming**: Multiple quality levels
- **URL optimization**: CDN URLs preferred over storage URLs

### Database Performance
- **Strategic indexing**: Query optimization for common patterns
- **Connection pooling**: Efficient database connections
- **Lazy loading**: Metadata loaded only when needed

## Monitoring & Analytics

### Metrics to Track
- Upload success/failure rates
- Processing time per video
- Storage usage growth
- CDN cache hit rates
- User engagement metrics

### Error Handling
- Comprehensive error logging
- Failed upload recovery
- Processing retry mechanisms
- User-friendly error messages

## Cost Optimization

### Storage Costs
- **Lifecycle policies**: Archive old content
- **Duplicate detection**: Prevent redundant uploads
- **Compression**: Optimal encoding settings

### CDN Costs
- **Cache optimization**: Maximize hit ratios
- **Bandwidth management**: Monitor delivery costs
- **Regional optimization**: Strategic node usage

## Migration Guide

### From Legacy Upload System

1. **Run Database Migration**:
   ```bash
   python manage.py migrate 001_add_media_storage_tables.sql
   ```

2. **Update Environment Variables**: Add Backblaze and CDN configuration

3. **Deploy New Code**: Update application with new endpoints

4. **Migrate Existing Videos** (optional):
   - Create MediaFile records for existing videos
   - Update Video records with media_file_id references

5. **Update Frontend**: Switch to new upload endpoints

## Troubleshooting

### Common Issues

#### Upload Fails
- Check Backblaze credentials and permissions
- Verify bucket exists and is accessible
- Ensure file size is within limits

#### Processing Fails
- Verify ffmpeg is installed and accessible
- Check video file format and codec support
- Review processing error logs

#### CDN Issues
- Verify CDN configuration and DNS
- Check cache settings and purge rules
- Monitor cache hit rates

### Debug Commands

```bash
# Test Backblaze connection
python -c "from app.services.storage.backblaze_service import BackblazeStorageService; print('✅ Connection OK' if BackblazeStorageService() else '❌ Connection Failed')"

# Test ffmpeg availability
ffmpeg -version

# Check database schema
python -c "from app.models.storage import MediaFile; print('✅ Models OK')"
```

## Testing

Run the test script to verify integration:

```bash
python test_video_upload.py
```

This will test:
- API endpoint availability
- Configuration validation
- Upload workflow simulation

## Support

For issues or questions:
1. Check logs for detailed error information
2. Verify configuration settings
3. Review API response codes and messages
4. Consult Backblaze B2 and Bunny.net documentation

## 🆕 User Ownership Updates (v2.0)

### Key Changes Made

1. **Added `user_id` to MediaFile Model**
   ```sql
   ALTER TABLE media_files ADD COLUMN user_id VARCHAR(36) NOT NULL;
   ALTER TABLE media_files ADD CONSTRAINT fk_media_file_user 
       FOREIGN KEY (user_id) REFERENCES users(id);
   ```

2. **Updated API Endpoints**
   - All media file operations are now user-scoped
   - Users can only access their own media files
   - Upload sessions are associated with authenticated users

3. **Enhanced Security**
   ```python
   # Example access control
   def get_media_file(media_file_id):
       media_file = db.query(MediaFile).filter_by(id=media_file_id).first()
       if media_file.user_id != g.user_id:
           return error("Access denied"), 403
   ```

4. **API Response Changes**
   All media file responses now include `userId`:
   ```json
   {
       "id": "media_file_123",
       "userId": "user-456",      // 🆕 NEW FIELD
       "filename": "video.mp4",
       // ... other fields
   }
   ```

5. **Database Indexes Added**
   ```sql
   CREATE INDEX idx_media_user_id ON media_files(user_id);
   CREATE INDEX idx_media_user_type ON media_files(user_id, file_type);
   ```

### Migration Impact

- **Existing Data**: All existing media files need user association
- **API Compatibility**: Response format updated with `userId` field
- **Access Control**: Strict user ownership enforcement
- **Performance**: New indexes optimize user-specific queries

### Security Benefits

- **Data Privacy**: Users can only see their own files
- **Access Control**: Automatic ownership validation
- **Audit Trail**: Clear ownership tracking
- **Multi-tenant Support**: Perfect isolation between users

---

## Future Enhancements

- **Video transcoding**: Multiple quality versions
- **Live streaming**: Real-time video delivery
- **Advanced analytics**: Detailed usage metrics
- **Auto-captioning**: AI-generated subtitles
- **Video thumbnails**: Automatic thumbnail generation
- **Batch operations**: Bulk upload and management

---

**🔥 STATUS: Production Ready with User Ownership** ✅