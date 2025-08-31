/**
 * IDOMService
 * 
 * Interface for DOM operations abstraction.
 * Allows for browser and mock implementations.
 * 
 * Phase 3.2 - DOM Service
 * Created: 2025-08-31
 */

/**
 * DOM Service interface - abstracts all DOM operations
 */
export interface IDOMService {
  // Query methods
  querySelector<T extends Element = Element>(selector: string): T | null
  querySelectorAll<T extends Element = Element>(selector: string): NodeListOf<T>
  getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null
  
  // Element creation
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K]
  
  // Body style manipulation
  setBodyStyle(property: string, value: string): void
  removeBodyStyle(property: string): void
  
  // Selection API
  getSelection(): Selection | null
  clearSelection(): void
  
  // Fullscreen API
  requestFullscreen(element: Element): Promise<void>
  exitFullscreen(): Promise<void>
  isFullscreen(): boolean
  getFullscreenElement(): Element | null
  
  // Event management with automatic cleanup
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): () => void // Returns cleanup function
  
  // Window/viewport
  getViewportSize(): { width: number; height: number }
  getWindowProperty<T>(property: string): T | undefined
  
  // Script injection
  injectScript(src: string, async?: boolean): Promise<void>
  
  // Focus management
  activeElement(): Element | null
  setFocus(element: HTMLElement): void
  blur(): void
  
  // Cleanup all tracked resources
  cleanup(): void
}