/**
 * ServiceContainer
 * 
 * Dependency injection container for managing services.
 * Minimal implementation - no React dependencies.
 * 
 * Phase 3.1 - Dependency Injection (Revised)
 * Created: 2025-08-31
 */

import { isFeatureEnabled } from '@/utils/feature-flags'

/**
 * Service factory function type
 */
type ServiceFactory<T> = (container: ServiceContainer) => T

/**
 * Service registration metadata
 */
interface ServiceRegistration<T> {
  factory: ServiceFactory<T>
  singleton: boolean
  instance?: T
}

/**
 * Available services interface (minimal set to start)
 */
export interface Services {
  videoController?: any // Will be typed later
  videoStateCoordinator?: any // Will be typed later
  stateUpdateTracker?: any // Will be typed later
  raceConditionGuard?: any // Will be typed later
  eventListenerManager?: any // Will be typed later
}

/**
 * Dependency injection container
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null
  private services = new Map<string, ServiceRegistration<any>>()
  private resolving = new Set<string>() // For circular dependency detection
  
  private constructor() {
    if (isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
      console.log('💉 ServiceContainer: Initializing dependency injection')
    }
    // Defer registration to avoid circular dependencies
    // Services will be registered on first access
  }
  
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }
  
  /**
   * Register default services - called lazily on first resolve
   */
  private ensureDefaultServicesRegistered() {
    // Only register once
    if (this.services.size > 0) {
      return
    }
    
    // Register services with lazy imports in factories
    // This avoids circular dependencies at module load time
    
    // Register VideoController
    this.register('videoController', {
      factory: () => {
        const { VideoController } = require('@/lib/video-agent-system/core/VideoController')
        return new VideoController()
      },
      singleton: true
    })
    
    // Register VideoStateCoordinator
    this.register('videoStateCoordinator', {
      factory: () => {
        const { VideoStateCoordinator } = require('@/lib/video-state/VideoStateCoordinator')
        return VideoStateCoordinator.getInstance()
      },
      singleton: true
    })
    
    // Register StateUpdateTracker
    this.register('stateUpdateTracker', {
      factory: () => {
        const { StateUpdateTracker } = require('@/lib/video-state/StateUpdateTracker')
        return StateUpdateTracker.getInstance()
      },
      singleton: true
    })
    
    // Register RaceConditionGuard
    this.register('raceConditionGuard', {
      factory: () => {
        const { RaceConditionGuard } = require('@/lib/video-state/RaceConditionGuard')
        return RaceConditionGuard.getInstance()
      },
      singleton: true
    })
    
    // Register EventListenerManager
    this.register('eventListenerManager', {
      factory: () => {
        const { EventListenerManager } = require('@/utils/event-listener-manager')
        return EventListenerManager.getInstance()
      },
      singleton: true
    })
    
    if (isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
      console.log('💉 Default services registered:', Array.from(this.services.keys()))
    }
  }
  
  /**
   * Register a service
   */
  register<K extends keyof Services>(
    name: K,
    registration: Omit<ServiceRegistration<Services[K]>, 'instance'>
  ): void {
    if (this.services.has(name)) {
      console.warn(`💉 Service ${name} already registered, overwriting`)
    }
    
    this.services.set(name, registration as ServiceRegistration<any>)
    
    if (isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
      console.log(`💉 Service registered: ${name}`)
    }
  }
  
  /**
   * Resolve a service
   */
  resolve<K extends keyof Services>(name: K): Services[K] {
    // Ensure default services are registered on first use
    this.ensureDefaultServicesRegistered()
    
    // Check for circular dependency
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`)
    }
    
    const registration = this.services.get(name)
    
    if (!registration) {
      throw new Error(`Service not registered: ${name}`)
    }
    
    // Return existing instance if singleton
    if (registration.singleton && registration.instance) {
      return registration.instance
    }
    
    try {
      // Mark as resolving
      this.resolving.add(name)
      
      // Create new instance
      const instance = registration.factory(this)
      
      // Store if singleton
      if (registration.singleton) {
        registration.instance = instance
      }
      
      if (isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
        console.log(`💉 Service resolved: ${name}`)
      }
      
      return instance
    } finally {
      // Clear resolving flag
      this.resolving.delete(name)
    }
  }
  
  /**
   * Check if a service is registered
   */
  has(name: keyof Services): boolean {
    return this.services.has(name)
  }
  
  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }
  
  /**
   * Get statistics for debugging
   */
  getStats() {
    const stats = {
      totalServices: this.services.size,
      singletons: 0,
      instances: 0,
      services: [] as any[]
    }
    
    for (const [name, registration] of this.services) {
      if (registration.singleton) stats.singletons++
      if (registration.instance) stats.instances++
      
      stats.services.push({
        name,
        singleton: registration.singleton,
        hasInstance: !!registration.instance
      })
    }
    
    return stats
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance()

/**
 * Get a service with feature flag check and fallback
 * This is NOT a React hook - can be called conditionally
 */
export function getService<K extends keyof Services>(name: K): Services[K] | null {
  if (!isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
    // Return null when DI is disabled - caller must handle fallback
    return null
  }
  
  try {
    return serviceContainer.resolve(name)
  } catch (error) {
    console.error(`💉 Failed to resolve service ${name}:`, error)
    return null
  }
}

// Make available in browser console for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__SERVICE_CONTAINER__ = serviceContainer
}