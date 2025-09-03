# Minimal Video Browser MVP - Super Fast & Simple

## What You Actually Need (No BS)

```
1. Mass upload to Backblaze → 
2. Auto-generate low-res proxies → 
3. Stream instantly in browser → 
4. Mark in/out timestamps → 
5. Download HD segment → 
6. Edit in Premiere
```

## The Simplest Possible Solution

### Option 1: **Backblaze + Mux** (Easiest)
```javascript
// Upload original to Backblaze
// Mux handles everything else automatically
const workflow = {
  upload: "Backblaze B2",           // $6/TB storage
  streaming: "Mux.com",              // $0.007/min streamed
  features: [
    "Auto proxy generation",
    "Instant playback",
    "Timeline thumbnails", 
    "Direct Premiere integration"
  ],
  monthyCost: "$30 + $20 = $50"
}
```

### Option 2: **DIY with FFmpeg** (Cheapest)
```bash
# Simple script that runs on your computer
# 1. Upload original to Backblaze
rclone sync /your/footage backblaze:bucket

# 2. Generate low-res proxy
ffmpeg -i input.mp4 -vf scale=640:-1 -b:v 400k proxy.mp4

# 3. Upload proxy to Bunny CDN
curl -X PUT https://storage.bunnycdn.com/proxy.mp4

# Result: Stream proxy, download original
```

## Minimal Web Interface (100 lines of code)

```tsx
// app/video-browser/page.tsx
export default function VideoBrowser() {
  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {/* Video Grid */}
      {videos.map(video => (
        <div key={video.id} className="cursor-pointer" 
             onClick={() => setSelected(video)}>
          <video src={video.proxyUrl} muted />
          <p>{video.name}</p>
          <p>{video.size} • {video.date}</p>
        </div>
      ))}
      
      {/* Preview Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black">
          <video src={selected.proxyUrl} controls />
          <div>
            <button onClick={setInPoint}>Mark In [{inTime}]</button>
            <button onClick={setOutPoint}>Mark Out [{outTime}]</button>
            <button onClick={downloadSegment}>
              Download HD Segment ({inTime} - {outTime})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

## The 3-Script Setup

### Script 1: Upload & Process
```python
# upload_and_process.py
import os
import subprocess
from backblaze_b2 import B2Api

def process_video(file_path):
    # 1. Upload original to B2
    b2.upload_file(file_path, "originals/")
    
    # 2. Generate 360p proxy
    proxy_path = file_path.replace('.mp4', '_proxy.mp4')
    subprocess.run([
        'ffmpeg', '-i', file_path,
        '-vf', 'scale=640:-1',
        '-b:v', '400k',
        '-movflags', '+faststart',  # Important for streaming
        proxy_path
    ])
    
    # 3. Upload proxy to Bunny CDN for fast streaming
    upload_to_bunny(proxy_path, "proxies/")
    
    # 4. Save to database
    db.insert({
        'name': os.path.basename(file_path),
        'original_url': b2_url,
        'proxy_url': bunny_url,
        'duration': get_duration(file_path)
    })

# Run on entire folder
for video in os.listdir('/Volumes/ExternalDrive'):
    process_video(video)
```

### Script 2: Simple Web Viewer
```html
<!-- index.html - Dead simple viewer -->
<!DOCTYPE html>
<html>
<head>
    <style>
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .video-card { cursor: pointer; }
        .modal { position: fixed; inset: 0; background: black; display: none; }
        .modal.active { display: block; }
    </style>
</head>
<body>
    <div class="grid" id="videos"></div>
    
    <div class="modal" id="preview">
        <video id="player" controls style="width: 100%; height: 80%"></video>
        <div>
            <button onclick="markIn()">Mark In</button>
            <span id="inTime">00:00</span>
            <button onclick="markOut()">Mark Out</button>
            <span id="outTime">00:00</span>
            <button onclick="downloadSegment()">Download HD Segment</button>
        </div>
    </div>

    <script>
        let currentVideo = null;
        let inPoint = 0;
        let outPoint = 0;

        // Load videos from API
        fetch('/api/videos')
            .then(r => r.json())
            .then(videos => {
                videos.forEach(v => {
                    document.getElementById('videos').innerHTML += `
                        <div class="video-card" onclick="preview('${v.id}')">
                            <video src="${v.proxy_url}" muted></video>
                            <p>${v.name}</p>
                        </div>
                    `;
                });
            });

        function preview(id) {
            currentVideo = videos.find(v => v.id === id);
            document.getElementById('player').src = currentVideo.proxy_url;
            document.getElementById('preview').classList.add('active');
        }

        function markIn() {
            inPoint = document.getElementById('player').currentTime;
            document.getElementById('inTime').textContent = formatTime(inPoint);
        }

        function markOut() {
            outPoint = document.getElementById('player').currentTime;
            document.getElementById('outTime').textContent = formatTime(outPoint);
        }

        function downloadSegment() {
            // Download only the segment you need in full quality
            window.location.href = `/api/download?video=${currentVideo.id}&in=${inPoint}&out=${outPoint}`;
        }
    </script>
</body>
</html>
```

### Script 3: Segment Downloader
```python
# api/download.py - Downloads HD segment
def download_segment(video_id, in_time, out_time):
    video = db.get(video_id)
    
    # Use ffmpeg to download only the segment needed
    output_file = f"{video.name}_{in_time}-{out_time}.mp4"
    
    subprocess.run([
        'ffmpeg',
        '-ss', str(in_time),        # Start time
        '-i', video.original_url,    # Backblaze URL
        '-t', str(out_time - in_time),  # Duration
        '-c', 'copy',                # No re-encoding (fast)
        output_file
    ])
    
    return send_file(output_file)
```

## Even Simpler: Use Existing Tools

### Option A: **Backblaze + VideoJS**
```javascript
// Just use VideoJS player with Backblaze URLs
<video-js controls preload="auto">
  <source src="https://f001.backblazeb2.com/your-proxy.mp4" />
</video-js>
```

### Option B: **Frame.io Clone (Open Source)**
- **Screenlight**: Open source Frame.io alternative
- **Syncsketch**: Has API for custom integration
- **Cinco**: Self-hosted video review tool

### Option C: **Just Use Bunny Stream**
```javascript
// Bunny Stream does EVERYTHING automatically
1. Upload to Bunny Stream
2. Auto-generates multiple qualities
3. Provides embeddable player
4. Has API for segment downloads
5. $5/TB/month + $0.005/min encoding
```

## The Absolute Minimum Setup (Start Today)

```bash
# 1. Install rclone
brew install rclone

# 2. Configure Backblaze
rclone config
# Follow prompts for B2

# 3. Mass upload
rclone copy /Volumes/YourDrive b2:your-bucket/originals

# 4. Use Bunny Stream for everything else
# Upload one video to Bunny Stream
# It auto-generates streamable versions
# Use their player on a simple HTML page
```

## Quick Decision Matrix

| If You Want... | Use This |
|---------------|----------|
| Cheapest | Backblaze + FFmpeg scripts |
| Fastest setup | Bunny Stream (all-in-one) |
| Best quality | Mux.com |
| Most control | DIY with scripts |
| Start today | Bunny Stream trial |

## Costs for 5TB

| Solution | Storage | Streaming | Processing | Total/Month |
|----------|---------|-----------|------------|-------------|
| Backblaze + FFmpeg | $30 | $0 | Your computer | $30 |
| Bunny Stream | $25 | $10 | Included | $35 |
| Backblaze + Mux | $30 | $20 | Included | $50 |

## Next Step: Build in 1 Hour

```python
# requirements.txt
backblaze-b2
flask
ffmpeg-python

# app.py - Complete working app
from flask import Flask, render_template, jsonify, send_file
import b2sdk.v2 as b2
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    # List all videos from B2
    videos = b2_client.list_files()
    return render_template('index.html', videos=videos)

@app.route('/api/download-segment')
def download_segment():
    video_url = request.args.get('url')
    start = request.args.get('start')
    end = request.args.get('end')
    
    # Download segment with ffmpeg
    output = f"segment_{start}_{end}.mp4"
    subprocess.run([
        'ffmpeg', '-ss', start, '-to', end,
        '-i', video_url, '-c', 'copy', output
    ])
    
    return send_file(output)

if __name__ == '__main__':
    app.run()
```

**Bottom Line:** Start with Bunny Stream for instant results ($35/month), then optimize later if needed. You can have this working in literally 1 hour.