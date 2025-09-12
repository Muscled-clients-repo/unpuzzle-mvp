import Link from 'next/link'
import { Palette, Users, BarChart3 } from 'lucide-react'

export default function PlaygroundPage() {
  const playgroundItems = [
    {
      title: 'Community Page',
      description: 'Public community with leaderboards, success stories, and discussions',
      href: '/playground/community',
      icon: Users,
      status: 'Ready'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <Palette className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">UI Playground</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Experiment with UI designs and components before implementing in production
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {playgroundItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <item.icon className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {item.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
              {item.title}
            </h3>
            
            <p className="text-gray-600 text-sm">
              {item.description}
            </p>
          </Link>
        ))}
        
        {/* Coming Soon Items */}
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-6 w-6 text-gray-400" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Coming Soon
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            Student Dashboard
          </h3>
          
          <p className="text-gray-500 text-sm">
            Personal learning dashboard with goal progress and analytics
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600">
          More playground components coming soon...
        </p>
      </div>
    </div>
  )
}