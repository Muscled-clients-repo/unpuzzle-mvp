// JavaScript Parameter Type Debugging
// Add this logging to your batchLinkMediaToChapterAction function

export async function batchLinkMediaToChapterAction(
  mediaIds: string[],
  chapterId: string,
  courseId: string
): Promise<ActionResult<any[]>> {
  
  // === DEBUG LOGGING START ===
  console.log('🔍 [DEBUG] Parameter Analysis:', {
    mediaIds: {
      value: mediaIds,
      type: typeof mediaIds,
      isArray: Array.isArray(mediaIds),
      length: mediaIds?.length,
      elementTypes: mediaIds?.map((id, i) => `[${i}]: ${typeof id} = "${id}"`),
      elementSample: mediaIds?.[0]
    },
    chapterId: {
      value: chapterId,
      type: typeof chapterId,
      length: chapterId?.length,
      isUuidFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chapterId)
    },
    courseId: {
      value: courseId,
      type: typeof courseId,  
      length: courseId?.length,
      isUuidFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)
    }
  });

  // Check if any parameters are null/undefined
  const nullChecks = {
    mediaIdsNull: mediaIds === null || mediaIds === undefined,
    chapterIdNull: chapterId === null || chapterId === undefined,
    courseIdNull: courseId === null || courseId === undefined
  };
  
  if (Object.values(nullChecks).some(isNull => isNull)) {
    console.error('🚨 [DEBUG] Null/undefined parameters detected:', nullChecks);
  }

  // Validate UUID formats
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  const validationErrors = [];
  if (!uuidRegex.test(chapterId)) {
    validationErrors.push(`Invalid chapterId format: ${chapterId}`);
  }
  if (!uuidRegex.test(courseId)) {
    validationErrors.push(`Invalid courseId format: ${courseId}`);  
  }
  mediaIds?.forEach((id, index) => {
    if (!uuidRegex.test(id)) {
      validationErrors.push(`Invalid mediaId[${index}] format: ${id}`);
    }
  });
  
  if (validationErrors.length > 0) {
    console.error('🚨 [DEBUG] UUID format validation errors:', validationErrors);
  }
  
  console.log('🔍 [DEBUG] Calling Supabase RPC with processed parameters...');
  // === DEBUG LOGGING END ===

  // ... rest of your existing function
  
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // ... existing validation code ...
    
    // === ADDITIONAL DEBUG: Log the exact RPC call ===
    console.log('🔍 [DEBUG] Supabase RPC Call:', {
      functionName: 'link_multiple_media_to_chapter',
      parameters: {
        p_media_ids: mediaIds,
        p_chapter_id: chapterId,
        p_course_id: courseId
      },
      parameterTypes: {
        p_media_ids: `Array[${mediaIds.length}] of ${typeof mediaIds[0]}`,
        p_chapter_id: typeof chapterId,
        p_course_id: typeof courseId
      }
    });
    
    // Use existing PostgreSQL batch function for atomic operation
    const { data: linkedVideos, error: batchError } = await supabase
      .rpc('link_multiple_media_to_chapter', {
        p_media_ids: mediaIds,
        p_chapter_id: chapterId,
        p_course_id: courseId
      })
    
    // === DEBUG: Log the response ===
    console.log('🔍 [DEBUG] Supabase RPC Response:', {
      success: !batchError,
      dataCount: linkedVideos?.length || 0,
      error: batchError
    });
    
    if (batchError) {
      console.error('🚨 [DEBUG] Detailed Batch Error Analysis:', {
        errorCode: batchError.code,
        errorMessage: batchError.message,
        errorDetails: batchError.details,
        errorHint: batchError.hint,
        fullError: batchError
      });
      
      console.error('Batch linking error:', batchError)
      throw new Error(batchError.message || 'Failed to batch link media files')
    }
    
    // ... rest of existing function ...
    
  } catch (error) {
    console.error('🚨 [DEBUG] Catch block error:', error);
    throw error;
  }
}