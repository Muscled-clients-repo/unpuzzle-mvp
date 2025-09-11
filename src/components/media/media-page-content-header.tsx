import { Badge } from "@/components/ui/badge"
import { PageContentHeader } from "@/components/layout"

interface MediaPageContentHeaderProps {
  fileCount: number
}

/**
 * Header section for the media library page
 * Extracts the title, description, and file count badge
 */
export function MediaPageContentHeader({ 
  fileCount
}: MediaPageContentHeaderProps) {
  return (
    <PageContentHeader
      title="Media Library"
      description="Manage and organize your course content"
    >
      <Badge variant="secondary">
        {fileCount} files
      </Badge>
    </PageContentHeader>
  )
}