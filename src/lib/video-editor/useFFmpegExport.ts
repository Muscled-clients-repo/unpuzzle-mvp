'use client'

import { useState, useRef, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { Clip } from './types'
import { frameToTime } from './utils'

interface ExportProgress {
  phase: 'loading' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error'
  progress: number // 0-100
  message: string
  currentClip?: number
  totalClips?: number
}

interface ExportOptions {
  resolution?: '1920x1080' | '1280x720' | '854x480'
  fps?: 30 | 60
  bitrate?: string // e.g., '5M', '10M'
  codec?: 'libx264' | 'libx265'
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow'
}

export function useFFmpegExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress>({
    phase: 'loading',
    progress: 0,
    message: 'Initializing...'
  })
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const abortRef = useRef(false)
  const totalDurationRef = useRef<number>(0) // Total duration in seconds for progress calc

  // Initialize FFmpeg instance
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    const ffmpeg = new FFmpeg()

    // Set up progress logging
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    ffmpeg.on('progress', ({ progress: p, time }) => {
      // time is in microseconds, convert to seconds
      const seconds = Math.floor(time / 1000000)

      // Calculate progress based on total duration if available
      let progressPercent = 50 // Default fallback
      if (totalDurationRef.current > 0) {
        progressPercent = Math.min(99, Math.round((seconds / totalDurationRef.current) * 100))
      }

      setProgress(prev => ({
        ...prev,
        progress: progressPercent,
        message: `Encoding... ${seconds}s / ${totalDurationRef.current}s`
      }))
    })

    setProgress({
      phase: 'loading',
      progress: 10,
      message: 'Loading FFmpeg (25MB)...'
    })

    try {
      await ffmpeg.load()
      ffmpegRef.current = ffmpeg

      setProgress({
        phase: 'loading',
        progress: 100,
        message: 'FFmpeg loaded successfully'
      })

      return ffmpeg
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      setProgress({
        phase: 'error',
        progress: 0,
        message: `Failed to load FFmpeg: ${error}`
      })
      throw error
    }
  }, [])

  // Main export function
  const exportTimeline = useCallback(async (
    clips: Clip[],
    options: ExportOptions = {}
  ): Promise<Blob | null> => {
    if (clips.length === 0) {
      throw new Error('No clips to export')
    }

    abortRef.current = false
    setIsExporting(true)
    setProgress({
      phase: 'loading',
      progress: 0,
      message: 'Starting export...',
      totalClips: clips.length
    })

    // Calculate total duration for progress tracking
    totalDurationRef.current = clips.reduce((total, clip) => {
      const duration = frameToTime(clip.durationFrames)
      return total + duration
    }, 0)

    console.log(`[Export] Total duration: ${totalDurationRef.current}s`)

    try {
      // Step 1: Load FFmpeg
      const ffmpeg = await loadFFmpeg()
      if (abortRef.current) return null

      // Step 2: Download all clip files
      setProgress({
        phase: 'downloading',
        progress: 0,
        message: 'Downloading clips...',
        totalClips: clips.length
      })

      const clipFiles: string[] = []
      for (let i = 0; i < clips.length; i++) {
        if (abortRef.current) return null

        const clip = clips[i]
        setProgress(prev => ({
          ...prev,
          progress: Math.round((i / clips.length) * 100),
          message: `Downloading clip ${i + 1}/${clips.length}...`,
          currentClip: i + 1
        }))

        try {
          const fileName = `clip_${i}.mp4`
          const data = await fetchFile(clip.url)
          await ffmpeg.writeFile(fileName, data)
          clipFiles.push(fileName)
        } catch (error) {
          console.error(`Failed to download clip ${i}:`, error)
          throw new Error(`Failed to download clip ${i + 1}: ${error}`)
        }
      }

      if (abortRef.current) return null

      // Step 3: Create trimmed clips if needed
      setProgress({
        phase: 'processing',
        progress: 0,
        message: 'Processing clips...',
        totalClips: clips.length
      })

      const processedFiles: string[] = []
      for (let i = 0; i < clips.length; i++) {
        if (abortRef.current) return null

        const clip = clips[i]
        const inputFile = clipFiles[i]
        const outputFile = `trimmed_${i}.mp4`

        setProgress(prev => ({
          ...prev,
          progress: Math.round((i / clips.length) * 100),
          message: `Processing clip ${i + 1}/${clips.length}...`,
          currentClip: i + 1
        }))

        // Check if clip needs trimming
        const needsTrim =
          (clip.sourceInFrame && clip.sourceInFrame > 0) ||
          (clip.sourceOutFrame && clip.originalDurationFrames && clip.sourceOutFrame < clip.originalDurationFrames)

        // Always normalize to H.264 for concat compatibility
        // This handles mixed codecs (VP8 recordings + H.264 uploads)
        // IMPORTANT: Ensure all clips have audio (add silent if missing)
        if (needsTrim) {
          // Calculate trim times
          const startTime = frameToTime(clip.sourceInFrame ?? 0)
          const endTime = frameToTime(clip.sourceOutFrame ?? clip.originalDurationFrames ?? clip.durationFrames)
          const duration = endTime - startTime

          // Trim and convert to H.264
          // Use anullsrc filter to add silent audio if none exists
          await ffmpeg.exec([
            '-ss', startTime.toFixed(3),
            '-i', inputFile,
            '-t', duration.toFixed(3),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ar', '48000',
            '-ac', '2',
            '-af', 'apad',  // Pad audio if it ends early
            outputFile
          ])
        } else {
          // No trim, but still convert to H.264 for compatibility
          // Add silent audio track for clips without audio (like recordings)
          await ffmpeg.exec([
            '-i', inputFile,
            '-f', 'lavfi',
            '-t', frameToTime(clip.durationFrames).toFixed(3),
            '-i', 'anullsrc=r=48000:cl=stereo',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ar', '48000',
            '-ac', '2',
            '-shortest',
            outputFile
          ])
        }

        processedFiles.push(outputFile)
      }

      if (abortRef.current) return null

      // Step 4: Create concat file
      setProgress({
        phase: 'processing',
        progress: 50,
        message: 'Preparing timeline merge...'
      })

      const concatContent = processedFiles
        .map(file => `file '${file}'`)
        .join('\n')

      await ffmpeg.writeFile('concat.txt', concatContent)

      if (abortRef.current) return null

      // Step 5: Merge all clips
      setProgress({
        phase: 'encoding',
        progress: 0,
        message: 'Encoding final video...'
      })

      const {
        resolution = '1920x1080',
        fps = 30,
        bitrate = '5M',
        codec = 'libx264',
        preset = 'medium'
      } = options

      // Merge clips - need to re-encode to handle dynamic audio streams
      // (some clips have audio, some don't)
      console.log('[Export] Merging normalized clips with audio handling...')
      console.log('[Export] Concat file contents:', concatContent)

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c:v', 'copy',      // Copy video (already H.264)
        '-c:a', 'copy',      // Copy audio where it exists
        '-map', '0:v:0',     // Map first video stream
        '-map', '0:a?',      // Map audio if exists (optional)
        '-movflags', '+faststart',
        'output.mp4'
      ])
      console.log('[Export] Merge complete!')

      if (abortRef.current) return null

      // Step 6: Read output file
      setProgress({
        phase: 'complete',
        progress: 100,
        message: 'Export complete!'
      })

      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data], { type: 'video/mp4' })

      console.log('[Export] Output file size:', blob.size, 'bytes')
      console.log('[Export] Expected ~', clips.length, 'clips merged')

      // Check if output is valid (not empty)
      if (blob.size === 0) {
        throw new Error('Export produced empty file - clips may have incompatible codecs')
      }

      // Step 7: Cleanup
      try {
        await ffmpeg.deleteFile('concat.txt')
        await ffmpeg.deleteFile('output.mp4')
        for (const file of clipFiles) {
          await ffmpeg.deleteFile(file)
        }
        for (const file of processedFiles) {
          if (!clipFiles.includes(file)) {
            await ffmpeg.deleteFile(file)
          }
        }
      } catch (error) {
        console.warn('Cleanup error:', error)
      }

      setIsExporting(false)
      return blob

    } catch (error) {
      console.error('Export error:', error)
      setProgress({
        phase: 'error',
        progress: 0,
        message: `Export failed: ${error}`
      })
      setIsExporting(false)
      throw error
    }
  }, [loadFFmpeg])

  // Cancel export
  const cancelExport = useCallback(() => {
    abortRef.current = true
    setIsExporting(false)
    setProgress({
      phase: 'error',
      progress: 0,
      message: 'Export cancelled'
    })
  }, [])

  return {
    exportTimeline,
    cancelExport,
    isExporting,
    progress
  }
}
