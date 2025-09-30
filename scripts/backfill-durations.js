/**
 * Backfill Duration Script
 *
 * Finds all uploaded videos without duration_seconds and creates duration jobs
 * for the worker to process them automatically.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
// Using built-in fetch (Node.js 18+)

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBSOCKET_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8080'
const BATCH_SIZE = 5 // Process 5 videos at a time
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds between batches

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function findVideosWithoutDuration() {
  console.log('🔍 Finding videos without duration...')

  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, original_name, backblaze_url, cdn_url, file_type, created_at')
    .eq('file_type', 'video')
    .is('duration_seconds', null)
    .not('backblaze_url', 'is', null) // Must have a URL to process
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch videos: ${error.message}`)
  }

  return videos || []
}

async function createDurationJob(video) {
  const jobData = {
    type: 'create-duration-job',
    operationId: `backfill_duration_${video.id}_${Date.now()}`,
    data: {
      jobType: 'duration',
      videoId: video.id,
      videoUrl: video.backblaze_url || video.cdn_url,
      fileName: video.original_name || video.name,
      userId: 'system-backfill', // System-initiated job
      priority: 'low' // Lower priority than new uploads
    }
  }

  console.log(`📤 Creating duration job for: ${video.name}`)

  try {
    const response = await fetch(`${WEBSOCKET_URL}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData)
    })

    if (!response.ok) {
      throw new Error(`WebSocket API returned ${response.status}: ${response.statusText}`)
    }

    console.log(`✅ Job created for: ${video.name}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to create job for ${video.name}:`, error.message)
    return false
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processBatch(videos, batchIndex) {
  console.log(`\n🔄 Processing batch ${batchIndex + 1} (${videos.length} videos)`)

  const results = await Promise.allSettled(
    videos.map(video => createDurationJob(video))
  )

  const successful = results.filter(result =>
    result.status === 'fulfilled' && result.value === true
  ).length

  const failed = results.length - successful

  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ❌ Failed: ${failed}`)

  return { successful, failed }
}

async function main() {
  try {
    console.log('🚀 Starting duration backfill process...')
    console.log(`📡 WebSocket URL: ${WEBSOCKET_URL}`)
    console.log(`📦 Batch size: ${BATCH_SIZE}`)
    console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)

    // Find videos without duration
    const videos = await findVideosWithoutDuration()

    if (videos.length === 0) {
      console.log('🎉 No videos found without duration. All good!')
      return
    }

    console.log(`📹 Found ${videos.length} videos without duration`)

    // Process in batches
    const batches = []
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      batches.push(videos.slice(i, i + BATCH_SIZE))
    }

    console.log(`📦 Will process ${batches.length} batches`)

    let totalSuccessful = 0
    let totalFailed = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const results = await processBatch(batch, i)

      totalSuccessful += results.successful
      totalFailed += results.failed

      // Delay between batches to avoid overwhelming the worker
      if (i < batches.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    console.log('\n🏁 Backfill process complete!')
    console.log(`✅ Total successful jobs: ${totalSuccessful}`)
    console.log(`❌ Total failed jobs: ${totalFailed}`)
    console.log(`📊 Success rate: ${Math.round((totalSuccessful / videos.length) * 100)}%`)

    if (totalSuccessful > 0) {
      console.log('\n💡 Jobs have been queued for the duration worker.')
      console.log('   Monitor progress with: pm2 logs unpuzzle-duration-worker')
      console.log('   Check database for updated duration_seconds values.')
    }

  } catch (error) {
    console.error('💥 Backfill process failed:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Backfill process interrupted by user')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Backfill process terminated')
  process.exit(0)
})

// Run the script
if (require.main === module) {
  main()
}