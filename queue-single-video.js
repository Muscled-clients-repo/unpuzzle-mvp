// Queue a single video for duration processing
require('dotenv').config({ path: '.env.local' })

const videoId = '56907301-1b42-434a-9b91-60df1409529d' // The video ID from console log

async function queueSingleVideo() {
  console.log('🎬 Queuing single video for duration extraction...')

  try {
    // Send to WebSocket server's broadcast endpoint which will create the job
    const response = await fetch('http://localhost:8080/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'create-duration-job',
        operationId: `duration_${videoId}_${Date.now()}`,
        data: {
          jobType: 'duration',
          videoId: videoId,
          fileName: 'test-video.mp4',
          userId: 'test-user'
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Video queued successfully:', result)
      console.log('📡 Check the duration worker logs to see it processing')
    } else {
      console.log('❌ Failed to queue video:', response.status, await response.text())
    }
  } catch (error) {
    console.error('❌ Error queuing video:', error)
  }
}

queueSingleVideo()