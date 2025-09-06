'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useCourse } from '@/hooks/use-course-queries'
import { useCourseMutations } from '@/hooks/use-course-mutations'
import { useVideoMutations } from '@/hooks/use-video-mutations'
import { useChapters } from '@/hooks/use-course-queries'
import { 
  useWizardState, 
  useFormState, 
  usePreferences,
  useUploadProgress,
  useModalState
} from '@/stores/app-store-new'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, Plus, Settings, Video } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CourseEditNewPage({ params }: PageProps) {
  const router = useRouter()
  const { id: courseId } = use(params)
  
  // Server state via TanStack Query
  const { data: course, isLoading, error } = useCourse(courseId)
  const { data: chapters } = useChapters(courseId)
  
  // Server mutations
  const { updateCourse, deleteCourse, saveDraft } = useCourseMutations()
  const { 
    uploadVideo, 
    deleteVideo, 
    reorderVideos, 
    updateVideo 
  } = useVideoMutations(courseId)
  
  // UI state only
  const wizard = useWizardState()
  const form = useFormState()
  const preferences = usePreferences()
  const uploadProgress = useUploadProgress()
  const deleteModal = useModalState('delete-course')
  const deleteVideoModal = useModalState('delete-video')
  
  // Local form state (before submission)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
    level: 'beginner'
  })
  
  // Initialize form data when course loads
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        price: course.price || 0,
        category: course.category || '',
        level: course.level || 'beginner'
      })
    }
  }, [course])
  
  // Auto-save functionality
  useEffect(() => {
    if (!preferences.autoSave || !form.isDirty || !course) return
    
    const timer = setTimeout(() => {
      handleSaveDraft()
    }, 5000) // Auto-save after 5 seconds of no changes
    
    return () => clearTimeout(timer)
  }, [formData, preferences.autoSave, form.isDirty])
  
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    form.setFormDirty(true)
  }
  
  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ id: courseId, data: formData })
      form.setFormDirty(false)
      toast.success('Draft saved')
    } catch (error) {
      toast.error('Failed to save draft')
    }
  }
  
  const handleSaveCourse = async () => {
    // Clear previous errors
    form.clearAllFormErrors()
    
    // Validate
    let hasErrors = false
    if (!formData.title.trim()) {
      form.setFormError('title', ['Title is required'])
      hasErrors = true
    }
    if (!formData.description.trim()) {
      form.setFormError('description', ['Description is required'])
      hasErrors = true
    }
    if (formData.price < 0) {
      form.setFormError('price', ['Price must be positive'])
      hasErrors = true
    }
    
    if (hasErrors) {
      toast.error('Please fix the errors')
      return
    }
    
    try {
      await updateCourse.mutateAsync({ id: courseId, data: formData })
      form.setFormDirty(false)
      toast.success('Course updated successfully')
    } catch (error) {
      toast.error('Failed to update course')
    }
  }
  
  const handleDeleteCourse = async () => {
    try {
      await deleteCourse.mutateAsync(courseId)
      deleteModal.close()
      toast.success('Course deleted')
      router.push('/instructor/courses')
    } catch (error) {
      toast.error('Failed to delete course')
    }
  }
  
  const handleVideoUpload = async (files: FileList) => {
    const chapterId = chapters?.[0]?.id || 'chapter-1'
    
    for (const file of Array.from(files)) {
      uploadVideo.mutate({ file, chapterId })
    }
  }
  
  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteVideo.mutateAsync(videoId)
      deleteVideoModal.close()
      toast.success('Video deleted')
    } catch (error) {
      toast.error('Failed to delete video')
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <button 
          onClick={() => router.push('/instructor/courses')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Back to Courses
        </button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/instructor/courses')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Course (New Architecture)</h1>
            <p className="text-gray-600 dark:text-gray-400">Using TanStack Query + Server Actions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {form.isDirty && (
            <span className="text-sm text-orange-500">Unsaved changes</span>
          )}
          {saveDraft.isPending && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          <button
            onClick={handleSaveCourse}
            disabled={updateCourse.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {updateCourse.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Course
          </button>
        </div>
      </div>
      
      {/* Auto-save indicator */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input 
            type="checkbox"
            checked={preferences.autoSave}
            onChange={preferences.toggleAutoSave}
          />
          <span>Auto-save enabled</span>
        </label>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button 
          onClick={() => wizard.setWizardStep('info')}
          className={`pb-2 px-4 ${
            wizard.currentStep === 'info' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Course Info
        </button>
        <button 
          onClick={() => wizard.setWizardStep('content')}
          className={`pb-2 px-4 ${
            wizard.currentStep === 'content' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Content
        </button>
        <button 
          onClick={() => wizard.setWizardStep('review')}
          className={`pb-2 px-4 ${
            wizard.currentStep === 'review' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Settings
        </button>
      </div>
      
      {/* Content based on current step */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      {wizard.currentStep === 'info' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Title</label>
            <input 
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {form.errors.title && (
              <p className="text-red-500 text-sm mt-1">{form.errors.title[0]}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {form.errors.description && (
              <p className="text-red-500 text-sm mt-1">{form.errors.description[0]}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Price</label>
              <input 
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {form.errors.price && (
                <p className="text-red-500 text-sm mt-1">{form.errors.price[0]}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Level</label>
              <select 
                value={formData.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {wizard.currentStep === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Course Videos</h2>
            <label className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:bg-green-600">
              <input 
                type="file"
                multiple
                accept="video/*"
                onChange={(e) => e.target.files && handleVideoUpload(e.target.files)}
                className="hidden"
              />
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Videos
              </span>
            </label>
          </div>
          
          {/* Upload Progress */}
          {Object.entries(uploadProgress.progress).length > 0 && (
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Uploading:</h3>
              {Object.entries(uploadProgress.progress).map(([id, progress]) => (
                <div key={id} className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm">{progress}%</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Video List */}
          <div className="space-y-2">
            {course.videos?.map((video: any) => (
              <div 
                key={video.id} 
                className="flex items-center justify-between p-3 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{video.title || video.filename}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {video.status === 'ready' ? 'Ready' : 'Processing...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteVideoModal.open({ 
                    videoId: video.id, 
                    videoTitle: video.title 
                  })}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
            
            {(!course.videos || course.videos.length === 0) && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No videos yet. Add your first video to get started.
              </p>
            )}
          </div>
        </div>
      )}
      
      {wizard.currentStep === 'review' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Course Settings</h2>
          
          <div className="p-4 border dark:border-gray-600 rounded">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Course Status</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Status: <span className="font-medium">{course.status}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Created: {new Date(course.created_at).toLocaleDateString()}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {new Date(course.updated_at).toLocaleDateString()}
            </p>
          </div>
          
          <div className="p-4 border border-red-200 dark:border-red-800 rounded">
            <h3 className="font-medium text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
            <button
              onClick={() => deleteModal.open({ courseId, courseTitle: course.title })}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete Course
            </button>
          </div>
        </div>
      )}
      </div>
      
      {/* Delete Course Modal */}
      {deleteModal.isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={deleteModal.close}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 p-6 min-w-[400px]">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Delete Course</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{deleteModal.data?.courseTitle}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={deleteModal.close}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCourse}
                disabled={deleteCourse.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {deleteCourse.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Delete Video Modal */}
      {deleteVideoModal.isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={deleteVideoModal.close}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 p-6 min-w-[400px]">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Delete Video</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{deleteVideoModal.data?.videoTitle}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={deleteVideoModal.close}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteVideo(deleteVideoModal.data?.videoId)}
                disabled={deleteVideo.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {deleteVideo.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}