# AI Voice Generation Implementation Plan
**Date:** 2025-08-26  
**Purpose:** Add text-to-speech capability with ElevenLabs integration  
**Alignment:** Architecture V2 Compliant

## Overview
Extend the video editor with AI voice generation capabilities, allowing users to convert written scripts into AI-generated voice audio that can be added to timeline audio tracks.

## Architecture Alignment with V2 Principles

### 1. Virtual Timeline Compliance
- Generated audio clips integrate with existing timeline system
- Timeline position remains single source of truth
- No special handling - AI audio behaves like regular audio clips

### 2. State Management Pattern
- Follow existing patterns from useRecording.ts
- Separate hook for focused responsibility
- Clean integration with useVideoEditor.ts

### 3. File Structure (V2 Compliant)

#### New Files to Create:
```
/src/lib/video-editor/
└── useTextToSpeech.ts          # TTS operations hook (like useRecording.ts)

/src/app/api/
└── elevenlabs/
    └── route.ts                 # API endpoint for ElevenLabs

/src/components/video-studio/
└── ScriptPanel.tsx              # Script editor with voice controls
```

#### Files to Modify:
```
/src/lib/video-editor/
├── types.ts                     # Add TTS-related types
└── useVideoEditor.ts            # Integrate audio clip addition

/src/components/video-studio/
└── VideoStudio.tsx              # Add script panel to layout
```

## Implementation Phases

### Phase 1: Core TTS Hook Development (Day 1 Morning)

#### 1.1 Create useTextToSpeech.ts
**Responsibilities:**
- Manage ElevenLabs API communication
- Handle voice generation state
- Convert audio responses to blobs
- Create clip objects from audio

**Key Functions:**
- generateVoice() - Send text to API, receive audio
- processAudioResponse() - Convert response to blob
- createAudioClipFromVoice() - Generate clip metadata
- Management of generation state and errors

**State Management:**
- isGenerating: boolean
- generationProgress: number
- generationError: string | null
- generatedAudio: Blob | null

### Phase 2: API Integration (Day 1 Morning)

#### 2.1 Create API Route
**Location:** /src/app/api/elevenlabs/route.ts

**Responsibilities:**
- Proxy requests to ElevenLabs API
- Hide API keys from frontend
- Stream audio responses
- Handle rate limiting and errors

**Endpoints:**
- POST /api/elevenlabs/generate - Text to speech
- GET /api/elevenlabs/voices - Available voices list

### Phase 3: UI Components (Day 1 Afternoon)

#### 3.1 Create ScriptPanel Component
**Location:** /src/components/video-studio/ScriptPanel.tsx

**Features:**
- Text area for script input
- Voice selection dropdown
- Voice settings (speed, stability, clarity)
- Generate button with progress indicator
- Preview audio button
- Add to Timeline button

**State:**
- script: string
- selectedVoice: string
- voiceSettings: object
- previewUrl: string | null

#### 3.2 Integrate with VideoStudio
**Modifications to VideoStudio.tsx:**
- Add ScriptPanel to layout
- Position in sidebar or modal
- Connect to timeline for cursor position
- Pass necessary callbacks

### Phase 4: Timeline Integration (Day 1 Afternoon)

#### 4.1 Extend Clip Type
**Modifications to types.ts:**
- Add sourceType: 'recorded' | 'uploaded' | 'ai-generated'
- Add voiceMetadata?: { voiceId, settings }
- Ensure compatibility with existing clip operations

#### 4.2 Audio Clip Creation
**Integration with useVideoEditor.ts:**
- Reuse existing addClip function
- Set proper audio track placement
- Handle clip positioning at playhead
- Maintain history for undo/redo

### Phase 5: Visual Indicators (Day 2 Morning)

#### 5.1 AI Clip Styling
**Modifications to TimelineClips.tsx:**
- Add visual indicator for AI-generated clips
- Different color or icon overlay
- Tooltip showing voice used
- Maintain all existing clip functionality

### Phase 6: Advanced Features (Day 2 Afternoon)

#### 6.1 Voice Management
- Cache voice list locally
- Preview voice samples
- Save favorite voices
- Voice settings presets

#### 6.2 Script Processing
- Auto-split long texts into chunks
- Sentence detection for natural breaks
- Multiple voice support per script
- Batch generation queue

#### 6.3 Audio Processing
- Trim silence from generated audio
- Normalize audio levels
- Add fade in/out options
- Export with video

## Technical Considerations

### Performance
- Stream large audio files
- Lazy load voice list
- Cache generated audio temporarily
- Clean up blob URLs properly

### Error Handling
- API rate limit handling
- Network failure recovery
- Invalid text handling
- Quota exceeded messaging

### User Experience
- Clear generation progress
- Ability to cancel generation
- Preview before adding to timeline
- Clear error messages

### Security
- API key protection via backend
- Input sanitization
- File size limits
- Rate limiting per user

## Integration Points

### With Existing Systems:
1. **VirtualTimelineEngine:** No changes needed - audio clips work as-is
2. **useVideoEditor:** Use existing addClip, standard clip operations
3. **TimelineClips:** Render AI clips with existing audio track logic
4. **HistoryManager:** Automatic undo/redo support
5. **Audio Tracks:** Full compatibility with mute/unmute, move, trim

### API Requirements:
- ElevenLabs API key (environment variable)
- Next.js API routes for proxying
- Proper CORS handling
- Error response formatting

## Testing Strategy

### Unit Tests:
- TTS hook functions
- API endpoint responses
- Clip creation logic
- Error handling paths

### Integration Tests:
- Full generation flow
- Timeline integration
- Playback with AI audio
- Export with AI audio

### Manual Testing:
- Various text lengths
- Different voices
- Network interruptions
- Timeline operations on AI clips

## Success Criteria

### Functional:
- ✓ Text converts to audio successfully
- ✓ Audio adds to timeline at correct position
- ✓ AI clips behave like regular audio clips
- ✓ All existing features continue working

### Performance:
- ✓ Generation completes within 5 seconds for average text
- ✓ No UI blocking during generation
- ✓ Smooth timeline operations with AI clips

### User Experience:
- ✓ Clear, intuitive workflow
- ✓ Helpful error messages
- ✓ Visual feedback during generation
- ✓ Seamless integration with existing UI

## Migration Path

### Step 1: Non-Breaking Addition
- Add new features without modifying existing
- Keep all current functionality intact
- Test thoroughly before release

### Step 2: Progressive Enhancement
- Start with basic TTS
- Add advanced features gradually
- Monitor user feedback

### Step 3: Future Expansions
- Multiple TTS provider support
- Local TTS model integration
- Real-time voice synthesis
- Voice cloning capabilities

## Risk Mitigation

### Technical Risks:
- **API Dependency:** Cache and offline fallback planning
- **Large Files:** Streaming and chunking strategy
- **Performance:** Lazy loading and optimization
- **Browser Compatibility:** Audio API polyfills

### Business Risks:
- **API Costs:** Usage monitoring and limits
- **Rate Limits:** Queue management
- **Voice Quality:** User preview before generation

## Estimated Timeline

**Day 1:**
- Morning: Core TTS hook and API setup (4 hours)
- Afternoon: UI components and basic integration (4 hours)

**Day 2:**
- Morning: Timeline integration and visual indicators (3 hours)
- Afternoon: Testing and polish (3 hours)
- Late afternoon: Advanced features if time permits (2 hours)

**Total: 16 hours (2 days)**

## Conclusion

This implementation plan follows Architecture V2 principles by:
- Creating focused, single-responsibility hooks
- Integrating cleanly with existing systems
- Maintaining the Virtual Timeline as source of truth
- Following established patterns from useRecording.ts
- Keeping complexity manageable and testable

The AI voice generation feature will seamlessly extend the video editor's capabilities while maintaining code quality and architectural integrity.