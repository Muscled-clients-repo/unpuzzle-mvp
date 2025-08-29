# Puzzle Reflection API - Frontend Integration Guide

**Date:** 2025-08-28  
**Purpose:** Complete integration guide for frontend developers  
**API Base URL:** `https://yourdomain.com/api/v1/reflections/`

---

## 🚀 **Quick Start**

The Puzzle Reflection API allows users to create, manage, and retrieve reflections for learning videos. It supports multiple content types: uploaded media files, Loom video links, and text content.

### **Authentication Required**
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer your-jwt-token-here
```

---

## 📋 **API Endpoints Overview**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/reflections/` | List user's reflections |
| `POST` | `/api/v1/reflections/` | Create new reflection |
| `GET` | `/api/v1/reflections/{id}/` | Get specific reflection |
| `PUT` | `/api/v1/reflections/{id}/` | Update entire reflection |
| `PATCH` | `/api/v1/reflections/{id}/` | Partially update reflection |
| `DELETE` | `/api/v1/reflections/{id}/` | Delete reflection (soft delete) |
| `GET` | `/api/v1/reflections/by_video/` | Get reflections for specific video |
| `GET` | `/api/v1/reflections/summary/` | Get user's reflection statistics |

---

## 🔧 **Integration Examples**

### **1. List User's Reflections**

```javascript
// GET /api/v1/reflections/
const listReflections = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  // Optional filters
  if (filters.videoId) queryParams.append('video_id', filters.videoId);
  if (filters.reflectionType) queryParams.append('reflection_type', filters.reflectionType);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.dateFrom) queryParams.append('date_from', filters.dateFrom);
  if (filters.dateTo) queryParams.append('date_to', filters.dateTo);
  if (filters.hasMediaFile !== undefined) queryParams.append('has_media_file', filters.hasMediaFile);
  
  const response = await fetch(`/api/v1/reflections/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch reflections: ${response.statusText}`);
  }
  
  return await response.json();
};

// Usage examples
const allReflections = await listReflections();
const videoReflections = await listReflections({ videoId: 'css-flexbox-101' });
const completionReflections = await listReflections({ reflectionType: 'completion' });
```

**Response Format:**
```json
{
  "count": 15,
  "next": "https://yourdomain.com/api/v1/reflections/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "video_id": "css-flexbox-101",
      "reflection_type": "completion",
      "title": "My CSS Learning Journey",
      "media_url": "https://cdn.yourdomain.com/reflections/video.mp4",
      "media_thumbnail": "https://cdn.yourdomain.com/reflections/thumbnail.jpg",
      "has_media": true,
      "loom_link": null,
      "user_name": "John Doe",
      "created_at": "2025-08-28T10:30:00Z"
    }
  ]
}
```

---

### **2. Create New Reflection (Two-Step Process)**

The puzzle reflection system integrates with the existing media upload system. Here's the complete flow:

#### **Step 1: Upload Media File (if needed)**
```javascript
// First, upload the media file using existing media API
const uploadReflectionMedia = async (file) => {
  // Step 1a: Initiate upload
  const initiateResponse = await fetch('/api/v1/media/upload/initiate/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      file_size: file.size,
      file_type: getFileType(file), // 'video', 'audio', 'document'
      mime_type: file.type
    })
  });
  
  const { upload_id, upload_urls } = await initiateResponse.json();
  
  // Step 1b: Upload file in chunks (simplified)
  // Implementation depends on your existing media upload system
  await uploadFileInChunks(file, upload_urls);
  
  // Step 1c: Complete upload
  const completeResponse = await fetch('/api/v1/media/upload/complete/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ upload_id })
  });
  
  const mediaFile = await completeResponse.json();
  return mediaFile.id; // MediaFile UUID
};
```

#### **Step 2: Create Reflection**
```javascript
// POST /api/v1/reflections/
const createReflection = async (reflectionData) => {
  const response = await fetch('/api/v1/reflections/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reflectionData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create reflection: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
};

// Complete integration example
const createReflectionWithMedia = async ({ videoId, reflectionType, title, file, loomLink, textContent }) => {
  try {
    let mediaFileId = null;
    
    // Upload media file if provided
    if (file) {
      mediaFileId = await uploadReflectionMedia(file);
    }
    
    // Create reflection
    const reflection = await createReflection({
      video_id: videoId,
      reflection_type: reflectionType,
      title: title,
      media_file: mediaFileId,
      loom_link: loomLink,
      text_content: textContent
    });
    
    return reflection;
  } catch (error) {
    console.error('Failed to create reflection:', error);
    throw error;
  }
};
```

**Usage Examples:**
```javascript
// Create reflection with uploaded video
await createReflectionWithMedia({
  videoId: 'css-flexbox-101',
  reflectionType: 'completion',
  title: 'My CSS Flexbox Journey',
  file: selectedVideoFile, // File object from input
  textContent: 'I learned so much about flexbox layouts!'
});

// Create reflection with Loom link only
await createReflection({
  video_id: 'css-flexbox-101',
  reflection_type: 'learning',
  title: 'Quick Learning Summary',
  loom_link: 'https://loom.com/share/abc123',
  text_content: 'Key takeaways from today\'s lesson'
});

// Create text-only reflection
await createReflection({
  video_id: 'css-flexbox-101',
  reflection_type: 'summary',
  title: 'Written Reflection',
  text_content: 'Today I learned about the main axis and cross axis in flexbox...'
});
```

---

### **3. Get Specific Reflection**

```javascript
// GET /api/v1/reflections/{id}/
const getReflection = async (reflectionId) => {
  const response = await fetch(`/api/v1/reflections/${reflectionId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch reflection: ${response.statusText}`);
  }
  
  return await response.json();
};
```

**Detailed Response Format:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "video_id": "css-flexbox-101",
  "reflection_type": "completion",
  "title": "My CSS Learning Journey",
  "description": "Reflection on completing all flexbox puzzles",
  "media_file": "media-file-uuid",
  "media_file_details": {
    "id": "media-file-uuid",
    "filename": "reflection_video.mp4",
    "file_type": "video",
    "file_size": 15728640,
    "storage_url": "https://backblaze-url.com/file.mp4",
    "cdn_url": "https://cdn-url.com/file.mp4",
    "thumbnail_url": "https://cdn-url.com/thumbnail.jpg",
    "duration": 180,
    "width": 1920,
    "height": 1080,
    "processing_status": "completed"
  },
  "media_url": "https://cdn-url.com/file.mp4",
  "media_thumbnail": "https://cdn-url.com/thumbnail.jpg",
  "has_media": true,
  "file_type": "video",
  "file_size": 15728640,
  "duration": 180,
  "loom_link": null,
  "text_content": "I learned so much about flexbox today...",
  "course": "course-uuid",
  "course_title": "CSS Mastery Course",
  "user_name": "John Doe",
  "created_at": "2025-08-28T10:30:00Z",
  "updated_at": "2025-08-28T10:30:00Z"
}
```

---

### **4. Update Reflection**

```javascript
// PATCH /api/v1/reflections/{id}/ (partial update)
const updateReflection = async (reflectionId, updateData) => {
  const response = await fetch(`/api/v1/reflections/${reflectionId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update reflection: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
};

// Usage examples
await updateReflection('reflection-uuid', {
  title: 'Updated Title',
  loom_link: 'https://loom.com/share/new123'
});
```

---

### **5. Delete Reflection**

```javascript
// DELETE /api/v1/reflections/{id}/
const deleteReflection = async (reflectionId) => {
  const response = await fetch(`/api/v1/reflections/${reflectionId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete reflection: ${response.statusText}`);
  }
  
  // No response body for successful deletion (204 No Content)
};
```

---

### **6. Get Reflections for Specific Video**

```javascript
// GET /api/v1/reflections/by_video/?video_id=css-flexbox-101
const getReflectionsByVideo = async (videoId) => {
  const response = await fetch(`/api/v1/reflections/by_video/?video_id=${videoId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch video reflections: ${response.statusText}`);
  }
  
  return await response.json();
};
```

**Response Format:**
```json
{
  "video_id": "css-flexbox-101",
  "total_reflections": 3,
  "reflections": [
    {
      "id": "reflection-uuid-1",
      "reflection_type": "completion",
      "title": "Puzzle Completion",
      "created_at": "2025-08-28T10:30:00Z"
    }
  ]
}
```

---

### **7. Get User's Reflection Summary**

```javascript
// GET /api/v1/reflections/summary/
const getReflectionSummary = async () => {
  const response = await fetch('/api/v1/reflections/summary/', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch reflection summary: ${response.statusText}`);
  }
  
  return await response.json();
};
```

**Response Format:**
```json
{
  "total_reflections": 25,
  "by_type": [
    { "reflection_type": "completion", "count": 10 },
    { "reflection_type": "learning", "count": 8 },
    { "reflection_type": "summary", "count": 5 },
    { "reflection_type": "challenge", "count": 2 }
  ],
  "top_videos": [
    { "video_id": "css-flexbox-101", "count": 5 },
    { "video_id": "js-basics-202", "count": 3 }
  ],
  "recent_reflections": [
    {
      "id": "recent-reflection-uuid",
      "video_id": "css-grid-301",
      "title": "Latest Reflection",
      "created_at": "2025-08-28T15:30:00Z"
    }
  ]
}
```

---

## 🎨 **Frontend UI Components**

### **Reflection Creation Form**

```jsx
import React, { useState } from 'react';

const ReflectionForm = ({ videoId, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    reflectionType: 'completion',
    file: null,
    loomLink: '',
    textContent: ''
  });

  const reflectionTypes = [
    { value: 'completion', label: 'Puzzle Completion' },
    { value: 'learning', label: 'Learning Reflection' },
    { value: 'challenge', label: 'Challenge Response' },
    { value: 'summary', label: 'Summary' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const reflection = await createReflectionWithMedia({
        videoId: videoId,
        reflectionType: formData.reflectionType,
        title: formData.title,
        file: formData.file,
        loomLink: formData.loomLink,
        textContent: formData.textContent
      });
      
      onSubmit(reflection);
    } catch (error) {
      console.error('Failed to create reflection:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Reflection Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="Enter reflection title..."
        />
      </div>

      <div>
        <label>Reflection Type</label>
        <select
          value={formData.reflectionType}
          onChange={(e) => setFormData({...formData, reflectionType: e.target.value})}
        >
          {reflectionTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Upload Video/Audio/Document</label>
        <input
          type="file"
          accept="video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
        />
      </div>

      <div>
        <label>Loom Video Link (Optional)</label>
        <input
          type="url"
          value={formData.loomLink}
          onChange={(e) => setFormData({...formData, loomLink: e.target.value})}
          placeholder="https://loom.com/share/..."
        />
      </div>

      <div>
        <label>Text Reflection</label>
        <textarea
          value={formData.textContent}
          onChange={(e) => setFormData({...formData, textContent: e.target.value})}
          placeholder="Write your reflection here..."
          rows="4"
        />
      </div>

      <button type="submit">Create Reflection</button>
    </form>
  );
};
```

### **Reflection Display Component**

```jsx
import React from 'react';

const ReflectionCard = ({ reflection }) => {
  const renderMedia = () => {
    if (reflection.loom_link) {
      return (
        <div className="media-container">
          <iframe
            src={reflection.loom_link.replace('share', 'embed')}
            title="Loom Video"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );
    }

    if (reflection.media_url && reflection.file_type === 'video') {
      return (
        <div className="media-container">
          <video 
            controls 
            poster={reflection.media_thumbnail}
            src={reflection.media_url}
          />
        </div>
      );
    }

    if (reflection.media_url && reflection.file_type === 'audio') {
      return (
        <div className="media-container">
          <audio controls src={reflection.media_url} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="reflection-card">
      <div className="reflection-header">
        <h3>{reflection.title}</h3>
        <span className="reflection-type">
          {reflection.reflection_type}
        </span>
        <span className="reflection-date">
          {new Date(reflection.created_at).toLocaleDateString()}
        </span>
      </div>

      {renderMedia()}

      {reflection.text_content && (
        <div className="reflection-content">
          <p>{reflection.text_content}</p>
        </div>
      )}

      <div className="reflection-meta">
        <span>Video: {reflection.video_id}</span>
        {reflection.duration && (
          <span>Duration: {Math.round(reflection.duration / 60)}min</span>
        )}
      </div>
    </div>
  );
};
```

---

## 🔍 **Filtering and Search**

```javascript
// Advanced filtering example
const searchReflections = async (searchCriteria) => {
  const filters = {};
  
  if (searchCriteria.keyword) {
    filters.search = searchCriteria.keyword;
  }
  
  if (searchCriteria.videoId) {
    filters.videoId = searchCriteria.videoId;
  }
  
  if (searchCriteria.type) {
    filters.reflectionType = searchCriteria.type;
  }
  
  if (searchCriteria.dateRange) {
    filters.dateFrom = searchCriteria.dateRange.from;
    filters.dateTo = searchCriteria.dateRange.to;
  }
  
  if (searchCriteria.hasMedia !== undefined) {
    filters.hasMediaFile = searchCriteria.hasMedia;
  }
  
  return await listReflections(filters);
};

// Usage
const results = await searchReflections({
  keyword: 'flexbox',
  type: 'completion',
  hasMedia: true,
  dateRange: {
    from: '2025-08-01',
    to: '2025-08-31'
  }
});
```

---

## ⚠️ **Error Handling**

```javascript
const handleApiError = (error, response) => {
  if (response.status === 400) {
    // Validation errors
    console.error('Validation failed:', error);
    return 'Please check your input and try again.';
  }
  
  if (response.status === 401) {
    // Authentication required
    console.error('Authentication required');
    // Redirect to login
    return 'Please log in to continue.';
  }
  
  if (response.status === 403) {
    // Permission denied
    console.error('Permission denied');
    return 'You do not have permission to perform this action.';
  }
  
  if (response.status === 404) {
    // Not found
    console.error('Reflection not found');
    return 'Reflection not found.';
  }
  
  if (response.status === 413) {
    // File too large
    console.error('File too large');
    return 'File size exceeds maximum allowed size.';
  }
  
  if (response.status === 429) {
    // Rate limited
    console.error('Rate limited');
    return 'Too many requests. Please try again later.';
  }
  
  // Generic error
  console.error('API error:', error);
  return 'An error occurred. Please try again.';
};
```

---

## 🔧 **Validation Rules**

- **Required**: At least one of `media_file`, `loom_link`, or `text_content` must be provided
- **File Types**: Video (mp4, mov, avi), Audio (mp3, wav, m4a), Documents (pdf, docx, txt)
- **File Size Limits**: 
  - Video: 100MB max
  - Audio: 50MB max  
  - Documents: 10MB max
- **Loom Link**: Must be a valid URL (optional)
- **Video ID**: Required string identifier
- **Reflection Type**: Must be one of: completion, learning, challenge, summary, other

---

## 🚀 **Production Considerations**

1. **File Upload Progress**: Implement progress bars for large file uploads
2. **Error Retry Logic**: Implement retry mechanisms for failed uploads
3. **Caching**: Cache reflection lists and details for better performance
4. **Pagination**: Handle paginated responses for large reflection lists
5. **Loading States**: Show loading indicators during API calls
6. **Offline Support**: Consider offline storage for draft reflections

---

This integration guide provides everything needed to implement the puzzle reflection functionality in your frontend application!