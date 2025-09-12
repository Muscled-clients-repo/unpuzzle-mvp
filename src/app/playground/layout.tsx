import { ReactNode } from 'react'

interface PlaygroundLayoutProps {
  children: ReactNode
}

export default function PlaygroundLayout({ children }: PlaygroundLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Playground Header */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
              PLAYGROUND
            </div>
            <span className="text-yellow-800 text-sm">
              UI Development & Testing Environment
            </span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      {children}
    </div>
  )
}