'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCourseMutations } from '@/hooks/use-course-mutations'
import { 
  useWizardState, 
  useFormState, 
  usePreferences,
  useModalState
} from '@/stores/app-store-new'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, ArrowRight, Check } from 'lucide-react'

export default function CourseCreateNewPage() {
  const router = useRouter()
  
  // Server mutations
  const { createCourse } = useCourseMutations()
  
  // UI state only
  const wizard = useWizardState()
  const form = useFormState()
  const preferences = usePreferences()
  const cancelModal = useModalState('cancel-creation')
  
  // Local form state (before submission)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  })
  
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    form.setFormDirty(true)
  }
  
  const validateStep = (step: 'info' | 'content' | 'review') => {
    form.clearAllFormErrors()
    let hasErrors = false
    
    if (step === 'info') {
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
    }
    
    return !hasErrors
  }
  
  const handleNext = () => {
    if (wizard.currentStep === 'info' && !validateStep('info')) {
      toast.error('Please fix the errors before continuing')
      return
    }
    wizard.next()
  }
  
  const handleCreateCourse = async () => {
    // Validate all fields
    if (!validateStep('info')) {
      toast.error('Please fix the errors')
      wizard.setWizardStep('info')
      return
    }
    
    try {
      const result = await createCourse.mutateAsync(formData)
      
      form.setFormDirty(false)
      toast.success('Course created successfully!')
      
      // Redirect to edit page
      router.push(`/instructor/course/${result.data.id}/edit-new`)
    } catch (error) {
      toast.error('Failed to create course')
    }
  }
  
  const handleCancel = () => {
    if (form.isDirty) {
      cancelModal.open()
    } else {
      router.push('/instructor/courses')
    }
  }
  
  const confirmCancel = () => {
    cancelModal.close()
    router.push('/instructor/courses')
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Create New Course</h1>
            <p className="text-gray-600">Using New Architecture (TanStack + Zustand)</p>
          </div>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center flex-1">
          {/* Step 1: Info */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              wizard.currentStep === 'info' 
                ? 'bg-blue-500 text-white' 
                : wizard.currentStep === 'content' || wizard.currentStep === 'review'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200'
            }`}>
              {wizard.currentStep === 'content' || wizard.currentStep === 'review' 
                ? <Check className="h-5 w-5" /> 
                : '1'}
            </div>
            <span className="ml-2 font-medium">Course Info</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          
          {/* Step 2: Content */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              wizard.currentStep === 'content' 
                ? 'bg-blue-500 text-white' 
                : wizard.currentStep === 'review'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200'
            }`}>
              {wizard.currentStep === 'review' 
                ? <Check className="h-5 w-5" /> 
                : '2'}
            </div>
            <span className="ml-2 font-medium">Content Planning</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          
          {/* Step 3: Review */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              wizard.currentStep === 'review' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Review & Create</span>
          </div>
        </div>
      </div>
      
      {/* Content based on current step */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        {wizard.currentStep === 'info' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Course Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Course Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input 
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Complete Web Development Bootcamp"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {form.errors.title && (
                <div className="mt-1">
                  {form.errors.title.map((error, i) => (
                    <p key={i} className="text-red-500 text-sm">{error}</p>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Course Description <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what students will learn in this course..."
                rows={5}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {form.errors.description && (
                <div className="mt-1">
                  {form.errors.description.map((error, i) => (
                    <p key={i} className="text-red-500 text-sm">{error}</p>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Price ($)
                </label>
                <input 
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {form.errors.price && (
                  <div className="mt-1">
                    {form.errors.price.map((error, i) => (
                      <p key={i} className="text-red-500 text-sm">{error}</p>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Difficulty Level
                </label>
                <select 
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Category
              </label>
              <input 
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g., Web Development, Data Science"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
        
        {wizard.currentStep === 'content' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Content Planning</h2>
            
            <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Next Steps After Creation</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                After creating your course, you'll be able to:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Add chapters to organize your content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Upload videos for each chapter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Reorder and manage video content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Add quizzes and assignments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Configure pricing and enrollment settings</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Tip:</strong> You can always come back and edit your course details later. 
                Focus on getting started now and refine as you go!
              </p>
            </div>
          </div>
        )}
        
        {wizard.currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Review Course Details</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Title</h3>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formData.title || 'Not provided'}</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Description</h3>
                <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{formData.description || 'Not provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Price</h3>
                  <p className="font-medium text-gray-900 dark:text-gray-100">${formData.price.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Level</h3>
                  <p className="font-medium capitalize text-gray-900 dark:text-gray-100">{formData.level}</p>
                </div>
              </div>
              
              {formData.category && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Category</h3>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formData.category}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Ready to create!</strong> Click "Create Course" below to create your course 
                and start adding content.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleCancel}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        
        <div className="flex gap-2">
          {wizard.currentStep !== 'info' && (
            <button
              onClick={wizard.prev}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
          )}
          
          {wizard.currentStep !== 'review' ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreateCourse}
              disabled={createCourse.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {createCourse.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Course
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={cancelModal.close}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 p-6 min-w-[400px]">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Discard Changes?</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              You have unsaved changes. Are you sure you want to leave? 
              Your progress will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={cancelModal.close}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Keep Editing
              </button>
              <button 
                onClick={confirmCancel}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}