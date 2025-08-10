import { NextRequest, NextResponse } from 'next/server'
// YouTube transcript package removed - using mock data for now

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    console.log('API: Fetching transcript for video ID:', videoId)

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Mock transcript data for now (YouTube package not working)
    console.log('API: Returning mock transcript data')
    const transcript: any[] = []
    
    // Format the transcript for our needs
    const formattedTranscript = transcript.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert milliseconds to seconds
      duration: item.duration / 1000,
      end: (item.offset + item.duration) / 1000
    }))

    return NextResponse.json({
      success: true,
      transcript: formattedTranscript,
      videoId
    })

  } catch (error) {
    console.error('API Error fetching YouTube transcript:', error)
    
    // Check if it's a specific error type
    if (error instanceof Error) {
      console.log('Error message:', error.message)
      
      if (error.message.includes('Transcript is disabled') || 
          error.message.includes('Could not find') ||
          error.message.includes('No captions')) {
        return NextResponse.json(
          { 
            error: 'Transcript is not available for this video. The video may not have captions enabled.',
            success: false,
            transcript: [] 
          },
          { status: 200 } // Return 200 so the app doesn't crash
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch transcript. Please try again later.',
        success: false,
        transcript: []
      },
      { status: 200 }
    )
  }
}