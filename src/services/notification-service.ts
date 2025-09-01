import { apiClient } from '@/lib/api-client'

export interface Notification {
  id: string
  type: 'course' | 'payment' | 'achievement' | 'system'
  title: string
  message: string
  is_read: boolean
  action_url?: string
  icon: string
  created_at: string
}

export interface NotificationResponse {
  count: number
  unread_count: number
  results: Notification[]
}

class NotificationService {
  private baseUrl = '/api/v1/notifications'

  async getUserNotifications(unreadOnly?: boolean, type?: string): Promise<NotificationResponse> {
    try {
      let endpoint = `${this.baseUrl}/`
      const params: string[] = []
      if (unreadOnly !== undefined) params.push(`unread_only=${unreadOnly}`)
      if (type) params.push(`type=${type}`)
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`
      }

      const response = await apiClient.get(endpoint)
      
      const data = response.data as any
      if (!data) {
        throw new Error('Invalid notifications response')
      }
      
      return {
        count: data.count || 0,
        unread_count: data.unread_count || 0,
        results: data.results || []
      }
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error)
      throw new Error(error.response?.data?.error || 'Failed to load notifications.')
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/${notificationId}/read/`)
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error)
      throw new Error(error.response?.data?.error || 'Failed to mark notification as read.')
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/mark-all-read/`)
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error)
      throw new Error(error.response?.data?.error || 'Failed to mark all notifications as read.')
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${notificationId}/`)
    } catch (error: any) {
      console.error('Failed to delete notification:', error)
      throw new Error(error.response?.data?.error || 'Failed to delete notification.')
    }
  }
}

export const notificationService = new NotificationService()