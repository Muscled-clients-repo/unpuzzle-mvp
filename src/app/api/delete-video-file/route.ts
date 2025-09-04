import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'

export async function DELETE(request: NextRequest) {
  try {
    console.log('[API] Delete video file called')
    
    // Get parameters from URL
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const filename = searchParams.get('filename')
    
    console.log('[API] Delete params:', { fileId, filename })
    
    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Both fileId and filename are required' },
        { status: 400 }
      )
    }
    
    console.log('[API] Attempting to delete from Backblaze')
    
    // Delete from Backblaze (server-side only)
    try {
      await backblazeService.deleteVideo(fileId, filename)
      console.log('[API] Successfully deleted from Backblaze')
      
      return NextResponse.json({
        success: true,
        message: 'File deleted from Backblaze successfully',
        fileId,
        filename
      })
    } catch (bbError) {
      console.error('[API] Backblaze deletion failed:', bbError)
      
      // Return success anyway since DB deletion already happened
      // Backblaze file can be cleaned up manually if needed
      return NextResponse.json({
        success: true,
        message: 'Database record deleted. Backblaze deletion failed but can be cleaned manually.',
        error: bbError instanceof Error ? bbError.message : 'Unknown error'
      })
    }
    
  } catch (error) {
    console.error('[API] Delete route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}