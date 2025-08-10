import { StateCreator } from 'zustand'

export interface UIState {
  // Global loading states
  isAppLoading: boolean
  
  // Modal states
  isVideoSettingsModalOpen: boolean
  isKeyboardShortcutsModalOpen: boolean
  
  // Layout states
  isLeftSidebarCollapsed: boolean
  isRightSidebarCollapsed: boolean
  
  // Notification states
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
    timestamp: Date
    read: boolean
  }>
  
  // Search and command palette
  isCommandPaletteOpen: boolean
  
  // Mobile/responsive states
  isMobileMenuOpen: boolean
}

export interface UIActions {
  // Loading actions
  setAppLoading: (isLoading: boolean) => void
  
  // Modal actions
  openVideoSettingsModal: () => void
  closeVideoSettingsModal: () => void
  openKeyboardShortcutsModal: () => void
  closeKeyboardShortcutsModal: () => void
  
  // Layout actions
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  setRightSidebarCollapsed: (collapsed: boolean) => void
  
  // Notification actions
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Command palette actions
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void
  
  // Mobile menu actions
  openMobileMenu: () => void
  closeMobileMenu: () => void
  toggleMobileMenu: () => void
}

export interface UISlice extends UIState, UIActions {}

const initialUIState: UIState = {
  isAppLoading: false,
  isVideoSettingsModalOpen: false,
  isKeyboardShortcutsModalOpen: false,
  isLeftSidebarCollapsed: false,
  isRightSidebarCollapsed: false,
  notifications: [],
  isCommandPaletteOpen: false,
  isMobileMenuOpen: false,
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  ...initialUIState,

  // Loading actions
  setAppLoading: (isLoading) => set({ isAppLoading: isLoading }),

  // Modal actions
  openVideoSettingsModal: () => set({ isVideoSettingsModalOpen: true }),
  closeVideoSettingsModal: () => set({ isVideoSettingsModalOpen: false }),
  openKeyboardShortcutsModal: () => set({ isKeyboardShortcutsModalOpen: true }),
  closeKeyboardShortcutsModal: () => set({ isKeyboardShortcutsModalOpen: false }),

  // Layout actions
  toggleLeftSidebar: () => set((state) => ({ isLeftSidebarCollapsed: !state.isLeftSidebarCollapsed })),
  toggleRightSidebar: () => set((state) => ({ isRightSidebarCollapsed: !state.isRightSidebarCollapsed })),
  setLeftSidebarCollapsed: (collapsed) => set({ isLeftSidebarCollapsed: collapsed }),
  setRightSidebarCollapsed: (collapsed) => set({ isRightSidebarCollapsed: collapsed }),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          read: false,
        },
      ],
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // Command palette actions
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // Mobile menu actions
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
})