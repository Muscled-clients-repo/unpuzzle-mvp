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
      model: "llama-3.3-70b-versatile",
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