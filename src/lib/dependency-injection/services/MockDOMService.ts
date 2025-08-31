/**
 * MockDOMService
 * 
 * Mock implementation of DOM service for testing.
 * No real DOM required.
 * 
 * Phase 3.2 - DOM Service
 * Created: 2025-08-31
 */

import { IDOMService } from './IDOMService'

/**
 * Mock DOM Service for testing
 */
export class MockDOMService implements IDOMService {
  private elements = new Map<string, any>()
  private styles = new Map<string, string>()
  private selection: Selection | null = null
  private fullscreenEl: Element | null = null
  private focusedElement: Element | null = null
  private scripts = new Set<string>()
  private listeners = new Map<string, Set<EventListener>>()
  
  // Query methods
  querySelector<T extends Element = Element>(selector: string): T | null {
    return this.elements.get(selector) || null
  }
  
  querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    const element = this.elements.get(selector)
    return (element ? [element] : []) as any
  }
  
  getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return this.elements.get(`#${id}`) || null
  }
  
  // Element creation
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K] {
    return { tagName, style: {} } as any
  }
  
  // Body style manipulation
  setBodyStyle(property: string, value: string): void {
    this.styles.set(property, value)
  }
  
  removeBodyStyle(property: string): void {
    this.styles.delete(property)
  }
  
  // Selection API
  getSelection(): Selection | null {
    return this.selection
  }
  
  clearSelection(): void {
    this.selection = null
  }
  
  // Fullscreen API
  async requestFullscreen(element: Element): Promise<void> {
    this.fullscreenEl = element
  }
  
  async exitFullscreen(): Promise<void> {
    this.fullscreenEl = null
  }
  
  isFullscreen(): boolean {
    return !!this.fullscreenEl
  }
  
  getFullscreenElement(): Element | null {
    return this.fullscreenEl
  }
  
  // Event management
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    const key = `${type}-${target}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    
    // Return cleanup function
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }
  
  // Window/viewport
  getViewportSize(): { width: number; height: number } {
    return { width: 1920, height: 1080 } // Mock desktop size
  }
  
  getWindowProperty<T>(property: string): T | undefined {
    // Return mock values for common properties
    const mockWindow: any = {
      innerWidth: 1920,
      innerHeight: 1080,
      location: { href: 'http://localhost:3000' }
    }
    return mockWindow[property]
  }
  
  // Script injection
  async injectScript(src: string, async?: boolean): Promise<void> {
    this.scripts.add(src)
    // Simulate successful load
    return Promise.resolve()
  }
  
  // Focus management
  activeElement(): Element | null {
    return this.focusedElement
  }
  
  setFocus(element: HTMLElement): void {
    this.focusedElement = element
  }
  
  blur(): void {
    this.focusedElement = null
  }
  
  // Cleanup
  cleanup(): void {
    this.elements.clear()
    this.styles.clear()
    this.selection = null
    this.fullscreenEl = null
    this.focusedElement = null
    this.scripts.clear()
    this.listeners.clear()
  }
  
  // Test helpers
  setMockElement(selector: string, element: any): void {
    this.elements.set(selector, element)
  }
  
  getMockStyles(): Map<string, string> {
    return this.styles
  }
  
  getInjectedScripts(): Set<string> {
    return this.scripts
  }
}