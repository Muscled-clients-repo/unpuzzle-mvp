import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createAIConversation } from '@/app/actions/video-ai-conversations-actions'

// Initialize Groq client with fallback for build time
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || 'fallback-key-for-build',
})

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available at runtime
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
    if (!apiKey || apiKey === 'fallback-key-for-build') {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const {
      videoId,
      userMessage,
      videoSummary,
      selectedTranscript,
      chatHistory,
      currentTimestamp
    } = await request.json()

    // Build context with weighted importance
    const buildContext = () => {
      let context = ""

      // 1. Video Summary (broad context)
      if (videoSummary) {
        context += `FULL VIDEO SUMMARY (${videoSummary.summaryLength}):\n${videoSummary.content}\n\n`
        if (videoSummary.keyTopics?.length > 0) {
          context += `Key Topics: ${videoSummary.keyTopics.join(', ')}\n\n`
        }
      }

      // 2. Selected Transcript (HIGH PRIORITY - most relevant to user's question)
      if (selectedTranscript?.text) {
        context += `🎯 CURRENT FOCUS SEGMENT (${selectedTranscript.startTime}s - ${selectedTranscript.endTime}s):\n`
        context += `"${selectedTranscript.text}"\n\n`
        context += `This segment is what the user is currently focusing on and likely asking about.\n\n`
      }

      // 3. Recent Chat History (for conversation continuity)
      if (chatHistory?.length > 0) {
        context += `RECENT CONVERSATION:\n`
        chatHistory.slice(-6).forEach((msg: any) => {
          context += `${msg.type === 'user' ? 'Student' : 'Assistant'}: ${msg.message}\n`
        })
        context += `\n`
      }

      return context
    }

    const contextInfo = buildContext()

    const prompt = `
You are an AI learning assistant helping a student understand video content.

${contextInfo}

Current Video Timestamp: ${currentTimestamp}s

Student's Question: "${userMessage}"

Instructions:
1. PRIORITIZE the focus segment content when answering - it's what the student is currently looking at
2. Use the video summary for broader context and connections
3. Reference specific timestamps when helpful (e.g., "At 15:30 in the video...")
4. If the question relates to the focus segment, dive deep into that content
5. Connect concepts from the focus segment to the broader video themes
6. Be conversational and educational, like a helpful tutor
7. If you need clarification, ask specific questions about the content

Keep responses concise but thorough, focusing on helping the student learn and understand the material.
`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 800,
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

          // Save conversation to database
          try {
            const conversationData = {
              media_file_id: videoId,
              video_timestamp: currentTimestamp,
              conversation_context: selectedTranscript?.text || videoSummary?.content?.substring(0, 500) || null,
              user_message: userMessage,
              ai_response: fullContent,
              model_used: 'llama-3.3-70b-versatile'
            }

            const dbResult = await createAIConversation(conversationData)

            if (dbResult.error) {
              console.error('Failed to save conversation to database:', dbResult.error)
            } else {
              console.log('✅ Conversation saved to database:', dbResult.conversation?.id)
            }
          } catch (dbError) {
            console.error('Database save error:', dbError)
            // Don't fail the request if database save fails
          }

          // Send the final complete response
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              response: {
                id: `chat_${Date.now()}`,
                message: fullContent,
                timestamp: Date.now(),
                videoId,
                contextUsed: {
                  hasVideoSummary: !!videoSummary,
                  hasSelectedTranscript: !!selectedTranscript?.text,
                  chatHistoryLength: chatHistory?.length || 0,
                  currentTimestamp
                }
              }
            })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Chat streaming error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to generate response'
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
    console.error('Chat generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate chat response' },
      { status: 500 }
    )
  }
}