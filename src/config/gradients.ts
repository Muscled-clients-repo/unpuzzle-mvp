/**
 * Shared Gradient Configuration
 * Used for consistent branding across courses, blogs, and generated images
 * Same title = same gradient color everywhere
 */

export interface GradientConfig {
  tailwind: string  // Tailwind CSS classes for client-side rendering
  colors: {
    start: string   // Hex color for Canvas/server-side rendering
    middle: string
    end: string
  }
}

/**
 * Blue-only gradients using Unpuzzle brand color (#1BABF2)
 * 12 variations: light→dark blue, subtle and professional
 * Matches modern blog aesthetics (Vercel, Stripe, etc.)
 */
export const GRADIENTS: GradientConfig[] = [
  {
    // Sky blue → ocean blue
    tailwind: 'from-sky-400 via-blue-500 to-blue-600',
    colors: { start: '#38bdf8', middle: '#3b82f6', end: '#2563eb' }
  },
  {
    // Cyan → blue (brand color based)
    tailwind: 'from-cyan-400 via-sky-500 to-blue-600',
    colors: { start: '#22d3ee', middle: '#0ea5e9', end: '#2563eb' }
  },
  {
    // Light blue → navy
    tailwind: 'from-blue-300 via-blue-500 to-blue-700',
    colors: { start: '#93c5fd', middle: '#3b82f6', end: '#1d4ed8' }
  },
  {
    // Bright cyan → deep blue (brand color)
    tailwind: 'from-cyan-300 via-cyan-500 to-blue-600',
    colors: { start: '#67e8f9', middle: '#06b6d4', end: '#2563eb' }
  },
  {
    // Sky → indigo
    tailwind: 'from-sky-400 via-blue-600 to-indigo-600',
    colors: { start: '#38bdf8', middle: '#2563eb', end: '#4f46e5' }
  },
  {
    // Pale blue → ocean
    tailwind: 'from-blue-200 via-blue-400 to-blue-600',
    colors: { start: '#bfdbfe', middle: '#60a5fa', end: '#2563eb' }
  },
  {
    // Cyan → navy (brand to dark)
    tailwind: 'from-cyan-400 via-blue-600 to-blue-800',
    colors: { start: '#22d3ee', middle: '#2563eb', end: '#1e3a8a' }
  },
  {
    // Sky → royal blue
    tailwind: 'from-sky-300 via-blue-500 to-blue-700',
    colors: { start: '#7dd3fc', middle: '#3b82f6', end: '#1d4ed8' }
  },
  {
    // Bright sky → deep ocean
    tailwind: 'from-sky-500 via-blue-600 to-indigo-700',
    colors: { start: '#0ea5e9', middle: '#2563eb', end: '#4338ca' }
  },
  {
    // Light cyan → dark blue
    tailwind: 'from-cyan-300 via-blue-500 to-indigo-600',
    colors: { start: '#67e8f9', middle: '#3b82f6', end: '#4f46e5' }
  },
  {
    // Brand color focus (light → brand → dark)
    tailwind: 'from-sky-300 via-cyan-400 to-blue-600',
    colors: { start: '#7dd3fc', middle: '#1BABF2', end: '#2563eb' }
  },
  {
    // Deep blue tones
    tailwind: 'from-blue-400 via-blue-600 to-indigo-700',
    colors: { start: '#60a5fa', middle: '#2563eb', end: '#4338ca' }
  }
]

/**
 * Hash function to consistently assign gradients based on title
 * Same title always gets the same gradient across all uses
 */
export function getGradientFromTitle(title: string): GradientConfig {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % GRADIENTS.length
  return GRADIENTS[index]
}

/**
 * Get Tailwind CSS classes for client-side rendering
 */
export function getGradientTailwind(title: string): string {
  return getGradientFromTitle(title).tailwind
}

/**
 * Get hex colors for server-side Canvas rendering
 */
export function getGradientColors(title: string): { start: string; middle: string; end: string } {
  return getGradientFromTitle(title).colors
}
