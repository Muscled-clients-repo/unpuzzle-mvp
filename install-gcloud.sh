#!/bin/bash

# Quick gcloud CLI installation script for Linux

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Installing Google Cloud SDK${NC}"
echo -e "${GREEN}======================================${NC}"

# Method 1: Quick install using snap (if available)
if command -v snap &> /dev/null; then
    echo -e "${YELLOW}Installing via snap...${NC}"
    sudo snap install google-cloud-cli --classic
    echo -e "${GREEN}✓ gcloud installed via snap${NC}"
    echo -e "${YELLOW}Run 'gcloud init' to configure${NC}"
    exit 0
fi

# Method 2: Manual installation
echo -e "${YELLOW}Installing Google Cloud SDK manually...${NC}"

# Download and run the install script
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz

# Extract
tar -xf google-cloud-cli-linux-x86_64.tar.gz

# Install
./google-cloud-sdk/install.sh --quiet

# Add to PATH for current session
source ./google-cloud-sdk/path.bash.inc

# Clean up
rm google-cloud-cli-linux-x86_64.tar.gz

echo -e "${GREEN}✓ Google Cloud SDK installed!${NC}"
echo -e "${YELLOW}Please run the following to add gcloud to your PATH:${NC}"
echo -e "${BLUE}source ~/google-cloud-sdk/path.bash.inc${NC}"
echo -e "${YELLOW}Or restart your terminal${NC}"
echo -e ""
echo -e "${YELLOW}Then run: gcloud init${NC}"