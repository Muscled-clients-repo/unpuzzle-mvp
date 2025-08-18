// ARCHITECTURE: Following Principle 4 - Service Boundary Isolation (lines 25-28)
// Single responsibility: ONLY handles recording
// Implementation from lines 288-443 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import type { TypedEventBus } from '../events/EventBus'
import type { RecordingResult } from '../types'

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private startTime: number | null = null
  private stream: MediaStream | null = null

  constructor(private eventBus: TypedEventBus) {}

  async start(mode: 'screen' | 'camera' | 'audio'): Promise<void> {
    if (this.mediaRecorder?.state === 'recording') {
      throw new Error('Recording already in progress')
    }

    try {
      // Get media stream based on mode
      this.stream = await this.getMediaStream(mode)
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      // Set up event handlers
      this.setupMediaRecorderEvents()

      // Start recording
      this.startTime = performance.now()
      this.mediaRecorder.start()

      // Emit event
      this.eventBus.emit('recording.started', {
        startTime: this.startTime,
        mode
      })

    } catch (error) {
      this.eventBus.emit('recording.error', { error: error as Error })
      throw error
    }
  }

  async stop(): Promise<RecordingResult> {
    if (!this.mediaRecorder || !this.startTime) {
      throw new Error('No active recording to stop')
    }

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = []
      
      this.mediaRecorder!.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      this.mediaRecorder!.onstop = () => {
        const endTime = performance.now()
        const duration = (endTime - this.startTime!) / 1000
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)

        const result: RecordingResult = {
          blob,
          url,
          duration,
          startTime: this.startTime!,
          endTime
        }

        // Emit event
        this.eventBus.emit('recording.stopped', {
          duration: result.duration,
          videoBlob: result.blob,
          videoUrl: result.url
        })

        // Cleanup
        this.cleanup()
        
        resolve(result)
      }

      this.mediaRecorder!.onerror = (event) => {
        const error = new Error('MediaRecorder error')
        this.eventBus.emit('recording.error', { error })
        reject(error)
      }

      this.mediaRecorder!.stop()
    })
  }

  private async getMediaStream(mode: string): Promise<MediaStream> {
    switch (mode) {
      case 'screen':
        return navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
      case 'camera':
        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
      case 'audio':
        return navigator.mediaDevices.getUserMedia({
          audio: true
        })
      default:
        throw new Error(`Unsupported recording mode: ${mode}`)
    }
  }

  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return

    this.mediaRecorder.onstart = () => {
      console.log('Media recorder started')
    }

    this.mediaRecorder.onpause = () => {
      console.log('Media recorder paused')
    }

    this.mediaRecorder.onresume = () => {
      console.log('Media recorder resumed')
    }
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.startTime = null
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  get recordingDuration(): number {
    if (!this.startTime) return 0
    return (performance.now() - this.startTime) / 1000
  }
}