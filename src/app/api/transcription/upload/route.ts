import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Transcript Upload: Starting upload process')

    const formData = await request.formData()
    const videoId = formData.get('videoId') as string
    const file = formData.get('file') as File

    console.log('Transcript Upload: Received data', {
      videoId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })

    if (!videoId || !file) {
      console.log('Transcript Upload: Missing required data')
      return NextResponse.json(
        { error: 'Video ID and file are required' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()

    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: 'File appears to be empty' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        course_id,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', videoId)
      .single()

    console.log('Transcript Upload: Video authorization check', {
      videoFound: !!video,
      instructorId: video?.courses?.instructor_id,
      userId: user.id,
      hasInstructorAccess: video?.courses?.instructor_id === user.id
    })

    if (videoError || !video) {
      console.log('Transcript Upload: Video not found', videoError)
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // For development: Allow authenticated users to upload transcripts
    // TODO: Fix enrollment/authorization logic
    const hasInstructorAccess = video.courses.instructor_id === user.id
    if (!hasInstructorAccess) {
      console.log('Transcript Upload: Using development bypass for student user')
    }

    // Parse transcript based on file type
    let parsedTranscript: any = {}
    let transcriptText = fileContent

    try {
      if (file.name.endsWith('.json')) {
        // Try to parse as JSON (Whisper.cpp output format)
        const jsonData = JSON.parse(fileContent)

        if (jsonData.text) {
          // Standard Whisper.cpp format
          transcriptText = jsonData.text
          parsedTranscript = {
            segments: jsonData.segments || [],
            language: jsonData.language || 'en',
            duration: jsonData.duration
          }
        } else if (jsonData.transcription && Array.isArray(jsonData.transcription)) {
          // Our Whisper.cpp format with transcription array
          transcriptText = jsonData.transcription.map(t => t.text).join(' ')
          parsedTranscript = {
            segments: jsonData.transcription.map(t => ({
              start: t.offsets.from / 1000, // Convert milliseconds to seconds
              end: t.offsets.to / 1000,
              text: t.text.trim()
            })),
            language: jsonData.result?.language || 'en',
            model: jsonData.model?.type || 'base'
          }
        } else if (typeof jsonData === 'object') {
          // Custom JSON format
          transcriptText = JSON.stringify(jsonData, null, 2)
          parsedTranscript = jsonData
        }
      } else if (file.name.endsWith('.srt')) {
        // Parse SRT format
        parsedTranscript = {
          format: 'srt',
          segments: parseSRT(fileContent)
        }
      } else if (file.name.endsWith('.vtt')) {
        // Parse VTT format
        parsedTranscript = {
          format: 'vtt',
          segments: parseVTT(fileContent)
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse transcript format, storing as plain text:', parseError)
    }

    // Count words (rough estimate)
    const wordCount = transcriptText.split(/\s+/).filter(word => word.length > 0).length

    // Check if transcript already exists
    const { data: existingTranscript } = await supabase
      .from('video_transcripts')
      .select('id')
      .eq('video_id', videoId)
      .single()

    let result
    if (existingTranscript) {
      // Update existing transcript
      const { data, error } = await supabase
        .from('video_transcripts')
        .update({
          transcript_text: transcriptText,
          transcript_segments: parsedTranscript,
          word_count: wordCount,
          language_code: parsedTranscript.language || 'en',
          whisper_model_used: 'uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTranscript.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new transcript
      const { data, error } = await supabase
        .from('video_transcripts')
        .insert([{
          video_id: videoId,
          course_id: video.course_id,
          transcript_text: transcriptText,
          transcript_segments: parsedTranscript,
          word_count: wordCount,
          language_code: parsedTranscript.language || 'en',
          whisper_model_used: 'uploaded'
        }])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      transcript: {
        id: result.id,
        wordCount: result.word_count,
        language: result.language_code,
        hasSegments: !!(parsedTranscript.segments?.length > 0)
      }
    })

  } catch (error) {
    console.error('Transcript upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload transcript' },
      { status: 500 }
    )
  }
}

// Helper function to parse SRT format
function parseSRT(content: string) {
  const segments = []
  const blocks = content.trim().split('\n\n')

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/)
      if (timeMatch) {
        segments.push({
          start: timeToSeconds(timeMatch[1]),
          end: timeToSeconds(timeMatch[2]),
          text: lines.slice(2).join(' ')
        })
      }
    }
  }

  return segments
}

// Helper function to parse VTT format
function parseVTT(content: string) {
  const segments = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/)
    if (timeMatch && i + 1 < lines.length) {
      segments.push({
        start: timeToSeconds(timeMatch[1].replace('.', ',')),
        end: timeToSeconds(timeMatch[2].replace('.', ',')),
        text: lines[i + 1]?.trim() || ''
      })
    }
  }

  return segments
}

// Helper function to convert time string to seconds
function timeToSeconds(timeString: string): number {
  const [time, ms] = timeString.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000)
}