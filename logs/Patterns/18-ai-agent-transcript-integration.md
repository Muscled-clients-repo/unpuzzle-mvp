# AI Agent Transcript Integration Pattern

## Overview
Pattern for integrating AI agents with real transcript data to generate contextual hints, quizzes, and other learning content based on actual video content.

## Architecture

### 1. Shared Transcript Utilities (`/src/hooks/use-transcript-queries.ts`)

```typescript
// Core utility for extracting segments from API response
export function extractTranscriptSegments(data: TranscriptResponse): TranscriptSegment[] {
  if (!data.success || !data.hasTranscript || !data.transcript?.segments) {
    return []
  }

  // Handle both direct and nested segment structures
  if (Array.isArray(data.transcript.segments)) {
    return data.transcript.segments
  }

  if (data.transcript.segments.segments && Array.isArray(data.transcript.segments.segments)) {
    return data.transcript.segments.segments
  }

  return []
}

// AI-specific utility for getting transcript context
export async function getTranscriptContextForAI(videoId: string, timestamp: number): Promise<string> {
  try {
    const response = await fetch(`/api/transcription/${videoId}`)

    if (!response.ok) {
      if (response.status === 404) return "No transcript available"
      if (response.status === 403) return "Transcript unavailable"
      throw new Error(`Failed to fetch transcript: ${response.status}`)
    }

    const data: TranscriptResponse = await response.json()
    const segments = extractTranscriptSegments(data)

    if (segments.length === 0) return "No transcript available"

    // Find exact segment at timestamp
    const exactSegment = segments.find(s =>
      timestamp >= s.start && timestamp <= s.end
    )

    if (exactSegment) return exactSegment.text

    // Get surrounding context (±10 seconds)
    const contextSegments = segments.filter(s =>
      s.start >= timestamp - 10 && s.start <= timestamp + 10
    )

    return contextSegments.length > 0
      ? contextSegments.map(s => s.text).join(' ')
      : "No transcript available"

  } catch (error) {
    console.error('Failed to fetch transcript context for AI:', error)
    return "Transcript unavailable"
  }
}
```

### 2. AI API Endpoints

#### Hint Generation (`/src/app/api/ai/hint/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { videoId, timestamp, transcriptSegment } = await request.json()

    const prompt = `
Based on this video transcript segment, provide a helpful learning hint:

Transcript: "${transcriptSegment}"
Timestamp: ${timestamp}s

Generate a concise, educational hint that:
1. Explains the key concept being discussed
2. Provides context or background information
3. Offers practical understanding tips
4. Is 2-3 sentences maximum

Format as JSON:
{
  "hint": "Your helpful explanation here",
  "context": "Brief context about the topic",
  "relatedConcepts": ["concept1", "concept2"]
}
`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 300,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return NextResponse.json({
      success: true,
      hint: result.hint,
      context: result.context,
      relatedConcepts: result.relatedConcepts || [],
      timestamp,
      videoId
    })

  } catch (error) {
    console.error('Hint generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    )
  }
}
```

#### Quiz Generation (`/src/app/api/ai/quiz/route.ts`)
```typescript
// Similar structure but with quiz-specific prompt
const prompt = `
Based on this video transcript segment, create a comprehension quiz question:

Transcript: "${transcriptSegment}"
Timestamp: ${timestamp}s

Generate a multiple-choice question that tests understanding of the key concept.

Format as JSON:
{
  "question": "Clear, specific question about the content",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 1,
  "explanation": "Why this answer is correct and what it teaches"
}

Requirements:
- Question should test practical understanding
- 4 plausible options
- Explanation should reinforce learning
- Focus on the main concept discussed
`
```

### 3. AI Agent Integration in State Machine

```typescript
import { getTranscriptContextForAI } from '@/hooks/use-transcript-queries'

// Video context management
private videoId: string | null = null

public setVideoId(videoId: string | null) {
  this.videoId = videoId
}

private getVideoId(): string | null {
  return this.videoId
}

// AI generation with transcript context
private async generateAIHint(videoId?: string, timestamp?: number): Promise<string> {
  if (!videoId || timestamp === undefined) {
    return this.getMockHint()
  }

  try {
    const transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)

    const response = await fetch('/api/ai/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        timestamp,
        transcriptSegment
      })
    })

    const data = await response.json()

    if (data.success) {
      return `${data.hint}\n\n💡 Context: ${data.context}\n\n🔗 Related: ${data.relatedConcepts.join(', ')}`
    }

    return this.getMockHint()
  } catch (error) {
    console.error('AI hint generation failed:', error)
    return this.getMockHint()
  }
}
```

### 4. Video Player Integration

```typescript
// Video Player Component
const { context, dispatch, setVideoRef, setVideoId } = useVideoAgentSystem()

// Set video ID for AI context
useEffect(() => {
  setVideoId(props.videoId || null)
}, [props.videoId, setVideoId])

// When agent is activated, it uses current video time and ID
const handleAgentActivation = () => {
  const currentTime = videoRef.current?.getCurrentTime() || 0
  // State machine automatically uses videoId and currentTime for AI generation
}
```

## Key Principles

### 1. DRY (Don't Repeat Yourself)
- Single `getTranscriptContextForAI()` function used by all AI agents
- Shared `extractTranscriptSegments()` handles different transcript structures
- Consistent error handling across all transcript operations

### 2. Graceful Fallbacks
- Always provide mock data if AI generation fails
- Handle network errors, API failures, and missing transcripts
- Never break user experience due to AI issues

### 3. Context-Aware Generation
- AI receives exact timestamp for precise context
- Falls back to ±10 second window if no exact match
- Includes video ID for potential future enhancements

### 4. Consistent API Structure
```typescript
// Standard AI endpoint input
{
  videoId: string,
  timestamp: number,
  transcriptSegment: string
}

// Standard AI endpoint output
{
  success: boolean,
  [content]: any, // hint, quiz, etc.
  timestamp: number,
  videoId: string
}
```

## Usage for New AI Features

### Step 1: Create API Endpoint
```typescript
// /src/app/api/ai/[feature]/route.ts
import { getTranscriptContextForAI } from '@/hooks/use-transcript-queries'

export async function POST(request: NextRequest) {
  const { videoId, timestamp, transcriptSegment } = await request.json()

  // Generate AI content based on transcriptSegment
  // Return standardized response format
}
```

### Step 2: Add State Machine Method
```typescript
private async generateAI[Feature](videoId?: string, timestamp?: number): Promise<[ReturnType]> {
  if (!videoId || timestamp === undefined) {
    return this.getMock[Feature]()
  }

  try {
    const transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)

    const response = await fetch('/api/ai/[feature]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, timestamp, transcriptSegment })
    })

    const data = await response.json()

    if (data.success) {
      return data.[content]
    }

    return this.getMock[Feature]()
  } catch (error) {
    console.error('AI [feature] generation failed:', error)
    return this.getMock[Feature]()
  }
}
```

### Step 3: Integrate with Agent System
```typescript
// Add to generateAIResponse() switch statement
case '[feature]':
  return await this.generateAI[Feature](videoId, timestamp)
```

## Best Practices

### 1. Error Handling
- Always catch and log errors
- Provide meaningful fallbacks
- Don't expose internal errors to users

### 2. Performance
- Use reasonable timeouts for AI API calls
- Consider caching responses for same timestamp
- Log performance metrics for monitoring

### 3. Prompt Engineering
- Be specific about output format (JSON)
- Include clear requirements and constraints
- Test prompts with various transcript content

### 4. Testing
- Test with real transcript data
- Verify fallbacks work correctly
- Test edge cases (empty transcripts, API failures)

## Environment Configuration

```bash
# .env.local
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_ENABLE_AI_AGENTS=true
NEXT_PUBLIC_AI_FALLBACK_TO_MOCK=true
```

## Implementation Benefits

1. **Contextual Learning**: AI responses directly related to video content
2. **Scalable**: Easy to add new AI features following same pattern
3. **Reliable**: Graceful fallbacks ensure system always works
4. **Maintainable**: Shared utilities reduce code duplication
5. **Flexible**: Works with different transcript formats and structures

This pattern provides the foundation for any AI-powered learning feature that needs video transcript context.