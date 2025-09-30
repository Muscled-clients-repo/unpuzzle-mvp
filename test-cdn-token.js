// Test CDN token generation and access
require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const { execSync } = require('child_process')

const CDN_URL = process.env.CLOUDFLARE_CDN_URL || 'https://cdn.unpuzzle.co'
const AUTH_SECRET = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

console.log('Testing CDN token generation...\n')
console.log('CDN URL:', CDN_URL)
console.log('Auth Secret present:', !!AUTH_SECRET)

// Generate token
function generateHMACToken(filePath, secret) {
  const timestamp = Date.now().toString()
  const message = `${timestamp}.${filePath}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${timestamp}.${signature}`
}

// Test with a known video file
const fileName = '2025-08-31 13-06-56.mp4'
// IMPORTANT: Token must be generated for the encoded path!
const encodedFileName = encodeURIComponent(fileName)
const token = generateHMACToken(`/${encodedFileName}`, AUTH_SECRET)
const fullUrl = `${CDN_URL}/${encodedFileName}?token=${token}`

console.log('\n📹 Testing file:', fileName)
console.log('🔑 Generated token:', token)
console.log('🔗 Full URL:', fullUrl)

// Test with curl
console.log('\n📡 Testing with curl...')
try {
  const result = execSync(`curl -I -s "${fullUrl}" | head -n 1`, { encoding: 'utf8' })
  console.log('Response:', result.trim())

  if (result.includes('200')) {
    console.log('✅ Success! CDN is accessible with token')

    // Now test with FFprobe
    console.log('\n🎬 Testing with FFprobe...')
    try {
      const duration = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullUrl}"`,
        { encoding: 'utf8' }
      )
      console.log('✅ Duration extracted:', duration.trim(), 'seconds')
    } catch (ffprobeError) {
      console.log('❌ FFprobe failed:', ffprobeError.message)
    }
  } else {
    console.log('❌ CDN returned non-200 status')
  }
} catch (error) {
  console.error('❌ Curl failed:', error.message)
}