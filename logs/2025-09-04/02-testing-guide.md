# API Security Testing Guide

## Prerequisites

1. **Start the development server**
```bash
npm run dev
```

2. **Create test accounts**
   - Create an instructor account via `/signup`
   - Create a student account via `/signup` 
   - Promote one user to instructor role in Supabase dashboard

3. **Test files needed**
```bash
# Create test files in your project root
echo "fake video content" > test-video.mp4
echo "not a video" > test-file.txt
dd if=/dev/zero of=large-video.mp4 bs=1M count=150  # 150MB file
```

## Testing Methods

### Method 1: Using cURL Commands

#### Test 1: Unauthenticated Upload (Should Fail with 401)
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-video.mp4" \
  -F "courseId=some-course-id" \
  -F "chapterId=some-chapter-id" \
  -F "videoId=test-video-1" \
  -F "videoName=Test Video" \
  -v
```
**Expected**: `401 Unauthorized`

#### Test 2: Unauthenticated Delete (Should Fail with 401)
```bash
curl -X DELETE "http://localhost:3000/api/delete-video?videoId=some-video-id" -v
```
**Expected**: `401 Unauthorized`

### Method 2: Using Browser Dev Tools

#### Test 3: Get Authentication Token
1. Login to your app as an instructor
2. Open browser dev tools (F12)
3. Go to Console tab
4. Run:
```javascript
// Get the session token
const session = await (await fetch('/api/auth/session')).json()
console.log('Token:', session.access_token)
```

#### Test 4: Authenticated Upload with Wrong Role
1. Login as a student (not instructor)
2. Try to access instructor pages - should redirect
3. Use student token to call upload API - should fail with 403

### Method 3: Using Postman/Thunder Client

#### Test 5: Rate Limit Testing
Set up this request in Postman:
```
POST http://localhost:3000/api/upload
Headers: 
  Authorization: Bearer YOUR_TOKEN_HERE
Body (form-data):
  file: test-video.mp4
  courseId: your-course-id
  chapterId: your-chapter-id  
  videoId: test-{{$randomUUID}}
  videoName: Rate Limit Test
```

Run this request 11 times quickly - the 11th should return `429 Too Many Requests`

## Manual Testing Checklist

### ✅ Authentication Tests
- [ ] Upload without token returns 401
- [ ] Delete without token returns 401  
- [ ] Student token on instructor routes returns 403
- [ ] Valid instructor token works

### ✅ File Validation Tests
- [ ] Upload .txt file returns 400 (invalid type)
- [ ] Upload 150MB file returns 400 (too large)
- [ ] Upload valid .mp4 file works
- [ ] Missing required fields returns 400

### ✅ Authorization Tests  
- [ ] Upload to other instructor's course returns 403
- [ ] Delete other instructor's video returns 403
- [ ] Access own resources works

### ✅ Rate Limiting Tests
- [ ] 11th upload in 1 hour returns 429
- [ ] 51st delete in 1 hour returns 429
- [ ] Rate limit headers present in response

## Advanced Testing Scripts

### Automated Security Test Script
Create `test-security.js`:
```javascript
const fs = require('fs')

async function testSecurity() {
  const baseUrl = 'http://localhost:3000'
  
  // Test 1: Unauthenticated upload
  console.log('Testing unauthenticated upload...')
  const response1 = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: new FormData() // Empty form
  })
  console.log(`Status: ${response1.status} (expected: 401)`)
  
  // Test 2: Invalid file type (if you have auth token)
  // Add your token here
  const token = 'your-auth-token-here'
  
  if (token !== 'your-auth-token-here') {
    console.log('Testing invalid file type...')
    const formData = new FormData()
    formData.append('file', new Blob(['fake'], { type: 'text/plain' }), 'test.txt')
    formData.append('courseId', 'test')
    formData.append('chapterId', 'test')
    formData.append('videoId', 'test')
    
    const response2 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    console.log(`Status: ${response2.status} (expected: 400)`)
    const data = await response2.json()
    console.log('Response:', data)
  }
}

testSecurity()
```

Run with: `node test-security.js`

### Rate Limit Test Script
Create `test-rate-limit.js`:
```javascript
async function testRateLimit() {
  const token = 'your-instructor-token-here'
  
  if (token === 'your-instructor-token-here') {
    console.log('Please add your instructor token to test rate limiting')
    return
  }
  
  console.log('Testing rate limit (10 uploads max per hour)...')
  
  for (let i = 1; i <= 12; i++) {
    const formData = new FormData()
    formData.append('file', new Blob(['fake video'], { type: 'video/mp4' }), 'test.mp4')
    formData.append('courseId', 'your-course-id')
    formData.append('chapterId', 'your-chapter-id')
    formData.append('videoId', `test-${i}`)
    formData.append('videoName', `Test Video ${i}`)
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    
    console.log(`Request ${i}: Status ${response.status}`)
    
    if (response.status === 429) {
      console.log('Rate limit hit! ✅')
      const data = await response.json()
      console.log('Rate limit response:', data)
      break
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

testRateLimit()
```

## Browser Testing

### Test Upload Security via Browser
1. Go to your instructor dashboard
2. Open browser dev tools
3. Try uploading a video normally - should work
4. In console, try this:
```javascript
// Test uploading to someone else's course
const formData = new FormData()
formData.append('file', new Blob(['fake'], { type: 'video/mp4' }), 'hack.mp4')
formData.append('courseId', 'someone-elses-course-id') // Different course
formData.append('chapterId', 'test')
formData.append('videoId', 'hack-video')

fetch('/api/upload', {
  method: 'POST',
  body: formData
}).then(r => r.json()).then(console.log)
```
**Expected**: 403 Forbidden

## Database Verification

### Check Security in Supabase
1. Go to Supabase dashboard
2. Check `videos` table - should only see your own videos
3. Try querying other instructor's videos:
```sql
SELECT * FROM videos WHERE course_id = 'other-instructor-course'
```
**Expected**: No results (RLS blocks access)

## Production Testing

### Test with Real Authentication
1. Deploy to staging environment
2. Test with actual user accounts
3. Verify rate limits work across server restarts
4. Check logs for security events

## Error Response Examples

### Expected Security Error Responses

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied. You can only upload videos to your own courses."
}
```

**429 Rate Limited:**
```json
{
  "error": "Rate limit exceeded. Too many upload requests.",
  "resetTime": 1642248000000
}
```

**400 Validation Error:**
```json
{
  "error": "Invalid file type. Allowed types: video/mp4, video/webm, video/ogg, video/avi, video/mov"
}
```

## Troubleshooting

### Common Issues
1. **401 errors**: Check if user is logged in and has instructor role
2. **403 errors**: Verify course ownership in database
3. **Rate limits not working**: Check server restart (in-memory store resets)
4. **File validation failing**: Ensure proper MIME type and file size

### Debug Commands
```bash
# Check if user has instructor role
npx supabase sql --db-url="your-db-url" \
  --query="SELECT id, email, role FROM profiles WHERE email='your@email.com'"

# Check course ownership
npx supabase sql --db-url="your-db-url" \
  --query="SELECT id, title, instructor_id FROM courses WHERE id='course-id'"
```

---

**Testing Status**: Ready for security validation
**Priority Tests**: Authentication, Authorization, Rate Limiting
**Next Steps**: Run all tests, verify expected responses, fix any issues found