#!/bin/bash

# Whisper.cpp Setup Script
# Downloads and compiles Whisper.cpp with models

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎤 Setting up Whisper.cpp for transcript generation${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this from your project root directory${NC}"
    exit 1
fi

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ git is required${NC}"
    exit 1
fi

if ! command -v make &> /dev/null; then
    echo -e "${RED}❌ make is required (install Xcode Command Line Tools)${NC}"
    exit 1
fi

# Clone whisper.cpp if not exists
if [ ! -d "whisper.cpp" ]; then
    echo -e "${YELLOW}📥 Cloning whisper.cpp...${NC}"
    git clone https://github.com/ggerganov/whisper.cpp.git
else
    echo -e "${GREEN}✅ whisper.cpp already exists${NC}"
fi

# Compile whisper.cpp
echo -e "${YELLOW}🔨 Compiling whisper.cpp...${NC}"
cd whisper.cpp
make clean > /dev/null 2>&1 || true
if make -j > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Compilation successful${NC}"
else
    echo -e "${RED}❌ Compilation failed${NC}"
    exit 1
fi
cd ..

# Download models
echo -e "${YELLOW}📥 Downloading Whisper models...${NC}"
cd whisper.cpp

# Download base English model (good balance of speed/accuracy)
if [ ! -f "models/ggml-base.en.bin" ]; then
    echo "   Downloading base.en model..."
    bash ./models/download-ggml-model.sh base.en
    echo -e "${GREEN}✅ base.en model downloaded${NC}"
else
    echo -e "${GREEN}✅ base.en model already exists${NC}"
fi

# Download small model for faster processing
if [ ! -f "models/ggml-small.en.bin" ]; then
    echo "   Downloading small.en model..."
    bash ./models/download-ggml-model.sh small.en
    echo -e "${GREEN}✅ small.en model downloaded${NC}"
else
    echo -e "${GREEN}✅ small.en model already exists${NC}"
fi

cd ..

# Test installation
echo -e "${YELLOW}🧪 Testing installation...${NC}"
if [ -f "whisper.cpp/build/bin/whisper-cli" ] && [ -f "whisper.cpp/models/ggml-base.en.bin" ]; then
    echo -e "${GREEN}✅ Whisper.cpp setup complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Usage:${NC}"
    echo "   ./scripts/generate-transcripts.sh [video_folder] [output_folder]"
    echo ""
    echo -e "${BLUE}📁 Example:${NC}"
    echo "   mkdir videos transcripts"
    echo "   # Put your .mp4/.mkv files in videos/"
    echo "   ./scripts/generate-transcripts.sh videos transcripts"
    echo ""
    echo -e "${BLUE}⚙️  Models available:${NC}"
    echo "   base.en - Good balance (recommended)"
    echo "   small.en - Faster but less accurate"
    echo ""
    echo -e "${YELLOW}💡 To use different model, set MODEL_PATH:${NC}"
    echo "   MODEL_PATH=./whisper.cpp/models/ggml-small.en.bin ./scripts/generate-transcripts.sh"
else
    echo -e "${RED}❌ Setup failed${NC}"
    exit 1
fi