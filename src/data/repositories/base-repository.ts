// Base repository with common functionality
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export interface RepositoryOptions {
  cacheEnabled?: boolean
  defaultTTL?: number // Default cache TTL in milliseconds
  maxCacheSize?: number
}

export abstract class BaseRepository {
  protected cache = new Map<string, CacheEntry<any>>()
  protected options: RepositoryOptions

  constructor(options: RepositoryOptions = {}) {
    this.options = {
      cacheEnabled: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxCacheSize: 100,
      ...options
    }
  }

  protected getCacheKey(...parts: (string | number)[]): string {
    return parts.join(':')
  }

  protected getFromCache<T>(key: string): T | null {
    if (!this.options.cacheEnabled) return null

    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  protected setCache<T>(key: string, data: T, ttl?: number): void {
    if (!this.options.cacheEnabled) return

    // Implement simple LRU by removing oldest entries when cache is full
    if (this.cache.size >= (this.options.maxCacheSize || 100)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL || 5 * 60 * 1000
    })
  }

  protected invalidateCache(pattern?: string): void {
    if (pattern) {
      // Remove cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.cache.clear()
    }
  }

  // Helper method for simulating network delays in mock repositories
  protected async delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Data transformation helper
  protected transform<TInput, TOutput>(
    data: TInput[], 
    transformer: (item: TInput) => TOutput
  ): TOutput[] {
    return data.map(transformer)
  }

  // Data validation helper
  protected validate<T>(data: T, validator: (item: T) => boolean): boolean {
    return validator(data)
  }

  // Pagination helper
  protected paginate<T>(
    data: T[], 
    page: number = 1, 
    limit: number = 10
  ): { data: T[], total: number, page: number, totalPages: number } {
    const offset = (page - 1) * limit
    const paginatedData = data.slice(offset, offset + limit)
    
    return {
      data: paginatedData,
      total: data.length,
      page,
      totalPages: Math.ceil(data.length / limit)
    }
  }
}