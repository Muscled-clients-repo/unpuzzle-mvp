# Video Transcription & AI Agents Integration Plan

**Date:** September 18, 2025 04:34 AM EST
**Context:** AI agents currently use mock data. Need real transcription-powered agents for hints/quizzes.

---

## Current State Analysis

### ✅ What's Working
- AI agents display in student video pages
- 4 agent types: PuzzleHint, PuzzleCheck, PuzzleReflect, PuzzlePath
- Mock data structure defined in `src/data/mock/ai-agents.ts`
- Video agent system architecture exists in `src/lib/video-agent-system/`

### ❌ What's Missing
- Real video transcriptions
- Transcript-powered AI content generation
- Course edit UI for selective transcription
- Backend processing for Whisper.cpp integration

---

## Architecture Overview

### Whisper.cpp Integration Strategy
**Local Processing** (Recommended for MVP):
- Node.js child process spawning Whisper.cpp binary
- Process videos on instructor's request (not automatic)
- Store transcripts in Supabase with video association

### Data Flow
```
Video Upload → Course Edit → Select for Transcription → Whisper.cpp Processing →
Transcript Storage → AI Agent Content Generation → Student Experience
```

---

## Implementation Plan

### Phase 1: Backend Transcription Service (Week 1)

#### 1.1 Whisper.cpp Setup
- **Location**: `src/services/transcription/whisper-service.ts`
- **Dependencies**:
  - Download/compile Whisper.cpp binary
  - Create Node.js wrapper service
  - Add environment configuration

**Files to Create:**
```
src/services/transcription/
├── whisper-service.ts          # Main service
├── whisper-installer.ts        # Binary installation
├── transcript-processor.ts     # Text processing
└── types.ts                    # TypeScript interfaces
```

#### 1.2 Database Schema
**New Tables:**
```sql
-- Video transcripts
CREATE TABLE video_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  transcript_text text NOT NULL,
  transcript_segments jsonb, -- Whisper timing data
  processing_status text DEFAULT 'pending', -- pending, processing, completed, failed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI generated content based on transcripts
CREATE TABLE ai_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  transcript_id uuid REFERENCES video_transcripts(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- hint, quiz, reflection, path
  content_data jsonb NOT NULL,
  timestamp_start integer, -- Video timestamp for contextual content
  timestamp_end integer,
  created_at timestamptz DEFAULT now()
);
```

#### 1.3 Server Actions
**Files to Create:**
```
src/app/actions/transcription-actions.ts
src/app/actions/ai-content-actions.ts
```

**Key Functions:**
- `transcribeVideo(videoId: string, courseId: string)`
- `getTranscriptionStatus(videoId: string)`
- `generateAIContent(transcriptId: string, contentType: string)`
- `getAIContentForVideo(videoId: string, timestamp?: number)`

### Phase 2: Course Edit UI Enhancement (Week 1-2)

#### 2.1 Transcription Toggle UI
**Location**: `src/app/instructor/course/[id]/edit/page.tsx`

**Add to existing video cards:**
- Transcription toggle switch
- Processing status indicator
- Transcript preview/edit capability

**New Components:**
```
src/components/course/transcription/
├── TranscriptionToggle.tsx     # On/off switch per video
├── TranscriptionStatus.tsx     # Processing indicator
├── TranscriptViewer.tsx        # View/edit transcript
└── BulkTranscriptionPanel.tsx  # Bulk operations
```

#### 2.2 UI Features
- **Individual Video Controls**: Toggle transcription per video
- **Bulk Operations**: "Transcribe All" / "Transcribe Selected"
- **Status Indicators**: Pending, Processing, Completed, Failed
- **Preview & Edit**: View generated transcripts, manual corrections

### Phase 3: AI Content Generation (Week 2)

#### 3.1 Content Generation Service
**Location**: `src/services/ai/content-generator.ts`

**Functionality:**
- Parse transcripts into segments
- Generate contextual hints based on video content
- Create quizzes from key concepts in transcript
- Generate reflection prompts from video themes

**Integration Points:**
- Replace mock data in `src/data/mock/ai-agents.ts`
- Update video agent system to use real data
- Implement timestamp-based content delivery

#### 3.2 AI Content Types

**PuzzleHint Generation:**
```typescript
// Based on transcript analysis
interface GeneratedHint {
  videoSegment: string;      // Transcript excerpt
  contextTimestamp: number;  // When to show hint
  hintText: string;         // Generated helpful text
  relatedConcepts: string[]; // Extracted from transcript
}
```

**PuzzleCheck Generation:**
```typescript
// Quiz questions from key concepts
interface GeneratedQuiz {
  question: string;          // Based on transcript content
  options: string[];        // Generated options
  correctAnswer: number;    // Determined from context
  explanation: string;      // From transcript analysis
  sourceSegment: string;    // Original transcript text
}
```

### Phase 4: Student Experience Integration (Week 2-3)

#### 4.1 Real-time AI Content Delivery
**Update**: `src/lib/video-agent-system/`

**Changes:**
- Replace mock data sources
- Implement transcript-based triggering
- Add timestamp-aware content fetching

#### 4.2 Contextual Content Display
- **Time-based Triggers**: Show hints at relevant moments
- **Pause-based Hints**: Analyze where students pause frequently
- **Adaptive Quizzes**: Generate questions based on viewing patterns
- **Smart Reflections**: Prompt reflection at concept boundaries

---

## Technical Implementation Details

### Whisper.cpp Service Architecture

```typescript
// src/services/transcription/whisper-service.ts
export class WhisperService {
  async transcribeVideo(
    videoUrl: string,
    videoId: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // 1. Download video from Backblaze (if needed)
    // 2. Extract audio using ffmpeg
    // 3. Run Whisper.cpp on audio file
    // 4. Parse Whisper output (SRT/VTT format)
    // 5. Store transcript in database
    // 6. Clean up temporary files
    // 7. Trigger AI content generation
  }

  async getTranscriptionStatus(videoId: string): Promise<TranscriptionStatus> {
    // Check processing status from database
  }

  async retryTranscription(videoId: string): Promise<void> {
    // Retry failed transcriptions
  }
}
```

### Environment Configuration

```bash
# .env.local additions
WHISPER_CPP_PATH=/path/to/whisper.cpp/main
WHISPER_MODEL_PATH=/path/to/models/ggml-base.en.bin
TRANSCRIPTION_TEMP_DIR=/tmp/transcriptions
FFMPEG_PATH=/usr/local/bin/ffmpeg

# AI Content Generation
OPENAI_API_KEY=sk-... # For AI content generation (optional)
ANTHROPIC_API_KEY=... # Alternative AI provider
```

### Processing Queue System

**Optional Enhancement**: Use a job queue for transcription processing

```typescript
// src/services/transcription/transcription-queue.ts
export class TranscriptionQueue {
  async addJob(videoId: string, priority: 'high' | 'normal' = 'normal') {
    // Add transcription job to queue
  }

  async processQueue() {
    // Process jobs in background
  }
}
```

---

## Database Migration Strategy

### Migration Files
```sql
-- supabase/migrations/039_video_transcription_system.sql
-- Creates tables for transcripts and AI content

-- supabase/migrations/040_add_transcription_flags.sql
-- Adds transcription enabled flags to videos table
ALTER TABLE videos ADD COLUMN transcription_enabled boolean DEFAULT false;
ALTER TABLE videos ADD COLUMN transcription_status text DEFAULT 'none';
```

---

## UI/UX Considerations

### Course Edit Page Enhancements

**Transcription Panel:**
```
┌─────────────────────────────────────────┐
│ Video Transcription Settings            │
├─────────────────────────────────────────┤
│ ☐ Enable AI-powered hints & quizzes    │
│                                         │
│ Videos (3 of 12 configured):            │
│ ┌─────────────────────────────────────┐ │
│ │ 📹 Intro to React                   │ │
│ │ [●] Transcribe  [⚡] Processing     │ │
│ │ └─ View transcript                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Transcribe Selected] [Bulk Settings]   │
└─────────────────────────────────────────┘
```

### Student Video Page
**Enhanced with real AI content:**
- Contextual hints appear based on transcript analysis
- Quiz questions generated from actual video content
- Reflection prompts tied to video concepts
- Learning paths based on transcript complexity

---

## Performance & Cost Considerations

### Transcription Processing
- **Local Processing**: No external API costs, but requires server resources
- **Processing Time**: ~1-2 minutes per hour of video content
- **Storage**: ~1KB per minute of video for transcript text
- **Queue Management**: Process transcriptions during off-peak hours

### AI Content Generation
- **Batch Processing**: Generate all AI content types in one pass
- **Caching**: Store generated content to avoid regeneration
- **Incremental Updates**: Only regenerate when transcript changes

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up Whisper.cpp service
- [ ] Create database schema and migrations
- [ ] Build transcription server actions
- [ ] Add basic UI toggle in course edit

### Week 2: AI Integration
- [ ] Implement AI content generation
- [ ] Replace mock data with real transcript-based content
- [ ] Enhance course edit UI with status indicators
- [ ] Test transcription pipeline end-to-end

### Week 3: Polish & Optimization
- [ ] Add bulk transcription operations
- [ ] Implement transcript editing capability
- [ ] Optimize performance and error handling
- [ ] User testing and refinement

---

## Success Metrics

### Technical Metrics
- Transcription accuracy (>90% for clear audio)
- Processing time (<2 minutes per hour of video)
- AI content relevance (subjective evaluation)
- System reliability (>95% success rate)

### User Experience Metrics
- Instructor adoption of transcription feature
- Student engagement with AI-generated content
- Improvement in learning outcomes (long-term)
- Content generation time savings for instructors

---

## Risk Mitigation

### Technical Risks
- **Whisper.cpp compilation issues**: Provide pre-compiled binaries
- **Audio quality variations**: Implement audio preprocessing
- **Large video processing**: Implement chunking for long videos
- **Server resource usage**: Queue management and resource monitoring

### User Experience Risks
- **Transcription errors**: Allow manual correction workflow
- **Inappropriate AI content**: Implement content review system
- **Performance impact**: Async processing with clear status updates

---

## Future Enhancements (Post-MVP)

### Advanced Features
- **Multi-language support**: Whisper.cpp supports 99 languages
- **Speaker identification**: Distinguish multiple speakers in videos
- **Automatic chapter detection**: AI-generated video segments
- **Content accessibility**: Auto-generated closed captions
- **Integration with external AI**: OpenAI, Claude for better content generation

### Scalability Options
- **Cloud transcription**: Migrate to cloud-based Whisper API
- **Real-time transcription**: Live transcription for streaming content
- **Advanced AI models**: Fine-tuned models for educational content

---

This plan transforms the current mock-data AI agents into a powerful, transcript-driven learning system that provides contextual, relevant educational support based on actual video content.