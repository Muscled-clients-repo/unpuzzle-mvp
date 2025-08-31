/**
 * BrowserDOMService
 * 
 * Browser implementation of DOM service.
 * Provides real DOM operations with cleanup tracking.
 * 
 * Phase 3.2 - DOM Service
 * Created: 2025-08-31
 */

import { IDOMService } from './IDOMService'
import { isFeatureEnabled } from '@/utils/feature-flags'

/**
 * Browser DOM Service implementation
 */
export class BrowserDOMService implements IDOMService {
  private listeners = new Map<EventTarget, Map<string, Set<{ listener: EventListener; options?: any }>>>()
  private injectedScripts = new Set<string>()
  
  constructor() {
    if (isFeatureEnabled('USE_DOM_SERVICE')) {
      console.log('🌐 BrowserDOMService: Initialized')
    }
  }
  
  // Query methods
  querySelector<T extends Element = Element>(selector: string): T | null {
    if (typeof document === 'undefined') return null
    return document.querySelector<T>(selector)
  }
  
  querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    if (typeof document === 'undefined') return [] as any
    return document.querySelectorAll<T>(selector)
  }
  
  getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    if (typeof document === 'undefined') return null
    return document.getElementById(id) as T | null
  }
  
  // Element creation
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K] {
    if (typeof document === 'undefined') {
      throw new Error('Document is not available')
    }
    return document.createElement(tagName)
  }
  
  // Body style manipulation
  setBodyStyle(property: string, value: string): void {
    if (typeof document === 'undefined') return
    document.body.style.setProperty(property, value)
  }
  
  removeBodyStyle(property: string): void {
    if (typeof document === 'undefined') return
    document.body.style.removeProperty(property)
  }
  
  // Selection API
  getSelection(): Selection | null {
    if (typeof window === 'undefined') return null
    return window.getSelection()
  }
  
  clearSelection(): void {
    const selection = this.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }
  
  // Fullscreen API
  async requestFullscreen(element: Element): Promise<void> {
    if (!element || !element.requestFullscreen) {
      console.warn('Fullscreen API not supported or element invalid')
      return
    }
    return element.requestFullscreen()
  }
  
  async exitFullscreen(): Promise<void> {
    if (typeof document === 'undefined' || !document.exitFullscreen) {
      console.warn('Fullscreen API not supported')
      return
    }
    return document.exitFullscreen()
  }
  
  isFullscreen(): boolean {
    if (typeof document === 'undefined') return false
    return !!document.fullscreenElement
  }
  
  getFullscreenElement(): Element | null {
    if (typeof document === 'undefined') return null
    return document.fullscreenElement
  }
  
  // Event management with automatic cleanup
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    // Add listener
    target.addEventListener(type, listener, options)
    
    // Track for cleanup
    if (!this.listeners.has(target)) {
      this.listeners.set(target, new Map())
    }
    const targetListeners = this.listeners.get(target)!
    
    if (!targetListeners.has(type)) {
      targetListeners.set(type, new Set())
    }
    targetListeners.get(type)!.add({ listener, options })
    
    if (isFeatureEnabled('USE_DOM_SERVICE')) {
      console.log(`🌐 Added ${type} listener to`, target)
    }
    
    // Return cleanup function
    return () => {
      target.removeEventListener(type, listener, options)
      
      // Remove from tracking
      const typeListeners = targetListeners.get(type)
      if (typeListeners) {
        typeListeners.forEach(item => {
          if (item.listener === listener) {
            typeListeners.delete(item)
          }
        })
        if (typeListeners.size === 0) {
          targetListeners.delete(type)
        }
      }
      if (targetListeners.size === 0) {
        this.listeners.delete(target)
      }
      
      if (isFeatureEnabled('USE_DOM_SERVICE')) {
        console.log(`🌐 Removed ${type} listener from`, target)
      }
    }
  }
  
  // Window/viewport
  getViewportSize(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 }
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
  
  getWindowProperty<T>(property: string): T | undefined {
    if (typeof window === 'undefined') return undefined
    return (window as any)[property]
  }
  
  // Script injection
  async injectScript(src: string, async: boolean = true): Promise<void> {
    if (typeof document === 'undefined') {
      throw new Error('Document is not available')
    }
    
    // Check if already injected
    if (this.injectedScripts.has(src)) {
      console.log(`🌐 Script already injected: ${src}`)
      return
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = async
      
      script.onload = () => {
        this.injectedScripts.add(src)
        console.log(`🌐 Script loaded: ${src}`)
        resolve()
      }
      
      script.onerror = (error) => {
        console.error(`🌐 Failed to load script: ${src}`, error)
        reject(error)
      }
      
      document.body.appendChild(script)
    })
  }
  
  // Focus management
  activeElement(): Element | null {
    if (typeof document === 'undefined') return null
    return document.activeElement
  }
  
  setFocus(element: HTMLElement): void {
    element.focus()
  }
  
  blur(): void {
    const active = this.activeElement() as HTMLElement
    if (active && active.blur) {
      active.blur()
    }
  }
  
  // Cleanup all tracked resources
  cleanup(): void {
    // Remove all event listeners
    for (const [target, targetListeners] of this.listeners) {
      for (const [type, typeListeners] of targetListeners) {
        for (const { listener, options } of typeListeners) {
          target.removeEventListener(type, listener, options)
        }
      }
    }
    this.listeners.clear()
    
    // Clear script tracking
    this.injectedScripts.clear()
    
    if (isFeatureEnabled('USE_DOM_SERVICE')) {
      console.log('🌐 BrowserDOMService: Cleaned up all resources')
    }
  }
}