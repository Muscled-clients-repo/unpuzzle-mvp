// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

module.exports = {
  apps: [
    {
      name: 'unpuzzle-websocket',
      script: 'websocket-server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
        WEBSOCKET_URL: 'ws://localhost:8080',
        // Transcription environment variables
        WHISPER_CPP_PATH: './whisper.cpp/main',
        WHISPER_MODEL_PATH: './models/ggml-base.en.bin',
        TRANSCRIPTION_TEMP_DIR: '/tmp/transcriptions',
        FFMPEG_PATH: '/usr/local/bin/ffmpeg',
        // Database
        DATABASE_URL: process.env.DATABASE_URL
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        WEBSOCKET_URL: 'ws://localhost:8080'
      },
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    },
    {
      name: 'unpuzzle-transcription-worker-1',
      script: 'workers/transcription/transcription-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s',
      env: {
        WORKER_ID: 'worker-1',
        WORKER_TYPE: 'transcription',
        WEBSOCKET_SERVER_URL: 'http://localhost:8080',
        CONCURRENT_JOBS: 1,
        // Whisper configuration
        WHISPER_CPP_PATH: './whisper.cpp/main',
        WHISPER_MODEL_PATH: './models/ggml-base.en.bin',
        TRANSCRIPTION_TEMP_DIR: '/tmp/transcriptions',
        FFMPEG_PATH: '/usr/local/bin/ffmpeg',
        // Database
        DATABASE_URL: process.env.DATABASE_URL
      },
      error_file: './logs/transcription-worker-1-error.log',
      out_file: './logs/transcription-worker-1-out.log',
      log_file: './logs/transcription-worker-1-combined.log',
      time: true
    },
    {
      name: 'unpuzzle-transcription-worker-2',
      script: 'workers/transcription/transcription-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s',
      env: {
        WORKER_ID: 'worker-2',
        WORKER_TYPE: 'transcription',
        WEBSOCKET_SERVER_URL: 'http://localhost:8080',
        CONCURRENT_JOBS: 1,
        // Whisper configuration
        WHISPER_CPP_PATH: './whisper.cpp/main',
        WHISPER_MODEL_PATH: './models/ggml-base.en.bin',
        TRANSCRIPTION_TEMP_DIR: '/tmp/transcriptions',
        FFMPEG_PATH: '/usr/local/bin/ffmpeg',
        // Database
        DATABASE_URL: process.env.DATABASE_URL
      },
      error_file: './logs/transcription-worker-2-error.log',
      out_file: './logs/transcription-worker-2-out.log',
      log_file: './logs/transcription-worker-2-combined.log',
      time: true
    },
    {
      name: 'unpuzzle-duration-worker',
      script: 'workers/duration/duration-worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 5,
      min_uptime: '10s',
      env: {
        WORKER_ID: 'duration-1',
        WORKER_TYPE: 'duration',
        WEBSOCKET_SERVER_URL: 'http://localhost:8080',
        // FFprobe configuration
        FFPROBE_PATH: '/opt/homebrew/bin/ffprobe',
        // CDN HMAC authentication
        HMAC_SECRET: process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET,
        // Database - now reading from environment
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      error_file: './logs/duration-worker-error.log',
      out_file: './logs/duration-worker-out.log',
      log_file: './logs/duration-worker-combined.log',
      time: true
    },

    // Thumbnail Worker - Extracts video thumbnails using FFmpeg
    {
      name: 'unpuzzle-thumbnail-worker',
      script: 'workers/thumbnail/thumbnail-worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      max_restarts: 5,
      min_uptime: '10s',
      env: {
        WORKER_ID: 'thumbnail-1',
        WORKER_TYPE: 'thumbnail',
        WEBSOCKET_SERVER_URL: 'http://localhost:8080',
        // FFmpeg configuration
        FFMPEG_PATH: '/opt/homebrew/bin/ffmpeg',
        // CDN HMAC authentication
        HMAC_SECRET: process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET,
        // Backblaze B2 credentials
        BACKBLAZE_APPLICATION_KEY_ID: process.env.BACKBLAZE_APPLICATION_KEY_ID,
        BACKBLAZE_APPLICATION_KEY: process.env.BACKBLAZE_APPLICATION_KEY,
        BACKBLAZE_BUCKET_ID: process.env.BACKBLAZE_BUCKET_ID,
        // Database
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      error_file: './logs/thumbnail-worker-error.log',
      out_file: './logs/thumbnail-worker-out.log',
      log_file: './logs/thumbnail-worker-combined.log',
      time: true
    }
  ]
}