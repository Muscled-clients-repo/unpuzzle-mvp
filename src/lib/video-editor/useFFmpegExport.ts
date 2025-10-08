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

        if (needsTrim) {
          // Calculate trim times
          const startTime = frameToTime(clip.sourceInFrame ?? 0)
          const endTime = frameToTime(clip.sourceOutFrame ?? clip.originalDurationFrames ?? clip.durationFrames)
          const duration = endTime - startTime

          // Fast trim with copy (no re-encoding)
          await ffmpeg.exec([
            '-ss', startTime.toFixed(3),
            '-i', inputFile,
            '-t', duration.toFixed(3),
            '-c', 'copy',  // Copy codec - fast!
            '-avoid_negative_ts', 'make_zero',
            outputFile
          ])

          processedFiles.push(outputFile)
        } else {
          // No trim needed, use original file directly
          processedFiles.push(inputFile)
        }
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

      // Try fast concat first (copy codec)
      try {
        await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',  // Fast copy - no re-encoding!
          '-movflags', '+faststart',
          'output.mp4'
        ])
      } catch (error) {
        // If copy fails (incompatible codecs), re-encode with quality settings
        console.log('[Export] Fast copy failed, re-encoding with quality settings...')
        await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c:v', codec,
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-preset', preset,
          '-b:v', bitrate,
          '-maxrate', bitrate,
          '-bufsize', `${parseInt(bitrate) * 2}M`,
          '-r', fps.toString(),
          '-s', resolution,
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-ar', '48000',
          '-ac', '2',
          '-movflags', '+faststart',
          'output.mp4'
        ])
      }

      if (abortRef.current) return null

      // Step 6: Read output file
      setProgress({
        phase: 'complete',
        progress: 100,
        message: 'Export complete!'
      })

      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data], { type: 'video/mp4' })

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
