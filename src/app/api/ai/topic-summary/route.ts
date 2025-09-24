import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "fallback-key-for-build",
})

export async function POST(request: NextRequest) {
  try {
    const { transcriptSegment, timestamp } = await request.json()

    if (!transcriptSegment) {
      return NextResponse.json({ error: 'Transcript segment is required' }, { status: 400 })
    }

    const prompt = `
Based on this video transcript segment, create a very brief topic summary in exactly 5-8 words that captures what is being discussed:

Transcript: "${transcriptSegment}"
Timestamp: ${timestamp}s

Requirements:
- Exactly 5-8 words
- Focus on the main concept being taught
- Use simple, clear language
- No articles (a, an, the) unless essential
- Examples: "React component state management", "CSS flexbox layout properties", "JavaScript array methods forEach map"

Respond with only the topic summary, nothing else.`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      max_tokens: 20,
    })

    const topicSummary = completion.choices[0]?.message?.content?.trim()

    if (!topicSummary) {
      throw new Error('No topic summary generated')
    }

    return NextResponse.json({
      success: true,
      topicSummary
    })

  } catch (error) {
    console.error('Topic summary generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate topic summary' },
      { status: 500 }
    )
  }
}