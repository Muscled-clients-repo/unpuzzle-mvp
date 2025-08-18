// Main export file for video-editor module
// ARCHITECTURE: Clean API surface following all 5 principles

export { VideoEditorProvider, useVideoEditor } from './VideoEditorProvider'
export type { VideoSegment, RecordingResult } from './types'
export { eventBus } from './events/EventBus'