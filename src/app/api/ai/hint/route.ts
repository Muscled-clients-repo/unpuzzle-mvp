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
              hint: result.hint,
              context: result.context,
              relatedConcepts: result.relatedConcepts || [],
              timestamp,
              videoId
            })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Hint streaming error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to generate hint'
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
    console.error('Hint generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    )
  }
}