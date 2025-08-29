# Course Section API Implementation Summary

## Date: August 21, 2025
## Feature: Complete Course Section CRUD Integration
## Status: ✅ IMPLEMENTED

---

## Implementation Overview

This document tracks the implementation of complete Course Section CRUD API integration.

### Completed Changes

#### 1. API Client Enhancement
**File**: `src/lib/api-client.ts`
- ✅ Add `getCourseSections` method - GET all sections with media
- ✅ Add `createCourseSection` method - POST new section
- ✅ Add `updateCourseSection` method - PUT section updates
- ✅ Add `deleteCourseSection` method - DELETE (soft delete)
- ✅ Add proper TypeScript interfaces for all operations
- ✅ Handle request/response formatting for all methods

#### 2. Store Updates
**File**: `src/stores/slices/course-creation-slice.ts`
- ✅ Add `loadCourseSections` integrated into `loadCourseFromAPI`
- ✅ Modify `createChapter` to use POST API
- ✅ Modify `updateChapter` to use PUT API
- ✅ Modify `deleteChapter` to use DELETE API
- ✅ Add error handling for all operations
- ✅ Update local state with server responses
- ✅ Map between chapters (frontend) and sections (backend)

#### 3. UI Component Updates
**File**: `src/app/instructor/course/[id]/edit/page.tsx`
- ✅ Add loading states for all CRUD operations
- ✅ Disable buttons during API calls
- ✅ Add isCreatingChapter state for Add Chapter button
- ✅ Add updatingChapterId state for edit operations
- ✅ Add deletingChapterId state for delete operations
- ✅ Show loading spinners during operations
- ✅ Disable inputs during updates

---

## Implementation Steps

### Step 1: API Client Methods
```typescript
// To be added to src/lib/api-client.ts

// GET - Fetch all sections
async getCourseSections(courseId: string) {
  return this.request(`/api/v1/content/courses/${courseId}/sections`, {
    method: 'GET'
  });
}

// POST - Create new section
async createCourseSection(courseId: string, sectionData: CreateSectionData) {
  return this.request(`/api/v1/content/courses/${courseId}/sections`, {
    method: 'POST',
    body: JSON.stringify(sectionData)
  });
}

// PUT - Update section
async updateCourseSection(sectionId: string, updates: UpdateSectionData) {
  return this.request(`/api/v1/content/sections/${sectionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

// DELETE - Soft delete section
async deleteCourseSection(sectionId: string) {
  return this.request(`/api/v1/content/sections/${sectionId}`, {
    method: 'DELETE'
  });
}
```

### Step 2: Store Integration
```typescript
// To be updated in src/stores/app-store.ts

// Load sections when editing course
loadCourseSections: async (courseId: string) => {
  const response = await apiClient.getCourseSections(courseId);
  // Map sections to chapters format
}

// Create with API
createChapter: async (title: string) => {
  const response = await apiClient.createCourseSection(courseId, data);
  // Update local state
}

// Update with API
updateChapter: async (chapterId: string, updates: any) => {
  const response = await apiClient.updateCourseSection(chapterId, updates);
  // Update local state
}

// Delete with API
deleteChapter: async (chapterId: string) => {
  await apiClient.deleteCourseSection(chapterId);
  // Remove from local state
}
```

### Step 3: UI Updates
```typescript
// To be updated in edit/page.tsx
const [isCreating, setIsCreating] = useState(false);
const [isUpdating, setIsUpdating] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState<string | null>(null);

const handleAddChapter = async () => {
  setIsCreating(true);
  try {
    await createChapter(title);
  } finally {
    setIsCreating(false);
  }
}
```

---

## Testing Checklist

### GET Operations
- [ ] Test loading sections when editing existing course
- [ ] Test handling empty sections list
- [ ] Test media files display within sections
- [ ] Test section ordering display

### POST Operations
- [ ] Test creating section on existing course
- [ ] Test creating section on new unsaved course
- [ ] Test validation errors (empty title)
- [ ] Test order auto-assignment

### PUT Operations
- [ ] Test updating section title
- [ ] Test updating section description
- [ ] Test updating publish/preview status
- [ ] Test reordering sections
- [ ] Test partial updates (only changed fields)

### DELETE Operations
- [ ] Test soft delete functionality
- [ ] Test UI removal after delete
- [ ] Test media files handling after delete

### Error Handling
- [ ] Test 403 permission errors
- [ ] Test 404 not found errors
- [ ] Test 400 validation errors
- [ ] Test network failures
- [ ] Test rate limiting responses

### UI/UX
- [ ] Test loading states for all operations
- [ ] Test button disabling during operations
- [ ] Test error message displays
- [ ] Test success feedback
- [ ] Test optimistic updates rollback on error

---

## Potential Issues & Solutions

### Issue 1: New Course Without ID
**Problem**: Cannot create sections for unsaved courses
**Solution**: Auto-save course as draft before creating sections

### Issue 2: Terminology Mismatch
**Problem**: API uses "sections", frontend uses "chapters"
**Solution**: Map between terms in API client layer

### Issue 3: Order Conflicts
**Problem**: Multiple users editing same course
**Solution**: Rely on server-assigned order values

---

## Code Snippets for Implementation

### Type Definitions
```typescript
// Request types
interface CreateSectionData {
  title: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
  isPreview?: boolean;
}

interface UpdateSectionData {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
  isPreview?: boolean;
}

// Response types
interface SectionResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  isPreview: boolean;
  mediaFiles?: MediaFile[];
  mediaCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface MediaFile {
  id: string;
  title: string;
  originalFilename: string;
  fileType: string;
  durationSeconds?: number;
  orderInSection: number;
  isPreview: boolean;
}

interface GetSectionsResponse {
  sections: SectionResponse[];
  totalSections: number;
}
```

### Error Handler
```typescript
const handleSectionError = (operation: string, error: any) => {
  const errorMessages = {
    create: {
      403: "You don't have permission to add sections to this course",
      404: "Course not found",
      400: "Invalid section data. Please check required fields"
    },
    update: {
      403: "You don't have permission to edit this section",
      404: "Section not found",
      400: "Invalid update data"
    },
    delete: {
      403: "You don't have permission to delete this section",
      404: "Section not found"
    },
    get: {
      403: "You don't have permission to view this course",
      404: "Course not found"
    }
  };

  const messages = errorMessages[operation];
  if (messages && messages[error.status]) {
    return messages[error.status];
  }
  
  return `Failed to ${operation} section. Please try again.`;
}
```

### State Mapping Helper
```typescript
// Map backend section to frontend chapter format
const mapSectionToChapter = (section: SectionResponse) => ({
  id: section.id,
  title: section.title,
  description: section.description || '',
  order: section.order,
  isPublished: section.isPublished,
  isPreview: section.isPreview,
  videos: section.mediaFiles || [],
  mediaCount: section.mediaCount || 0,
  createdAt: section.createdAt,
  updatedAt: section.updatedAt
});

// Map frontend chapter to backend section format
const mapChapterToSection = (chapter: any) => ({
  title: chapter.title,
  description: chapter.description,
  order: chapter.order,
  isPublished: chapter.isPublished,
  isPreview: chapter.isPreview
});
```

---

## Next Steps

1. Review complete CRUD plan with team
2. Implement API client methods (all 4 operations)
3. Update store with complete CRUD functionality
4. Enhance UI for all operations
5. Test each CRUD operation independently
6. Integrate and test end-to-end flow
7. Update this document with actual implementation results

---

## Notes for Implementation

- **Terminology**: Map "chapters" (frontend) ↔ "sections" (backend)
- **Soft Delete**: Sections are marked deleted, not removed from DB
- **Media Association**: Deleted sections set media file section_id to NULL
- **Rate Limits**: GET (100/min), POST (20/min), PUT (30/min), DELETE (20/min)
- **Defaults**: Override isPublished to false for new sections (API defaults to true)
- **Loading States**: Implement separate states for each operation type
- **Optimistic Updates**: Consider for better UX, with rollback on error
- **Error Recovery**: Add retry logic for transient network failures
- **Logging**: Log all API calls for debugging
- **Update Document**: After implementation, mark completed items with ✅