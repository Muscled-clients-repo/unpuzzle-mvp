import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaFileAction } from '@/app/actions/media-actions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await uploadMediaFileAction(formData)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileId: result.fileId
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}