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
      stream: true,
    })

    // Create a readable stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = ''

        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            fullContent += content

            // Send each chunk as it arrives
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'chunk',
                content,
                fullContent
              })}\n\n`)
            )
          }

          // Process the complete response
          // Extract JSON from potential markdown code blocks
          let rawContent = fullContent

          // Remove markdown code blocks if present
          const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
          if (jsonMatch) {
            rawContent = jsonMatch[1]
          }

          // Clean up any extra whitespace and newlines
          rawContent = rawContent.trim()

          const result = JSON.parse(rawContent)

          // Send the final parsed result
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              quiz: {
                id: `quiz_${Date.now()}`,
                question: result.question,
                options: result.options,
                correctAnswer: result.correctAnswer,
                explanation: result.explanation
              },
              timestamp,
              videoId
            })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Quiz streaming error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to generate quiz'
            })}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}