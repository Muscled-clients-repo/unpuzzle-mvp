"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TranscriptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  videoTitle: string
  onUploadComplete?: () => void
}

export function TranscriptUploadModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
  onUploadComplete
}: TranscriptUploadModalProps) {
  const [uploadMethod, setUploadMethod] = useState<'segments' | 'text'>('segments')
  const [transcriptText, setTranscriptText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress('Reading file...')

    try {
      // Read file content
      const fileContent = await file.text()
      let transcriptText = ''
      let filePath = ''

      // Handle different file types based on upload method
      if (uploadMethod === 'segments' && file.name.endsWith('.json')) {
        setUploadProgress('Parsing JSON segments...')
        try {
          const jsonData = JSON.parse(fileContent)

          let segments: any[] = []

          // Handle Whisper format (transcription array)
          if (jsonData.transcription && Array.isArray(jsonData.transcription)) {
            segments = jsonData.transcription.map((item: any) => ({
              start: item.offsets.from / 1000, // Convert milliseconds to seconds
              end: item.offsets.to / 1000,     // Convert milliseconds to seconds
              text: item.text.trim()
            }))
          }
          // Handle simple segments format
          else if (jsonData.segments && Array.isArray(jsonData.segments)) {
            segments = jsonData.segments
          }
          // Handle direct array format
          else if (Array.isArray(jsonData)) {
            segments = jsonData
          }
          else {
            throw new Error('JSON file must contain "transcription" array (Whisper format) or "segments" array')
          }

          // Validate segment structure
          const validSegments = segments.every((s: any) =>
            typeof s.start === 'number' &&
            typeof s.end === 'number' &&
            typeof s.text === 'string'
          )

          if (!validSegments) {
            throw new Error('Invalid segment format. Each segment must have start, end, and text fields.')
          }

          if (segments.length === 0) {
            throw new Error('No valid segments found in file')
          }

          // Extract text for fallback
          transcriptText = segments.map((s: any) => s.text).join(' ')
          filePath = file.name
        } catch (error) {
          console.error('Error parsing JSON segments:', error)
          throw new Error(`Invalid JSON format: ${error.message}`)
        }
      } else if (uploadMethod === 'text' && file.name.endsWith('.txt')) {
        // Plain text for course_chapter_media.transcript_text
        transcriptText = fileContent
      } else {
        throw new Error(`Invalid file type for ${uploadMethod} mode. ${uploadMethod === 'segments' ? 'Use .json files for segments' : 'Use .txt files for plain text'}.`)
      }

      if (!transcriptText.trim()) {
        throw new Error('No transcript text found in file')
      }

      setUploadProgress('Saving transcript...')

      // Upload transcript via API with proper column mapping
      let requestBody: any = {
        text: transcriptText.trim()
      }

      // For segments upload, include parsed segments and file path
      if (uploadMethod === 'segments' && filePath) {
        const jsonData = JSON.parse(fileContent)
        let segments: any[] = []

        // Re-parse segments for API request
        if (jsonData.transcription && Array.isArray(jsonData.transcription)) {
          segments = jsonData.transcription.map((item: any) => ({
            start: item.offsets.from / 1000, // Convert milliseconds to seconds
            end: item.offsets.to / 1000,     // Convert milliseconds to seconds
            text: item.text.trim()
          }))
        } else if (jsonData.segments && Array.isArray(jsonData.segments)) {
          segments = jsonData.segments
        } else if (Array.isArray(jsonData)) {
          segments = jsonData
        }

        requestBody.segments = segments
        requestBody.filePath = filePath
      }

      const response = await fetch(`/api/transcription/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload transcript')
      }

      setUploadProgress('Upload complete!')
      toast.success('Transcript uploaded successfully')

      // Reset form
      setTranscriptText('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Callback and close
      onUploadComplete?.()
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Transcript upload error:', error)
      toast.error(`Failed to upload transcript: ${error.message}`)
      setUploadProgress('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleTextUpload = async () => {
    if (!transcriptText.trim()) {
      toast.error('Please enter transcript text')
      return
    }

    setIsUploading(true)
    setUploadProgress('Saving transcript...')

    try {
      const response = await fetch(`/api/transcription/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcriptText.trim()
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save transcript')
      }

      setUploadProgress('Saved successfully!')
      toast.success('Transcript saved successfully')

      // Reset and close
      setTranscriptText('')
      onUploadComplete?.()
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Transcript save error:', error)
      toast.error(`Failed to save transcript: ${error.message}`)
      setUploadProgress('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Transcript for "{videoTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Method Selector */}
          <div className="flex gap-2">
            <Button
              variant={uploadMethod === 'segments' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMethod('segments')}
              disabled={isUploading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Segmented (.json)
            </Button>
            <Button
              variant={uploadMethod === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMethod('text')}
              disabled={isUploading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Plain Text
            </Button>
          </div>

          {/* Segments Upload */}
          {uploadMethod === 'segments' && (
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isUploading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">Drop JSON segments file here</p>
                      <p className="text-sm text-muted-foreground">
                        Supports Whisper format or simple segments: {"{\"transcription\": [...]} or {\"segments\": [{\"start\": 0, \"end\": 5, \"text\": \"...\"}]}"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={uploadMethod === 'segments' ? '.json' : '.txt'}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Plain Text Input */}
          {uploadMethod === 'text' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="transcript-text">Plain Text Transcript</Label>
                <Textarea
                  id="transcript-text"
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste your plain text transcript here (no timestamps)..."
                  className="min-h-[200px] resize-none"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be stored as plain text without time segments.
                </p>
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          {uploadMethod === 'text' && (
            <Button
              onClick={handleTextUpload}
              disabled={isUploading || !transcriptText.trim()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Save Transcript
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}