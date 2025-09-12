import { BarChart3, Clock, Trophy, Zap } from 'lucide-react'

export function CommunityStats() {
  const stats = [
    {
      icon: Trophy,
      label: 'Active This Week',
      value: '1,247',
      subtext: 'members learning',
      color: 'text-green-600'
    },
    {
      icon: BarChart3,
      label: 'Average Learn Rate',
      value: '42 min/hr',
      subtext: 'video consumption',
      color: 'text-blue-600'
    },
    {
      icon: Zap,
      label: 'Goals Completed',
      value: '156',
      subtext: 'this month',
      color: 'text-purple-600'
    },
    {
      icon: Clock,
      label: 'New Members',
      value: '89',
      subtext: 'this week',
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="flex justify-center mb-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-gray-500">
                {stat.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}