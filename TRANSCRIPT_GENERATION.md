# Video Transcript Generation

This guide helps you generate transcripts from your video files using Whisper.cpp, then upload them to your course edit page.

## Setup (One-time)

1. **Install Whisper.cpp and models:**
   ```bash
   ./scripts/setup-whisper.sh
   ```

   This will:
   - Clone and compile whisper.cpp
   - Download the `base.en` model (recommended)
   - Download the `small.en` model (faster)

## Generate Transcripts

1. **Organize your videos:**
   ```bash
   mkdir videos transcripts
   # Copy your .mp4/.mkv files to videos/ folder
   ```

2. **Run transcript generation:**
   ```bash
   ./scripts/generate-transcripts.sh videos transcripts
   ```

3. **Check output:**
   ```bash
   ls transcripts/
   # You'll see:
   # video1.txt  - Plain text (good for upload)
   # video1.json - Full Whisper output with timestamps
   ```

## Upload to Course

1. **Go to course edit page**
2. **Find your videos** in the chapter sections
3. **Click the upload icon** (gray arrow) next to each video
4. **Select the corresponding .txt or .json file**
5. **Icon turns green** when transcript is uploaded

## Advanced Usage

### Use faster model (less accurate):
```bash
MODEL_PATH=./whisper.cpp/models/ggml-small.en.bin ./scripts/generate-transcripts.sh
```

### Process specific folder:
```bash
./scripts/generate-transcripts.sh /path/to/my/videos /path/to/output
```

### Batch process multiple courses:
```bash
for course in course1 course2 course3; do
  ./scripts/generate-transcripts.sh "videos/$course" "transcripts/$course"
done
```

## File Formats Supported

**Input videos:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`
**Output transcripts:** `.txt` (plain text), `.json` (with timestamps)
**Upload formats:** `.txt`, `.json`, `.srt`, `.vtt`

## Tips

- **Use base.en model** for best accuracy
- **Use small.en model** if you need speed
- **Keep original videos** - audio files are deleted after processing
- **Transcripts are cached** - won't regenerate if files exist
- **Upload .json files** if you want timestamps for future features

## Troubleshooting

**Error: ffmpeg not found**
```bash
brew install ffmpeg
```

**Error: make not found**
```bash
xcode-select --install
```

**Error: Model not found**
```bash
cd whisper.cpp
bash ./models/download-ggml-model.sh base.en
```