'use client'

import { useState, useRef, useCallback } from 'react'
import { Clip } from './types'
import { timeToFrame } from './utils'

interface UseRecordingProps {
  totalFrames: number
  onClipCreated: (clip: Clip) => void
  onTotalFramesUpdate: (frames: number) => void
}

export function useRecording({ 
  totalFrames, 
  onClipCreated, 
  onTotalFramesUpdate 
}: UseRecordingProps) {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      })
      
      chunksRef.current = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        
        // Calculate duration in frames
        const recordingSeconds = (Date.now() - recordingStartTimeRef.current) / 1000
        const durationFrames = timeToFrame(recordingSeconds)
        
        // Create new clip at end of timeline
        const newClip: Clip = {
          id: `clip-${Date.now()}`,
          url,
          startFrame: totalFrames,
          durationFrames,
          sourceInFrame: 0,
          sourceOutFrame: durationFrames
        }
        
        onClipCreated(newClip)
        onTotalFramesUpdate(totalFrames + durationFrames)
        setIsRecording(false)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      recorder.start()
      recordingStartTimeRef.current = Date.now()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsRecording(false)
    }
  }, [totalFrames, onClipCreated, onTotalFramesUpdate])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording
  }
}