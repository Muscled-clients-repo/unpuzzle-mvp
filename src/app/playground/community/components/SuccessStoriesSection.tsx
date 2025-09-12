import { Calendar, DollarSign, Target, ArrowRight } from 'lucide-react'
import { mockSuccessStories } from '../mock-data/stories'

export function SuccessStoriesSection() {
  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'shopify': return '🛍️'
      case 'ai': return '🤖'
      case 'saas': return '💰'
      case 'learning': return '📚'
      default: return '🎯'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Success Stories</h3>
        <p className="text-gray-600 text-sm">
          Real wins from community members
        </p>
      </div>

      {/* Stories */}
      <div className="p-6 space-y-6">
        {mockSuccessStories.slice(0, 3).map((story) => (
          <div key={story.id} className="border-l-4 border-green-400 pl-4">
            {/* Story Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{story.memberName}</span>
                <span className="text-lg">{getGoalIcon(story.goalType)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(story.date)}
              </div>
            </div>

            {/* Achievement */}
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">{story.achievement}</span>
              {story.earnings && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="font-bold text-gray-900">{story.earnings}</span>
                  </div>
                </>
              )}
            </div>

            {/* Story Content */}
            <p className="text-gray-700 text-sm leading-relaxed">
              "{story.story}"
            </p>
          </div>
        ))}
      </div>

      {/* View All */}
      <div className="p-6 pt-0">
        <button className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium py-2 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
          View All Success Stories
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}