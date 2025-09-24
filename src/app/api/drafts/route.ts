import { NextRequest } from 'next/server'
import { saveDraft, getDrafts } from '@/lib/actions/draft-actions'

export async function POST(request: NextRequest) {
  try {
    const draftData = await request.json()
    const result = await saveDraft(draftData)

    if (result.success) {
      return Response.json(result, { status: 200 })
    } else {
      return Response.json(result, { status: 400 })
    }
  } catch (error) {
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'bug_report' | 'feature_request' | undefined

    const result = await getDrafts(type)

    if (result.success) {
      return Response.json(result, { status: 200 })
    } else {
      return Response.json(result, { status: 400 })
    }
  } catch (error) {
    return Response.json(
      { success: false, error: 'Internal server error', drafts: [] },
      { status: 500 }
    )
  }
}