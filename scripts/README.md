# Scripts Directory

## Duration Backfill Script

### Purpose
Extracts duration for all existing videos that were uploaded before the duration worker was running.

### What it does:
1. **Finds** all videos in `media_files` table where `duration_seconds` is NULL
2. **Creates duration jobs** for each video via WebSocket API
3. **Processes in batches** to avoid overwhelming the worker
4. **Lets existing duration worker** handle the ffprobe extraction

### Usage

**Prerequisites:**
- Duration worker must be running (`pm2 status` shows `unpuzzle-duration-worker` online)
- WebSocket server must be running (separate terminal or PM2)
- Environment variables must be set

**Run the script:**
```bash
# From project root
node scripts/backfill-durations.js
```

**Environment variables needed:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WEBSOCKET_SERVER_URL=http://localhost:8080  # Optional, defaults to localhost:8080
```

### Sample Output
```
🚀 Starting duration backfill process...
🔍 Finding videos without duration...
📹 Found 15 videos without duration
📦 Will process 3 batches

🔄 Processing batch 1 (5 videos)
📤 Creating duration job for: intro-video.mp4
✅ Job created for: intro-video.mp4
...

🏁 Backfill process complete!
✅ Total successful jobs: 15
❌ Total failed jobs: 0
📊 Success rate: 100%

💡 Jobs have been queued for the duration worker.
   Monitor progress with: pm2 logs unpuzzle-duration-worker
```

### Monitoring Progress

**Watch worker logs:**
```bash
pm2 logs unpuzzle-duration-worker
```

**Check database for updated durations:**
```sql
SELECT id, name, duration_seconds, updated_at
FROM media_files
WHERE file_type = 'video'
AND duration_seconds IS NOT NULL
ORDER BY updated_at DESC;
```

### Configuration
- **BATCH_SIZE**: 5 videos per batch (adjustable)
- **DELAY_BETWEEN_BATCHES**: 2 seconds between batches (adjustable)
- **Priority**: Jobs marked as 'low' priority (won't interfere with new uploads)