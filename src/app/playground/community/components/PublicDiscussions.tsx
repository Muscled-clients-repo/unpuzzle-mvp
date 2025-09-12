import { MessageCircle, Heart, Clock, ArrowRight } from 'lucide-react'
import { mockDiscussions } from '../mock-data/stories'

export function PublicDiscussions() {
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
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Community Discussions</h3>
        <p className="text-gray-600 text-sm">
          Latest conversations and member updates
        </p>
      </div>

      {/* Discussions */}
      <div className="divide-y divide-gray-100">
        {mockDiscussions.map((discussion) => (
          <div key={discussion.id} className="p-6 hover:bg-gray-50 transition-colors">
            {/* Discussion Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{discussion.author}</span>
                <span className="text-lg">{getGoalIcon(discussion.goalType)}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                  {discussion.goalType}
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                <Clock className="h-3 w-3" />
                {formatDate(discussion.date)}
              </div>
            </div>

            {/* Discussion Content */}
            <p className="text-gray-700 mb-4 leading-relaxed">
              {discussion.content}
            </p>

            {/* Engagement Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                <MessageCircle className="h-4 w-4" />
                <span>{discussion.replies} replies</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 cursor-pointer">
                <Heart className="h-4 w-4" />
                <span>{discussion.likes} likes</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <div className="p-6 pt-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium py-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
          Join the Discussion
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}