import { act, renderHook } from '@testing-library/react'
import { useCourseCreationUI } from '@/stores/course-creation-ui'

// Reset store before each test
beforeEach(() => {
  const { clearForm } = useCourseCreationUI.getState()
  clearForm()
})

describe('useCourseCreationUI', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    expect(result.current.currentStep).toBe(1)
    expect(result.current.completedSteps.size).toBe(0)
    expect(result.current.formData.title).toBe('')
    expect(result.current.editing.type).toBeNull()
    expect(result.current.modal.type).toBeNull()
  })

  it('should update form data correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    act(() => {
      result.current.updateFormData('title', 'Test Course')
    })
    
    expect(result.current.formData.title).toBe('Test Course')
  })

  it('should validate form correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    // Should be invalid with empty data
    expect(result.current.validateForm()).toBe(false)
    
    act(() => {
      result.current.updateFormData('title', 'Test Course')
      result.current.updateFormData('description', 'Test Description')
    })
    
    // Should be valid with title and description
    expect(result.current.validateForm()).toBe(true)
  })

  it('should handle editing state correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    act(() => {
      result.current.startEdit('chapter', 'chapter-1', 'title')
    })
    
    expect(result.current.editing.type).toBe('chapter')
    expect(result.current.editing.id).toBe('chapter-1')
    expect(result.current.editing.field).toBe('title')
    expect(result.current.isEditing('chapter', 'chapter-1', 'title')).toBe(true)
    expect(result.current.isEditing('video', 'chapter-1', 'title')).toBe(false)
    
    act(() => {
      result.current.stopEdit()
    })
    
    expect(result.current.editing.type).toBeNull()
    expect(result.current.isEditing('chapter', 'chapter-1', 'title')).toBe(false)
  })

  it('should handle upload state correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    const mockUpload = {
      id: 'upload-1',
      file: new File(['test'], 'test.mp4'),
      filename: 'test.mp4',
      chapterId: 'chapter-1',
      progress: 0,
      status: 'pending' as const
    }
    
    act(() => {
      result.current.addUpload(mockUpload)
    })
    
    expect(result.current.uploads['upload-1']).toBeDefined()
    expect(result.current.getUploadsByChapter('chapter-1')).toHaveLength(1)
    
    act(() => {
      result.current.updateUploadProgress('upload-1', 50)
    })
    
    expect(result.current.uploads['upload-1'].progress).toBe(50)
    
    act(() => {
      result.current.updateUploadStatus('upload-1', 'complete')
    })
    
    expect(result.current.uploads['upload-1'].status).toBe('complete')
  })

  it('should handle pending deletes correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    act(() => {
      result.current.markForDeletion('video-1')
    })
    
    expect(result.current.pendingDeletes.has('video-1')).toBe(true)
    
    act(() => {
      result.current.unmarkForDeletion('video-1')
    })
    
    expect(result.current.pendingDeletes.has('video-1')).toBe(false)
  })

  it('should compute validation errors correctly', () => {
    const { result } = renderHook(() => useCourseCreationUI())
    
    const errors = result.current.getValidationErrors()
    expect(errors).toContain('Course title is required')
    expect(errors).toContain('Course description is required')
    expect(errors).toContain('At least one chapter is required')
    
    act(() => {
      result.current.updateFormData('title', 'Test')
      result.current.updateFormData('description', 'Test')
      result.current.updateFormData('plannedChapters', [
        { id: 'ch-1', title: 'Chapter 1', plannedVideos: [] }
      ])
    })
    
    const updatedErrors = result.current.getValidationErrors()
    expect(updatedErrors).toHaveLength(0)
  })
})