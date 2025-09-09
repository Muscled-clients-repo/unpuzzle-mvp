"use client"

import { useState } from "react"
import { useMediaFileHistory } from "@/hooks/use-media-queries"
import { SimpleModal } from "./SimpleModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileVideo,
  Image,
  File,
  Calendar,
  HardDrive,
  Eye,
  Copy,
  ExternalLink,
  Clock,
  User,
  Tag
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FileDetailsModalProps {
  file: any | null
  isOpen: boolean
  onClose: () => void
}

export function FileDetailsModal({ file, isOpen, onClose }: FileDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { data: historyData, isLoading: historyLoading } = useMediaFileHistory(file?.id || null)

  if (!file) return null

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="h-5 w-5" />
      case 'image': return <Image className="h-5 w-5" />
      default: return <File className="h-5 w-5" />
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    copyable = false,
    link = false 
  }: { 
    icon: any, 
    label: string, 
    value: string, 
    copyable?: boolean,
    link?: boolean 
  }) => (
    <div className="flex items-start justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-1">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">{label}:</span>
        <span className={cn("truncate", link && "text-primary underline cursor-pointer")}
              onClick={link ? () => window.open(value, '_blank') : undefined}>
          {value}
        </span>
      </div>
      {copyable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-2 flex-shrink-0"
          onClick={() => copyToClipboard(value, label)}
        >
          <Copy className={cn(
            "h-3 w-3", 
            copiedField === label ? "text-green-500" : "text-muted-foreground"
          )} />
        </Button>
      )}
    </div>
  )

  // Get file history from the hook
  const fileHistory = historyData?.history || []

  return (
    <SimpleModal 
      isOpen={isOpen} 
      onClose={onClose}
      title="File Details"
    >
      <div className="p-6 space-y-6">
        {/* File Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{file.name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{file.type}</Badge>
                <Badge variant={file.usage === 'Unused' ? 'secondary' : 'outline'}>
                  {file.usage}
                </Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>

            <Separator />

            {/* File Properties */}
            <div>
              <h4 className="font-medium mb-3">Properties</h4>
              <div className="space-y-1">
                <InfoRow 
                  icon={HardDrive} 
                  label="Size" 
                  value={file.size || formatFileSize(file.file_size || 0)} 
                />
                <InfoRow 
                  icon={Calendar} 
                  label="Created" 
                  value={file.uploadedAt || new Date(file.created_at).toLocaleDateString()} 
                />
                <InfoRow 
                  icon={User} 
                  label="Uploaded by" 
                  value="You" 
                />
                {file.mime_type && (
                  <InfoRow 
                    icon={Tag} 
                    label="MIME Type" 
                    value={file.mime_type} 
                  />
                )}
                {file.duration_seconds && (
                  <InfoRow 
                    icon={Clock} 
                    label="Duration" 
                    value={formatDuration(file.duration_seconds)} 
                  />
                )}
                <InfoRow 
                  icon={Eye} 
                  label="Usage Count" 
                  value={file.usage_count?.toString() || '0'} 
                />
              </div>
            </div>

            <Separator />

            {/* File History */}
            <div>
              <h4 className="font-medium mb-3">History</h4>
              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
                </div>
              ) : fileHistory.length > 0 ? (
                <div className="space-y-3">
                  {fileHistory.map((entry, index) => (
                    <div key={entry.id || index} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium capitalize">{entry.action}</div>
                        <div className="text-muted-foreground">{entry.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.timestamp).toLocaleString()} • {entry.user}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No history available</p>
                </div>
              )}
            </div>
      </div>
      
      <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </SimpleModal>
  )
}