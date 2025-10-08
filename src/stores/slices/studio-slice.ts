import { StateCreator } from 'zustand'

/**
 * Studio State - UI state for video studio editor
 */
export interface StudioState {
  // Current project
  currentProjectId: string | null

  // Auto-save state
  hasUnsavedChanges: boolean
  lastSavedAt: number | null
  autoSaveEnabled: boolean

  // Timeline state
  currentFrame: number
  isPlaying: boolean
  zoom: number

  // Asset import
  importedMediaFiles: Record<string, any>

  // Selection state
  selectedClipIds: string[]
  selectedTrackId: string | null

  // Tool state
  activeTool: 'select' | 'trim' | 'split' | 'cut'

  // Export state
  isExporting: boolean
  exportProgress: number

  // Recording state
  isRecording: boolean
  recordingType: 'screen' | 'audio' | null
}

/**
 * Studio Actions
 */
export interface StudioActions {
  // Project management
  setCurrentProjectId: (id: string | null) => void

  // Auto-save
  setHasUnsavedChanges: (value: boolean) => void
  setLastSavedAt: (timestamp: number) => void
  setAutoSaveEnabled: (enabled: boolean) => void
  toggleAutoSave: () => void

  // Timeline controls
  setCurrentFrame: (frame: number) => void
  setIsPlaying: (playing: boolean) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void

  // Asset management
  importMediaFile: (file: any) => void
  removeImportedMedia: (fileId: string) => void
  clearImportedMedia: () => void

  // Selection
  setSelectedClips: (clipIds: string[]) => void
  toggleClipSelection: (clipId: string) => void
  clearClipSelection: () => void
  setSelectedTrack: (trackId: string | null) => void

  // Tools
  setActiveTool: (tool: StudioState['activeTool']) => void

  // Export
  setIsExporting: (exporting: boolean) => void
  setExportProgress: (progress: number) => void

  // Recording
  startRecording: (type: 'screen' | 'audio') => void
  stopRecording: () => void

  // Reset
  resetStudio: () => void
}

/**
 * Combined Studio Slice Type
 */
export interface StudioSlice extends StudioState, StudioActions {}

/**
 * Initial Studio State
 */
const initialStudioState: StudioState = {
  currentProjectId: null,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  autoSaveEnabled: true,
  currentFrame: 0,
  isPlaying: false,
  zoom: 1,
  importedMediaFiles: {},
  selectedClipIds: [],
  selectedTrackId: null,
  activeTool: 'select',
  isExporting: false,
  exportProgress: 0,
  isRecording: false,
  recordingType: null,
}

/**
 * Create Studio Slice
 */
export const createStudioSlice: StateCreator<StudioSlice> = (set, get) => ({
  ...initialStudioState,

  // Project management
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  // Auto-save
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),

  toggleAutoSave: () => set((state) => ({
    autoSaveEnabled: !state.autoSaveEnabled
  })),

  // Timeline controls
  setCurrentFrame: (frame) => set({ currentFrame: frame }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setZoom: (zoom) => set({
    zoom: Math.max(0.1, Math.min(10, zoom))
  }),

  zoomIn: () => set((state) => ({
    zoom: Math.min(10, state.zoom * 1.5)
  })),

  zoomOut: () => set((state) => ({
    zoom: Math.max(0.1, state.zoom / 1.5)
  })),

  // Asset management
  importMediaFile: (file) => set((state) => ({
    importedMediaFiles: {
      ...state.importedMediaFiles,
      [file.id]: file
    }
  })),

  removeImportedMedia: (fileId) => set((state) => {
    const { [fileId]: _, ...rest } = state.importedMediaFiles
    return { importedMediaFiles: rest }
  }),

  clearImportedMedia: () => set({ importedMediaFiles: {} }),

  // Selection
  setSelectedClips: (clipIds) => set({ selectedClipIds: clipIds }),

  toggleClipSelection: (clipId) => set((state) => ({
    selectedClipIds: state.selectedClipIds.includes(clipId)
      ? state.selectedClipIds.filter(id => id !== clipId)
      : [...state.selectedClipIds, clipId]
  })),

  clearClipSelection: () => set({ selectedClipIds: [] }),

  setSelectedTrack: (trackId) => set({ selectedTrackId: trackId }),

  // Tools
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Export
  setIsExporting: (exporting) => set({
    isExporting: exporting,
    exportProgress: exporting ? 0 : 0
  }),

  setExportProgress: (progress) => set({
    exportProgress: Math.max(0, Math.min(100, progress))
  }),

  // Recording
  startRecording: (type) => set({
    isRecording: true,
    recordingType: type
  }),

  stopRecording: () => set({
    isRecording: false,
    recordingType: null
  }),

  // Reset
  resetStudio: () => set(initialStudioState),
})
