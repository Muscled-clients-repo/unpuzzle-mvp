import { apiClient } from '@/lib/api-client'

export interface CourseSection {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  is_published: boolean
  media_count: number
  total_duration_minutes: number
  created_at: string
  updated_at: string
}

export interface CourseSectionsResponse {
  count: number
  results: CourseSection[]
}

export interface CreateSectionData {
  title: string
  description: string
  order: number
}

export interface UpdateSectionData {
  title?: string
  description?: string
  order?: number
  is_published?: boolean
}

export interface MediaAssignmentData {
  media_ids: string[]
  order_mapping: Record<string, number>
}

export interface MediaAssignmentResponse {
  message: string
  assigned_count: number
  section_id: string
}

class ContentManagementService {
  private baseUrl = '/api/v1/content'

  async getCourseSections(courseId: string): Promise<CourseSectionsResponse> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/courses/${courseId}/sections/`)
      
      const data = response.data as any
      if (!data) {
        throw new Error('Invalid course sections response')
      }
      
      return {
        count: data.count || 0,
        results: data.results || []
      }
    } catch (error: any) {
      console.error('Failed to fetch course sections:', error)
      throw new Error(error.response?.data?.error || 'Failed to load course sections.')
    }
  }

  async createCourseSection(courseId: string, sectionData: CreateSectionData): Promise<CourseSection> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/courses/${courseId}/sections/`, sectionData)
      
      const data = response.data as any
      if (!data?.id) {
        throw new Error('Invalid section creation response')
      }
      
      return data as CourseSection
    } catch (error: any) {
      console.error('Failed to create course section:', error)
      throw new Error(error.response?.data?.error || 'Failed to create section.')
    }
  }

  async updateCourseSection(sectionId: string, sectionData: UpdateSectionData): Promise<CourseSection> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/sections/${sectionId}/`, sectionData)
      
      const data = response.data as any
      if (!data?.id) {
        throw new Error('Invalid section update response')
      }
      
      return data as CourseSection
    } catch (error: any) {
      console.error('Failed to update course section:', error)
      throw new Error(error.response?.data?.error || 'Failed to update section.')
    }
  }

  async deleteCourseSection(sectionId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/sections/${sectionId}/`)
    } catch (error: any) {
      console.error('Failed to delete course section:', error)
      throw new Error(error.response?.data?.error || 'Failed to delete section.')
    }
  }

  async assignMediaToSection(sectionId: string, mediaData: MediaAssignmentData): Promise<MediaAssignmentResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sections/${sectionId}/media/`, mediaData)
      
      const data = response.data as any
      if (!data?.message) {
        throw new Error('Invalid media assignment response')
      }
      
      return {
        message: data.message,
        assigned_count: data.assigned_count || 0,
        section_id: sectionId
      }
    } catch (error: any) {
      console.error('Failed to assign media to section:', error)
      throw new Error(error.response?.data?.error || 'Failed to assign media.')
    }
  }

  async removeMediaFromSection(sectionId: string, mediaIds: string[]): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/sections/${sectionId}/media/`, {
        media_ids: mediaIds
      })
    } catch (error: any) {
      console.error('Failed to remove media from section:', error)
      throw new Error(error.response?.data?.error || 'Failed to remove media.')
    }
  }

  async reorderSectionMedia(sectionId: string, orderMapping: Record<string, number>): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/sections/${sectionId}/media/reorder/`, {
        order_mapping: orderMapping
      })
    } catch (error: any) {
      console.error('Failed to reorder section media:', error)
      throw new Error(error.response?.data?.error || 'Failed to reorder media.')
    }
  }
}

export const contentManagementService = new ContentManagementService()