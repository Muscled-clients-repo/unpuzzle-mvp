'use client'

import { 
  useAppStore,
  useWizardState,
  useModalState,
  useUploadProgress,
  useFormState,
  usePreferences,
  useVideoSelection,
  useHasUnsavedChanges
} from '@/stores/app-store-new'

export default function TestUIStatePage() {
  // Test various UI state hooks
  const wizard = useWizardState()
  const deleteModal = useModalState('delete-confirm')
  const uploadProgress = useUploadProgress()
  const form = useFormState()
  const preferences = usePreferences()
  const videoSelection = useVideoSelection()
  const hasUnsavedChanges = useHasUnsavedChanges()
  
  // Direct store access for testing
  const { 
    searchQuery, 
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    activeTab,
    setActiveTab
  } = useAppStore()
  
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Test Minimal UI State (Phase 3)</h1>
      
      <div className="p-4 bg-blue-100 rounded">
        <p className="font-bold mb-2">✅ This page uses:</p>
        <ul className="list-disc ml-5">
          <li>New minimal UI-only Zustand store</li>
          <li>NO server data in store</li>
          <li>Clean separation of concerns</li>
        </ul>
      </div>
      
      {/* Wizard State Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Wizard Navigation</h2>
        <p>Current Step: <strong>{wizard.currentStep}</strong></p>
        <p>Transitioning: {wizard.isTransitioning ? 'Yes' : 'No'}</p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={wizard.prev}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Previous
          </button>
          <button 
            onClick={wizard.next}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Next
          </button>
          <button 
            onClick={wizard.reset}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Reset
          </button>
        </div>
      </section>
      
      {/* Modal State Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Modal Management</h2>
        <p>Delete Modal Open: {deleteModal.isOpen ? 'Yes' : 'No'}</p>
        <p>Modal Data: {JSON.stringify(deleteModal.data)}</p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => deleteModal.open({ itemId: '123', itemName: 'Test Item' })}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Open Delete Modal
          </button>
          <button 
            onClick={deleteModal.close}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Close Modal
          </button>
        </div>
        
        {/* Actual Modal Component */}
        {deleteModal.isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={deleteModal.close}
            />
            
            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 p-6 min-w-[400px]">
              <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
              
              <p className="mb-4">
                Are you sure you want to delete <strong>{deleteModal.data?.itemName}</strong>?
              </p>
              
              <p className="text-sm text-gray-600 mb-6">
                Item ID: {deleteModal.data?.itemId}
              </p>
              
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={deleteModal.close}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    console.log('Deleting item:', deleteModal.data)
                    alert(`Deleted ${deleteModal.data?.itemName}!`)
                    deleteModal.close()
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      
      {/* Upload Progress Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Upload Progress</h2>
        <div className="space-y-2">
          {Object.entries(uploadProgress.progress).map(([id, progress]) => (
            <div key={id} className="flex items-center gap-4">
              <span>Video {id}:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{progress}%</span>
              <button 
                onClick={() => uploadProgress.clearProgress(id)}
                className="text-red-500 text-sm"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => {
              const id = `video-${Date.now()}`
              let progress = 0
              const interval = setInterval(() => {
                progress += 10
                uploadProgress.setProgress(id, progress)
                if (progress >= 100) {
                  clearInterval(interval)
                  setTimeout(() => uploadProgress.clearProgress(id), 1000)
                }
              }, 200)
            }}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Simulate Upload
          </button>
          <button 
            onClick={uploadProgress.clearAll}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Clear All
          </button>
        </div>
      </section>
      
      {/* Form State Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Form State</h2>
        <p>Is Dirty: {form.isDirty ? 'Yes' : 'No'}</p>
        <p>Has Unsaved Changes: {hasUnsavedChanges ? 'Yes' : 'No'}</p>
        <p>Errors: {JSON.stringify(form.errors)}</p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => form.setError('title', ['Title is required'])}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Add Error
          </button>
          <button 
            onClick={() => form.clearError('title')}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Clear Error
          </button>
          <button 
            onClick={form.reset}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reset Form
          </button>
        </div>
      </section>
      
      {/* Preferences Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">User Preferences (Persisted)</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={preferences.autoSave}
              onChange={preferences.toggleAutoSave}
            />
            Auto-save enabled
          </label>
          <div className="flex items-center gap-2">
            <span>Theme:</span>
            <select 
              value={preferences.theme}
              onChange={(e) => preferences.setTheme(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={preferences.sidebarCollapsed}
              onChange={preferences.toggleSidebar}
            />
            Sidebar collapsed
          </label>
        </div>
      </section>
      
      {/* Video Selection Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Video Selection</h2>
        <p>Selected: {videoSelection.selected.join(', ') || 'None'}</p>
        <div className="flex gap-2 mt-2">
          {['video-1', 'video-2', 'video-3'].map(id => (
            <button 
              key={id}
              onClick={() => videoSelection.toggle(id)}
              className={`px-4 py-2 rounded ${
                videoSelection.selected.includes(id) 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200'
              }`}
            >
              {id}
            </button>
          ))}
          <button 
            onClick={videoSelection.clear}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Clear All
          </button>
        </div>
      </section>
      
      {/* Search and Filter Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Search & Filter</h2>
        <div className="space-y-2">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="border rounded px-3 py-2 w-full"
          />
          <div className="flex gap-2">
            {(['all', 'draft', 'published'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded ${
                  filterStatus === status 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>
      
      {/* Tab Navigation Test */}
      <section className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Tab Navigation</h2>
        <p>Active Tab: {activeTab}</p>
        <div className="flex gap-2 mt-2">
          {['content', 'settings', 'analytics'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${
                activeTab === tab 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>
      
      <div className="mt-8 p-4 bg-green-100 rounded">
        <p className="font-bold">✅ Phase 3 Complete!</p>
        <p className="mt-2">
          The minimal UI slice is working. It only contains UI state,
          no server data. User preferences are persisted to localStorage.
        </p>
      </div>
    </div>
  )
}