import { DiscoveryLogger } from '@/utils/discovery-logger'

declare global {
  interface Window {
    discoveryLogger?: DiscoveryLogger
    __DISCOVERY_LOGS__?: unknown[]
  }
}

export {}