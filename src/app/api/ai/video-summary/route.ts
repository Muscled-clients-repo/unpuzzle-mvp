import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "fallback-key-for-build",
})

export async function POST(request: NextRequest) {
  try {
    const { videoId, fullTranscript, videoDuration } = await request.json()

    // Determine summary length based on video duration
    const getSummaryLength = (duration: number) => {
      if (duration <= 300) return "1-2 minute" // 5 min video -> 1-2 min summary
      if (duration <= 600) return "2-3 minute" // 10 min video -> 2-3 min summary
      if (duration <= 1200) return "3-4 minute" // 20 min video -> 3-4 min summary
      return "5-6 minute" // 30+ min video -> 5-6 min summary
    }

    const summaryLength = getSummaryLength(videoDuration)

    const prompt = `
Create a comprehensive ${summaryLength} summary of this video transcript for AI chat context.

Video Duration: ${Math.floor(videoDuration / 60)} minutes ${videoDuration % 60} seconds
Transcript: "${fullTranscript}"

Generate a structured summary that captures:
1. Main topics and key concepts discussed
2. Important details and explanations
3. Examples or demonstrations mentioned
4. Conclusions or takeaways
5. Chronological flow of information

Format as JSON:
{
  "summary": "Detailed summary covering all key points in chronological order",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "mainConcepts": ["concept1", "concept2"],
  "duration": ${videoDuration},
  "summaryLength": "${summaryLength}"
}

Requirements:
- Maintain chronological order of topics
- Include specific details that might be referenced in chat
- Preserve technical terms and important examples
- Focus on educational content and key learning points
- Make it suitable for AI chat context about the video
`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: 1500,
    })

    const fullContent = completion.choices[0]?.message?.content || ''

    // Extract JSON from potential markdown code blocks
    let rawContent = fullContent
    const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      rawContent = jsonMatch[1]
    }

    rawContent = rawContent.trim()
    const result = JSON.parse(rawContent)

    return NextResponse.json({
      success: true,
      videoId,
      summary: {
        id: `summary_${videoId}_${Date.now()}`,
        content: result.summary,
        keyTopics: result.keyTopics,
        mainConcepts: result.mainConcepts,
        duration: result.duration,
        summaryLength: result.summaryLength,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Video summary generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate video summary' },
      { status: 500 }
    )
  }
}