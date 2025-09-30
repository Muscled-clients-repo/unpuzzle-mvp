# Fixed Video Duration Extraction with CDN HMAC Tokens

## Issue
Database duration column was null for all video files, preventing duration display on /media page.

## Root Cause
1. PM2 workers weren't loading environment variables properly
2. WebSocket server wasn't filtering jobs by type (duration vs transcription)
3. CDN URLs were using incorrect HMAC token generation (token-path mismatch)
4. Tokens were generated for raw filenames instead of URL-encoded paths

## Changes Made

### Core System Files Modified

#### 1. ecosystem.config.js
- Added `require('dotenv').config({ path: '.env.local' })` to load environment variables
- Changed environment variables from string values to `process.env` references
- This fixed "supabaseUrl is required" errors in PM2 workers

#### 2. websocket-server.js
- Added job type filtering with `getNextJobForWorkerType()` function
- Implemented duration job creation handler
- Prevents transcription workers from picking up duration jobs

#### 3. workers/duration/duration-worker.js
- Added check for private URL format
- Updated to handle CDN URLs with HMAC tokens
- Improved error handling for FFprobe failures

### Scripts Created

#### 4. scripts/update-cdn-urls-with-tokens.js
- Generates HMAC tokens for CDN authentication
- **Critical fix**: Tokens generated for URL-encoded paths
- Updates media_files table with proper CDN URLs

#### 5. scripts/process-all-durations.js
- Comprehensive script to update all videos with fresh tokens
- Queues videos for duration extraction via WebSocket
- Handles batch processing with rate limiting

#### 6. scripts/backfill-durations.js
- Finds videos without duration
- Creates duration jobs in batches
- Provides progress tracking

### Frontend Updates

#### 7. src/app/student/page.tsx
- Fixed "Cannot read properties of undefined" error
- Changed from `enrolledCourses` to `coursesWithActiveGoals`
- Added null safety checks

### Supporting Files

#### 8. src/lib/format-utils.ts
- Created utility functions for formatting durations
- Handles conversion between seconds and display format

#### 9. logs/patterns/23-cdn-hmac-authentication-pattern.md
- Documented the CDN HMAC authentication pattern
- Explains token generation, validation, and consumption
- Details who can generate tokens (backend/workers only)

### Test/Debug Scripts Created
- test-cdn-token.js - Tests CDN token generation and access
- check-durations.js - Monitors duration extraction progress
- queue-single-video.js - Queues individual videos for testing

## Key Technical Fix

### HMAC Token Generation Must Match Encoded Path
```
File: "2025-08-31 13-06-56.mp4"
Browser requests: "/2025-08-31%2013-06-56.mp4"
Token MUST be for: "/2025-08-31%2013-06-56.mp4" (encoded)
NOT for: "/2025-08-31 13-06-56.mp4" (raw)
```

## Results
- ✅ 44 out of 62 videos successfully processed with durations
- ✅ Duration extraction working with FFprobe
- ✅ Database duration_seconds column populated
- ✅ Durations now visible on /media page
- ✅ Student dashboard error fixed

## Architecture Insights
- Backend/Workers: Generate HMAC tokens (have secret key)
- Cloudflare: Validates tokens (recreates signature)
- Frontend: Consumes pre-generated URLs (no secret key)
- Database: Stores CDN URLs with tokens

## Status
All critical issues resolved. Duration worker continues processing remaining videos in background.