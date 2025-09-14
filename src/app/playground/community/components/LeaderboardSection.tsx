import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Crown, Clock, Trophy, Target } from 'lucide-react'
import { mockLeaderboard, mockLearnRateLeaderboard } from '../mock-data/members'
import type { PlaygroundCommunity } from '../types'

type LeaderboardType = 'earnings' | 'learnRate'

interface LeaderboardSectionProps {
  earningsLeaderboard?: PlaygroundCommunity.LeaderboardEntry[]
  learnRateLeaderboard?: PlaygroundCommunity.LeaderboardEntry[]
}

export function LeaderboardSection({ 
  earningsLeaderboard = mockLeaderboard, 
  learnRateLeaderboard = mockLearnRateLeaderboard 
}: LeaderboardSectionProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('earnings')
  
  const currentLeaderboard = activeTab === 'earnings' ? earningsLeaderboard : learnRateLeaderboard

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'shopify': return '🛍️'
      case 'ai': return '🤖'
      case 'saas': return '💰'
      case 'learning': return '📚'
      default: return '🎯'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Leaderboards</h2>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'earnings'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Earnings Leaders
          </button>
          <button
            onClick={() => setActiveTab('learnRate')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'learnRate'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Learn Rate Leaders
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="p-6">
        <div className="space-y-4">
          {currentLeaderboard.map((entry, index) => (
            <div
              key={entry.student.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                index === 0 
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8">
                {index === 0 ? (
                  <Crown className="h-6 w-6 text-yellow-500" />
                ) : (
                  <span className="text-lg font-bold text-gray-600">#{entry.rank}</span>
                )}
              </div>

              {/* Member Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{entry.student.displayName}</span>
                  <span className="text-lg">{getGoalIcon(entry.student.goalType)}</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full capitalize">
                    {entry.student.goalType}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    {activeTab === 'earnings' 
                      ? `Earned: ${entry.earnings}`
                      : `Learn Rate: ${entry.student.learnRate} min/hr`
                    }
                  </span>
                  <span>•</span>
                  <span>{entry.student.achievements.length} achievements</span>
                </div>
              </div>

              {/* Position Change */}
              <div className="flex items-center gap-1">
                {getChangeIcon(entry.change)}
                {entry.change !== 0 && (
                  <span className={`text-sm font-medium ${
                    entry.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(entry.change)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="mt-6 text-center">
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            View Full Leaderboard →
          </button>
        </div>
      </div>
    </div>
  )
}