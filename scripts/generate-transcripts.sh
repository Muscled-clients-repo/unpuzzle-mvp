#!/bin/bash

# Whisper.cpp Transcript Generator
# Usage: ./generate-transcripts.sh [video_folder] [output_folder]
# Requirements: ffmpeg, whisper.cpp

set -e

# Default paths
VIDEO_FOLDER="${1:-./videos}"
OUTPUT_FOLDER="${2:-./transcripts}"
WHISPER_PATH="${WHISPER_PATH:-./whisper.cpp/build/bin/whisper-cli}"
MODEL_PATH="${MODEL_PATH:-./models/ggml-base.en.bin}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 Whisper.cpp Transcript Generator${NC}"
echo "Video folder: $VIDEO_FOLDER"
echo "Output folder: $OUTPUT_FOLDER"
echo "Whisper path: $WHISPER_PATH"
echo "Model path: $MODEL_PATH"
echo ""

# Check dependencies
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ Error: $1 is not installed${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
check_dependency ffmpeg

if [ ! -f "$WHISPER_PATH" ]; then
    echo -e "${RED}❌ Error: Whisper.cpp not found at $WHISPER_PATH${NC}"
    echo "Download and compile from: https://github.com/ggerganov/whisper.cpp"
    exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
    echo -e "${RED}❌ Error: Whisper model not found at $MODEL_PATH${NC}"
    echo "Download model with: bash ./models/download-ggml-model.sh base.en"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies found${NC}"

# Create output directories
mkdir -p "$OUTPUT_FOLDER"
mkdir -p "$OUTPUT_FOLDER/audio"

# Process videos
echo -e "${YELLOW}📁 Processing videos in $VIDEO_FOLDER...${NC}"

processed=0
skipped=0
errors=0

for video_file in "$VIDEO_FOLDER"/*.{mp4,mkv,avi,mov,webm}; do
    # Skip if no files match the pattern
    [ ! -f "$video_file" ] && continue

    filename=$(basename "$video_file")
    name="${filename%.*}"
    audio_file="$OUTPUT_FOLDER/audio/${name}.wav"
    transcript_file="$OUTPUT_FOLDER/${name}.txt"
    json_file="$OUTPUT_FOLDER/${name}.json"

    echo ""
    echo -e "${BLUE}🎵 Processing: $filename${NC}"

    # Check if transcript already exists
    if [ -f "$transcript_file" ] && [ -f "$json_file" ]; then
        echo -e "${YELLOW}⏭️  Transcript already exists, skipping${NC}"
        ((skipped++))
        continue
    fi

    # Extract audio with ffmpeg
    echo "   Extracting audio..."
    if ffmpeg -i "$video_file" -ar 16000 -ac 1 -c:a pcm_s16le "$audio_file" -y > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Audio extracted${NC}"
    else
        echo -e "   ${RED}❌ Failed to extract audio${NC}"
        ((errors++))
        continue
    fi

    # Generate transcript with whisper.cpp
    echo "   Generating transcript..."
    if "$WHISPER_PATH" -m "$MODEL_PATH" -f "$audio_file" -oj -of "$OUTPUT_FOLDER/${name}" > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Transcript generated${NC}"

        # Also create a simple text file
        if [ -f "$json_file" ]; then
            jq -r '.text' "$json_file" > "$transcript_file" 2>/dev/null || {
                echo "   ⚠️  jq not found, creating basic text file"
                grep '"text"' "$json_file" | sed 's/.*"text": *"\([^"]*\)".*/\1/' > "$transcript_file"
            }
        fi

        ((processed++))

        # Show word count
        if [ -f "$transcript_file" ]; then
            word_count=$(wc -w < "$transcript_file")
            echo -e "   📊 Word count: ${word_count}"
        fi

    else
        echo -e "   ${RED}❌ Failed to generate transcript${NC}"
        ((errors++))
    fi

    # Clean up audio file to save space
    rm -f "$audio_file"
done

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   Processed: ${GREEN}$processed${NC}"
echo -e "   Skipped: ${YELLOW}$skipped${NC}"
echo -e "   Errors: ${RED}$errors${NC}"
echo ""

if [ $processed -gt 0 ]; then
    echo -e "${GREEN}🎉 Transcripts generated in: $OUTPUT_FOLDER${NC}"
    echo "Files created:"
    echo "   *.txt - Plain text transcripts (for upload)"
    echo "   *.json - Full Whisper.cpp output with timestamps"
    echo ""
    echo -e "${YELLOW}💡 Upload the .txt or .json files to your course edit page${NC}"
else
    echo -e "${YELLOW}⚠️  No new transcripts generated${NC}"
fi