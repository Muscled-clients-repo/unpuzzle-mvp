'use client'

import { useState, useRef, useCallback } from 'react'
import { Clip, Track } from './types'
import { timeToFrame } from './utils'

interface UseRecordingProps {
  totalFrames: number
  selectedClipId?: string | null
  selectedTrackIndex?: number | null
  clips?: Clip[]
  tracks?: Track[]
  onClipCreated: (clip: Clip) => void
  onTotalFramesUpdate: (frames: number) => void
}

export function useRecording({ 
  totalFrames, 
  selectedClipId,
  selectedTrackIndex,
  clips = [],
  tracks = [],
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
        
        // Determine which track to use (priority order)
        let targetTrackIndex = 0 // Default to first video track
        
        // 1. If a clip is selected, use its track (if it's a video track)
        if (selectedClipId && clips.length > 0) {
          const selectedClip = clips.find(c => c.id === selectedClipId)
          if (selectedClip) {
            const track = tracks.find(t => t.index === selectedClip.trackIndex)
            if (track && track.type === 'video') {
              targetTrackIndex = selectedClip.trackIndex
              console.log(`Recording to track ${targetTrackIndex} from selected clip ${selectedClipId}`)
            }
          }
        }
        // 2. Otherwise, if a track is selected and it's a video track, use that
        else if (selectedTrackIndex !== null && selectedTrackIndex !== undefined) {
          const track = tracks.find(t => t.index === selectedTrackIndex)
          if (track && track.type === 'video') {
            targetTrackIndex = selectedTrackIndex
            console.log(`Recording to selected track index: ${targetTrackIndex} (${track.name})`)
          } else if (track && track.type === 'audio') {
            // If audio track is selected, find first video track
            const firstVideoTrack = tracks.find(t => t.type === 'video')
            if (firstVideoTrack) {
              targetTrackIndex = firstVideoTrack.index
              console.log(`Selected track is audio, recording to first video track: ${firstVideoTrack.name}`)
            }
          }
        }
        // 3. Otherwise default to first video track
        else {
          const firstVideoTrack = tracks.find(t => t.type === 'video')
          if (firstVideoTrack) {
            targetTrackIndex = firstVideoTrack.index
            console.log(`Recording to default video track: ${firstVideoTrack.name}`)
          }
        }
        
        console.log(`Final target track index: ${targetTrackIndex}`)
        
        // Create new clip at end of timeline
        const newClip: Clip = {
          id: `clip-${Date.now()}`,
          url,
          trackIndex: targetTrackIndex,
          startFrame: totalFrames,
          durationFrames,
          originalDurationFrames: durationFrames, // Store original duration
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
  }, [totalFrames, selectedClipId, selectedTrackIndex, clips, tracks, onClipCreated, onTotalFramesUpdate])

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