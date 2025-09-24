import { NextRequest } from 'next/server'
import { getDraftById, deleteDraft } from '@/lib/actions/draft-actions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getDraftById(params.id)

    if (result.success) {
      return Response.json(result, { status: 200 })
    } else {
      return Response.json(result, { status: 404 })
    }
  } catch (error) {
    return Response.json(
      { success: false, error: 'Internal server error', draft: null },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await deleteDraft(params.id)

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