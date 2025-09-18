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