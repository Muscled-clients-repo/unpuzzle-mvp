// Service layer type definitions
export interface ServiceResult<T> {
  data?: T
  error?: string
  loading?: boolean
  details?: any
  upgrade_required?: boolean
  upgrade_message?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface FilterOptions {
  search?: string
  category?: string
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface ServiceOptions {
  cache?: boolean
  timeout?: number
  retries?: number
}