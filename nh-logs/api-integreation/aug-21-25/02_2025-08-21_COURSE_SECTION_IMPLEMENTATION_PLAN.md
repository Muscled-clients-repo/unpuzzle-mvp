# Course Section API Implementation Plan

## Date: August 21, 2025
## Feature: Complete Course Section CRUD Integration

---

## 1. API Specification

### All Section Endpoints

#### 1.1 Get Course Sections
```
GET /api/v1/content/courses/{course_id}/sections
```
Response includes sections with media files and counts.

#### 1.2 Create Course Section
```
POST /api/v1/content/courses/{course_id}/sections
```
Creates a new section within a course.

#### 1.3 Update Course Section
```
PUT /api/v1/content/sections/{section_id}
```
Updates an existing section (all fields optional).

#### 1.4 Delete Course Section
```
DELETE /api/v1/content/sections/{section_id}
```
Soft-deletes a section (preserves data, removes from view).

---

## 2. Current Implementation Analysis

### Existing Chapter/Section Functionality
The application currently has a chapter creation system that needs to be integrated with the backend API:

#### Current Implementation (Frontend Only)
```typescript
// In app-store.ts
createChapter: (title: string) => {
  // Currently creates chapters locally without API call
  const newChapter = {
    id: generateId(),
    title,
    description: '',
    videos: [],
    order: chapters.length + 1
  }
}
```

#### Files to Modify
1. `src/stores/app-store.ts` - Add API integration to createChapter
2. `src/lib/api-client.ts` - Add createCourseSection method
3. `src/app/instructor/course/[id]/edit/page.tsx` - Update UI to handle API responses
4. `src/app/instructor/course/new/page.tsx` - Ensure new courses can add sections

---

## 3. Implementation Tasks

### Task 1: Update API Client
**File**: `src/lib/api-client.ts`

Add complete CRUD methods for course sections:
```typescript
// Get all sections for a course
async getCourseSections(courseId: string) {
  return this.request(`/api/v1/content/courses/${courseId}/sections`, {
    method: 'GET'
  });
}

// Create a new section
async createCourseSection(courseId: string, data: {
  title: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
  isPreview?: boolean;
}) {
  return this.request(`/api/v1/content/courses/${courseId}/sections`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Update existing section
async updateCourseSection(sectionId: string, data: {
  title?: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
  isPreview?: boolean;
}) {
  return this.request(`/api/v1/content/sections/${sectionId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// Delete a section
async deleteCourseSection(sectionId: string) {
  return this.request(`/api/v1/content/sections/${sectionId}`, {
    method: 'DELETE'
  });
}
```

### Task 2: Update App Store
**File**: `src/stores/app-store.ts`

Modify all chapter functions to integrate with API:

```typescript
// Load sections when loading course for edit
loadCourseSections: async (courseId: string) => {
  try {
    const response = await apiClient.getCourseSections(courseId);
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        chapters: response.data.sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description || '',
          order: section.order,
          isPublished: section.isPublished,
          isPreview: section.isPreview,
          videos: section.mediaFiles || [],
          mediaCount: section.mediaCount || 0
        }))
      }
    }));
  } catch (error) {
    console.error('Failed to load sections:', error);
  }
},

// Create new chapter/section
createChapter: async (title: string) => {
  const { courseCreation } = get();
  if (!courseCreation?.id) {
    // For new courses, save draft first to get course ID
    await get().saveDraft();
  }
  
  try {
    const response = await apiClient.createCourseSection(courseCreation.id, {
      title,
      description: '',
      order: courseCreation.chapters.length + 1,
      isPublished: false,
      isPreview: false
    });
    
    // Update local state with server response
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        chapters: [...state.courseCreation.chapters, {
          id: response.data.id,
          title: response.data.title,
          description: response.data.description || '',
          order: response.data.order,
          isPublished: response.data.isPublished,
          isPreview: response.data.isPreview,
          videos: [],
          mediaCount: 0
        }]
      }
    }));
  } catch (error) {
    console.error('Failed to create chapter:', error);
    throw error;
  }
},

// Update existing chapter/section
updateChapter: async (chapterId: string, updates: any) => {
  try {
    const response = await apiClient.updateCourseSection(chapterId, updates);
    
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        chapters: state.courseCreation.chapters.map(ch =>
          ch.id === chapterId ? { ...ch, ...updates } : ch
        )
      }
    }));
  } catch (error) {
    console.error('Failed to update chapter:', error);
    throw error;
  }
},

// Delete chapter/section
deleteChapter: async (chapterId: string) => {
  try {
    await apiClient.deleteCourseSection(chapterId);
    
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        chapters: state.courseCreation.chapters.filter(ch => ch.id !== chapterId)
      }
    }));
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    throw error;
  }
}
```

### Task 3: Update UI Components
**Files**: 
- `src/app/instructor/course/[id]/edit/page.tsx`
- `src/app/instructor/course/new/page.tsx`

Updates needed:
1. Add loading states during chapter creation
2. Show error messages if creation fails
3. Disable "Add Chapter" button during API call
4. Show success feedback

### Task 4: Handle Edge Cases

#### New Course Flow
When creating chapters for a new course that hasn't been saved yet:
1. First save the course as draft to get course ID
2. Then create the section with the API
3. Update local state accordingly

#### Error Handling
- 400: Show validation errors
- 403: Show permission denied message
- 404: Course not found - redirect to courses page
- Network errors: Show retry option

---

## 4. Testing Plan

### Manual Testing Scenarios
1. **Create section on existing course**
   - Navigate to course edit page
   - Click "Add Chapter"
   - Verify API call is made
   - Verify UI updates with response data

2. **Create section on new course**
   - Create new course
   - Add chapter before saving
   - Verify course is saved first
   - Verify chapter is created with course ID

3. **Error scenarios**
   - Test with invalid data
   - Test with network offline
   - Test with unauthorized user

### API Testing
Use the provided Postman collection to test the endpoint directly before integration.

---

## 5. Implementation Order

1. **Phase 1: API Client** (15 minutes)
   - Add all CRUD methods for sections
   - Add proper TypeScript types
   - Test with direct API calls

2. **Phase 2: Store Integration** (30 minutes)
   - Update loadCourseForEdit to load sections
   - Update createChapter function
   - Update updateChapter function
   - Update deleteChapter function
   - Add error handling for all methods
   - Test state updates

3. **Phase 3: UI Updates** (20 minutes)
   - Add loading states for all operations
   - Add error displays
   - Update chapter UI to show publish/preview status
   - Test user experience

4. **Phase 4: Edge Cases** (15 minutes)
   - Handle new course flow
   - Handle section reordering
   - Add proper error messages
   - Final testing

---

## 6. Rollback Plan

If issues occur:
1. Keep existing local-only chapter creation as fallback
2. Add feature flag to toggle API integration
3. Log errors for debugging without breaking UX

---

## 7. Success Criteria

- ✅ All CRUD operations work via API (Create, Read, Update, Delete)
- ✅ Sections load when editing a course
- ✅ New sections are created via API
- ✅ Section updates persist to backend
- ✅ Section deletion works (soft delete)
- ✅ Server response updates local state correctly
- ✅ Proper error handling for all operations
- ✅ Works for both new and existing courses
- ✅ UI provides clear feedback for all operations
- ✅ Loading states shown during API calls
- ✅ Media files display within sections
- ✅ Section ordering is maintained
- ✅ No regression in existing functionality

---

## 8. Notes

- The backend uses "sections" terminology while frontend uses "chapters" - they are the same entity
- Map between "chapters" (frontend) and "sections" (backend) in the API layer
- The `order` field auto-assigns if not provided by backend
- `isPublished` defaults to true per API spec - override to false for new sections
- Soft delete means sections are marked deleted but data preserved
- Media files associated with deleted sections have their section_id set to NULL
- Section includes mediaFiles array and mediaCount for video management
- Rate limits: GET (100/min), POST (20/min), PUT (30/min), DELETE (20/min)