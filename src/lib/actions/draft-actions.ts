'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DraftData {
  id?: string
  type: 'bug_report' | 'feature_request' | 'daily_note' | 'instructor_response'
  title?: string
  description?: string
  metadata?: any
}

export async function saveDraft(draftData: DraftData) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const draftPayload = {
      user_id: user.id,
      type: draftData.type,
      title: draftData.title || '',
      description: draftData.description || '',
      metadata: draftData.metadata || {}
    }

    let result
    if (draftData.id) {
      // Update existing draft
      result = await supabase
        .from('drafts')
        .update(draftPayload)
        .eq('id', draftData.id)
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Create new draft
      result = await supabase
        .from('drafts')
        .insert(draftPayload)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving draft:', result.error)
      throw new Error(`Failed to save draft: ${result.error.message}`)
    }

    return {
      success: true,
      draft: result.data,
      message: draftData.id ? 'Draft updated successfully' : 'Draft saved successfully'
    }
  } catch (error: any) {
    console.error('Error in saveDraft:', error)
    return {
      success: false,
      error: error.message || 'Failed to save draft'
    }
  }
}

export async function getDrafts(type?: 'bug_report' | 'feature_request' | 'daily_note' | 'instructor_response') {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    let query = supabase
      .from('drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: drafts, error } = await query

    if (error) {
      console.error('Error fetching drafts:', error)
      throw new Error(`Failed to fetch drafts: ${error.message}`)
    }

    return {
      success: true,
      drafts: drafts || []
    }
  } catch (error: any) {
    console.error('Error in getDrafts:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch drafts',
      drafts: []
    }
  }
}

export async function deleteDraft(draftId: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting draft:', error)
      throw new Error(`Failed to delete draft: ${error.message}`)
    }

    return {
      success: true,
      message: 'Draft deleted successfully'
    }
  } catch (error: any) {
    console.error('Error in deleteDraft:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete draft'
    }
  }
}

export async function getDraftById(draftId: string) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching draft:', error)
      throw new Error(`Failed to fetch draft: ${error.message}`)
    }

    return {
      success: true,
      draft
    }
  } catch (error: any) {
    console.error('Error in getDraftById:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch draft',
      draft: null
    }
  }
}