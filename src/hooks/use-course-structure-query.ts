import { useQuery } from '@tanstack/react-query'
import { getStudentCourseDetails } from '@/app/actions/student-course-actions-junction'

export const courseStructureKeys = {
  all: ['courseStructure'] as const,
  detail: (courseId: string) => [...courseStructureKeys.all, courseId] as const,
}

export function useCourseStructureQuery(courseId: string | null) {
  return useQuery({
    queryKey: courseStructureKeys.detail(courseId || ''),
    queryFn: async () => {
      console.log('[useCourseStructureQuery] Fetching course structure for:', courseId)
      if (!courseId) {
        console.log('[useCourseStructureQuery] No courseId provided, returning null')
        return null
      }
      const result = await getStudentCourseDetails(courseId)
      console.log('[useCourseStructureQuery] Result:', {
        hasData: !!result,
        chaptersCount: result?.chapters?.length || 0,
        chapters: result?.chapters
      })
      return result
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - structure rarely changes
  })
}
