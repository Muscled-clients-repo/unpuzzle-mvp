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
      script: 'transcription-worker.js',
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
      script: 'transcription-worker.js',
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
    }
  ]
}