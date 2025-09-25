'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DailyNoteImage } from './DailyNoteImage'

interface ImageFile {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  cdn_url?: string
  storage_path: string
  message_text?: string | null
}

interface DailyEntry {
  day: number
  date: string
  studentNote?: string
  attachedFiles?: ImageFile[]
}

interface DailyNoteImageViewerProps {
  isOpen: boolean
  onClose: () => void
  initialImageIndex: number
  dailyEntry: DailyEntry
}

export function DailyNoteImageViewer({ 
  isOpen, 
  onClose, 
  initialImageIndex, 
  dailyEntry 
}: DailyNoteImageViewerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex)
  
  console.log('🖼️ DailyNoteImageViewer rendered:', { isOpen, initialImageIndex, dailyEntry })

  // Filter only image files
  const imageFiles = dailyEntry.attachedFiles?.filter(file => 
    file.mime_type.startsWith('image/')
  ) || []

  // Reset current index when initialImageIndex changes
  useEffect(() => {
    setCurrentImageIndex(initialImageIndex)
  }, [initialImageIndex])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [isOpen])

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : imageFiles.length - 1
    )
  }

  const goToNext = () => {
    setCurrentImageIndex((prev) => 
      prev < imageFiles.length - 1 ? prev + 1 : 0
    )
  }

  if (!isOpen || imageFiles.length === 0) return null

  const currentImage = imageFiles[currentImageIndex]
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024
    return mb > 1 ? `${mb.toFixed(1)}MB` : `${(bytes / 1024).toFixed(0)}KB`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="w-5 h-5 text-blue-500" />
            {formatDate(dailyEntry.date)} - Day {dailyEntry.day}
            {imageFiles.length > 1 && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({currentImageIndex + 1} of {imageFiles.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-100px)]">
          {/* Image Section */}
          <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <DailyNoteImage
              attachmentId={currentImage?.id || ''}
              originalFilename={currentImage?.original_filename || ''}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Navigation Arrows */}
            {imageFiles.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/30 text-white rounded-full w-10 h-10 p-0"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/30 text-white rounded-full w-10 h-10 p-0"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full w-8 h-8 p-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Info Section */}
          <div className="w-full lg:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Specific Message for this Image */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-1">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Message with this Image
              </h3>
              {currentImage?.message_text ? (
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-line text-sm leading-relaxed">
                  • {currentImage.message_text}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                  No specific message recorded for this image
                </div>
              )}
            </div>


            {/* Thumbnail Navigation */}
            {imageFiles.length > 1 && (
              <div className="p-4">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  All Images ({imageFiles.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {imageFiles.map((file, index) => (
                    <button
                      key={file.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <DailyNoteImage
                        attachmentId={file.id}
                        originalFilename={file.original_filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}