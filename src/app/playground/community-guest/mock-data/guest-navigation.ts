export interface GuestNavigationTab {
  id: string
  label: string
  icon: any
  hidden?: boolean
}

export const guestNavigationOverrides = {
  hiddenTabs: ['affiliates']  // Tabs to hide for guests
}