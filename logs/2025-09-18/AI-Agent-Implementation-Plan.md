# AI Agent Implementation Plan - Transcript-Powered Hints & Quizzes

## Overview
Replace mock data with real AI-generated content using Groq API + transcript data to power contextual hints and quizzes based on video content.

## Implementation Strategy

### 1. API Endpoints to Create

#### A. Hint Generation API
**File**: `/src/app/api/ai/hint/route.ts`

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
      model: "llama-3.1-70b-versatile",
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

#### B. Quiz Generation API
**File**: `/src/app/api/ai/quiz/route.ts`

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

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-70b-versatile",
      temperature: 0.8,
      max_tokens: 400,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return NextResponse.json({
      success: true,
      quiz: {
        id: `quiz_${Date.now()}`,
        question: result.question,
        options: result.options,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation
      },
      timestamp,
      videoId
    })

  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
```

### 2. Agent Controller Updates

#### A. Update Hint Agent Controller
**File**: `/src/lib/video-agent-system/agents/PuzzleHintAgent.ts`

```typescript
// Replace mock data section with:

async generateHint(videoId: string, timestamp: number): Promise<PuzzleHint> {
  try {
    // Get transcript segment for current timestamp
    const transcriptSegment = await this.getTranscriptSegment(videoId, timestamp)

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
      return {
        context: data.context,
        hint: data.hint,
        relatedConcepts: data.relatedConcepts
      }
    }

    // Fallback to mock data if API fails
    return this.getMockHint()

  } catch (error) {
    console.error('Hint generation failed:', error)
    return this.getMockHint()
  }
}

private async getTranscriptSegment(videoId: string, timestamp: number): Promise<string> {
  try {
    const response = await fetch(`/api/transcription/${videoId}`)
    const data = await response.json()

    if (data.success && data.transcript?.segments) {
      // Find segment containing the timestamp
      const segment = data.transcript.segments.find(s =>
        timestamp >= s.start && timestamp <= s.end
      )

      if (segment) {
        return segment.text
      }

      // If no exact match, get surrounding context (±10 seconds)
      const contextSegments = data.transcript.segments.filter(s =>
        s.start >= timestamp - 10 && s.start <= timestamp + 10
      )

      return contextSegments.map(s => s.text).join(' ')
    }

    return "No transcript available"
  } catch (error) {
    console.error('Failed to fetch transcript:', error)
    return "Transcript unavailable"
  }
}
```

#### B. Update Quiz Agent Controller
**File**: `/src/lib/video-agent-system/agents/PuzzleCheckAgent.ts`

```typescript
// Replace mock quiz generation with:

async generateQuiz(videoId: string, timestamp: number): Promise<QuizQuestion> {
  try {
    const transcriptSegment = await this.getTranscriptSegment(videoId, timestamp)

    const response = await fetch('/api/ai/quiz', {
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
      return data.quiz
    }

    return this.getMockQuiz()

  } catch (error) {
    console.error('Quiz generation failed:', error)
    return this.getMockQuiz()
  }
}
```

### 3. Integration Points

#### A. Video Player Integration
When user pauses video or clicks hint button:

```typescript
// In StudentVideoPlayer component
const handleHintRequest = async () => {
  const currentTimestamp = videoRef.current?.currentTime || 0

  // Trigger hint agent with real context
  stateMachine.activateAgent('hint', {
    videoId: videoId,
    timestamp: currentTimestamp,
    useRealAI: true
  })
}
```

#### B. Chat Sidebar Integration
Update agent trigger functions:

```typescript
// In AIChatSidebarV2 component
const triggerHintAgent = () => {
  const currentTime = getCurrentVideoTime()

  stateMachine.executeCommand({
    type: 'ACTIVATE_AGENT',
    agentType: 'hint',
    context: {
      videoId,
      timestamp: currentTime,
      useTranscript: true
    }
  })
}
```

### 4. Error Handling & Fallbacks

#### A. Graceful Degradation
```typescript
// If AI API fails, fall back to mock data
const getHintWithFallback = async (context) => {
  try {
    return await generateAIHint(context)
  } catch (error) {
    console.warn('AI hint failed, using mock data:', error)
    return getMockHint(context.timestamp)
  }
}
```

#### B. Loading States
```typescript
// Show loading while AI generates response
interface HintState {
  isLoading: boolean
  content: string | null
  error: string | null
}
```

### 5. Configuration & Feature Flags

#### A. Environment Variables
```bash
# .env.local
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_ENABLE_AI_AGENTS=true
NEXT_PUBLIC_AI_FALLBACK_TO_MOCK=true
```

#### B. Feature Flag Integration
```typescript
// Use existing feature flag system
const useRealAI = isFeatureEnabled('USE_AI_AGENTS') && process.env.GROQ_API_KEY

if (useRealAI) {
  return await generateAIHint(context)
} else {
  return getMockHint(context)
}
```

### 6. Testing Strategy

#### A. API Testing
- Test with various transcript segments
- Validate JSON response format
- Test error handling and timeouts

#### B. Integration Testing
- Test hint generation at different video timestamps
- Verify quiz questions match transcript content
- Test fallback to mock data when AI fails

### 7. Performance Considerations

#### A. Caching
```typescript
// Cache AI responses to avoid repeated API calls
const hintCache = new Map<string, PuzzleHint>()

const getCachedHint = (videoId: string, timestamp: number) => {
  const key = `${videoId}_${Math.floor(timestamp/10)*10}` // 10-second buckets
  return hintCache.get(key)
}
```

#### B. Response Time
- Use streaming for longer responses
- Show loading states for user feedback
- Set reasonable timeouts (5-10 seconds)

## Implementation Order

1. ✅ Add Groq API key to environment
2. 🔄 Create hint generation API endpoint
3. 🔄 Create quiz generation API endpoint
4. 🔄 Update PuzzleHintAgent to use real API
5. 🔄 Update PuzzleCheckAgent to use real API
6. 🔄 Add error handling and fallbacks
7. 🔄 Test integration with video player
8. 🔄 Add caching and performance optimizations

## Expected Outcome

Agents will provide contextual, relevant hints and quizzes based on actual video content rather than generic mock data, creating a much more engaging and educational experience.