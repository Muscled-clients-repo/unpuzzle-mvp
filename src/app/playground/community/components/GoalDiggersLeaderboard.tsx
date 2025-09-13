'use client'

import React, { useState } from 'react'
import { Trophy, Target, TrendingUp, Clock, Crown, Medal, Award, Star } from 'lucide-react'

interface GoalDigger {
  id: string
  name: string
  currentGoal: string
  targetAmount: string
  progress: number
  learnRate: number // mins/hr
  executionRate: number // percentage
  ranking: number
  daysActive: number
  completedGoals: number
  totalActions: number
  amountEarned: number // in dollars
  badge?: 'top-performer' | 'consistent' | 'fast-learner' | 'goal-crusher'
}

interface GoalDiggersLeaderboardProps {
  userRole: 'guest' | 'member' | 'instructor'
}

export function GoalDiggersLeaderboard({ userRole }: GoalDiggersLeaderboardProps) {
  const [sortBy, setSortBy] = useState('ranking')
  const [filterBy, setFilterBy] = useState('all')

  const isRestricted = userRole === 'guest'

  // Mock data - replace with real data
  const mockGoalDiggers: GoalDigger[] = [
    {
      id: '1',
      name: 'Sarah M.',
      currentGoal: 'Goal: $5K Shopify Agency',
      targetAmount: '$5K',
      progress: 87,
      learnRate: 45,
      executionRate: 96,
      ranking: 1,
      daysActive: 67,
      completedGoals: 2,
      totalActions: 134,
      amountEarned: 4350,
      badge: 'top-performer'
    },
    {
      id: '2',
      name: 'John D.',
      currentGoal: 'Goal: $5K Shopify Agency',
      targetAmount: '$5K',
      progress: 75,
      learnRate: 42,
      executionRate: 94,
      ranking: 2,
      daysActive: 90,
      completedGoals: 3,
      totalActions: 167,
      amountEarned: 3750,
      badge: 'goal-crusher'
    },
    {
      id: '3',
      name: 'Mike R.',
      currentGoal: 'Goal: $3K Shopify Agency',
      targetAmount: '$3K',
      progress: 92,
      learnRate: 38,
      executionRate: 91,
      ranking: 3,
      daysActive: 45,
      completedGoals: 1,
      totalActions: 89,
      amountEarned: 2760,
      badge: 'fast-learner'
    },
    {
      id: '4',
      name: 'Lisa K.',
      currentGoal: 'Goal: $10K SaaS MVP',
      targetAmount: '$10K',
      progress: 68,
      learnRate: 41,
      executionRate: 89,
      ranking: 4,
      daysActive: 123,
      completedGoals: 4,
      totalActions: 201,
      amountEarned: 6800,
      badge: 'consistent'
    },
    {
      id: '5',
      name: 'Alex T.',
      currentGoal: 'Goal: $2K Shopify Agency',
      targetAmount: '$2K',
      progress: 83,
      learnRate: 35,
      executionRate: 87,
      ranking: 5,
      daysActive: 34,
      completedGoals: 0,
      totalActions: 56,
      amountEarned: 1660
    },
    {
      id: '6',
      name: 'Jenny L.',
      currentGoal: 'Goal: $8K SaaS MVP',
      targetAmount: '$8K',
      progress: 71,
      learnRate: 39,
      executionRate: 85,
      ranking: 6,
      daysActive: 78,
      completedGoals: 2,
      totalActions: 112,
      amountEarned: 5680
    },
    {
      id: '7',
      name: 'Tom W.',
      currentGoal: 'Goal: $3K Shopify Agency',
      targetAmount: '$3K',
      progress: 59,
      learnRate: 33,
      executionRate: 82,
      ranking: 7,
      daysActive: 56,
      completedGoals: 1,
      totalActions: 78,
      amountEarned: 1770
    },
    {
      id: '8',
      name: 'Emma S.',
      currentGoal: 'Goal: $15K SaaS MVP',
      targetAmount: '$15K',
      progress: 44,
      learnRate: 31,
      executionRate: 79,
      ranking: 8,
      daysActive: 89,
      completedGoals: 3,
      totalActions: 145,
      amountEarned: 6600
    }
  ]

  const sortedDiggers = [...mockGoalDiggers].sort((a, b) => {
    switch (sortBy) {
      case 'learnRate':
        return b.learnRate - a.learnRate
      case 'amountEarned':
        return b.amountEarned - a.amountEarned
      case 'totalActions':
        return b.totalActions - a.totalActions
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return a.ranking - b.ranking
    }
  })

  const filteredDiggers = sortedDiggers.filter(digger => {
    if (filterBy === 'all') return true
    if (filterBy === 'agency') return digger.currentGoal.includes('Shopify Agency')
    if (filterBy === 'saas') return digger.currentGoal.includes('SaaS')
    if (filterBy === 'top-10') return digger.ranking <= 10
    return true
  })

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'top-performer':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'goal-crusher':
        return <Trophy className="h-4 w-4 text-orange-500" />
      case 'fast-learner':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'consistent':
        return <Star className="h-4 w-4 text-purple-500" />
      default:
        return null
    }
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'top-performer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'goal-crusher':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'fast-learner':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'consistent':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRankingIcon = (ranking: number) => {
    if (ranking === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (ranking === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (ranking === 3) return <Award className="h-5 w-5 text-orange-500" />
    return <span className="text-sm font-bold text-gray-600">#{ranking}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <Trophy className="h-7 w-7 text-yellow-500" />
          Goal Diggers Leaderboard
        </h2>
        <p className="text-gray-600">
          {isRestricted 
            ? 'See how our top members are crushing their goals'
            : 'Compete with fellow entrepreneurs on their goal journey'
          }
        </p>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-3">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Goals</option>
            <option value="agency">Agency Track</option>
            <option value="saas">SaaS Track</option>
            <option value="top-10">Top 10</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="ranking">Overall Ranking</option>
            <option value="amountEarned">Amount Earned</option>
            <option value="totalActions">Actions Taken</option>
            <option value="learnRate">Learn Rate</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filteredDiggers.length} Goal Diggers
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Earned</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions Taken</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learn Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDiggers.map((digger, index) => (
                <tr
                  key={digger.id}
                  className={`${
                    digger.ranking <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                >
                  {/* Rank */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center w-8">
                      {getRankingIcon(digger.ranking)}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {digger.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {isRestricted ? `Member ${String.fromCharCode(65 + index)}` : digger.name}
                        </div>
                        {digger.badge && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(digger.badge)}`}>
                            {getBadgeIcon(digger.badge)}
                            {digger.badge.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Amount Earned */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600">
                      ${isRestricted ? Math.floor(digger.amountEarned * 0.8) : digger.amountEarned.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isRestricted ? `${digger.targetAmount} goal` : digger.currentGoal.replace('Goal: ', '')}
                    </div>
                  </td>

                  {/* Actions Taken */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {digger.totalActions}
                    </div>
                    <div className="text-xs text-gray-500">
                      {digger.completedGoals} goals done
                    </div>
                  </td>

                  {/* Learn Rate */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">
                      {digger.learnRate} mins/hr
                    </div>
                    <div className="text-xs text-gray-500">
                      {digger.daysActive} days active
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call to Action for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 text-center mt-8">
          <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Join the Goal Diggers</h3>
          <p className="text-gray-600 mb-4">
            Compete with top entrepreneurs and track your progress on the leaderboard.
          </p>
          <button className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
            Start Your Goal Journey - $97/month
          </button>
        </div>
      )}
    </div>
  )
}