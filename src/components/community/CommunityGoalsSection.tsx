'use client'

import React, { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { getStudentActivitiesByGoal, type GoalActivities } from '@/lib/actions/activity-timeline-actions'
import { getFeaturedStudents, type FeaturedStudent } from '@/lib/actions/featured-students-actions'
import { StatsCardsSkeleton, GoalTimelineSkeleton } from '@/components/common/universal-skeleton'
import { formatTimeAgo, formatTimestamp } from '@/lib/utils/time-ago'

interface CommunityGoalsSectionProps {
  userRole: 'guest' | 'student' | 'instructor'
}

export function CommunityGoalsSection({
  userRole
}: CommunityGoalsSectionProps) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [goalActivitiesData, setGoalActivitiesData] = useState<GoalActivities[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Featured students state
  const [featuredStudents, setFeaturedStudents] = useState<FeaturedStudent[]>([])
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0)
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  // Cache activities per student to avoid refetching on tab switch
  const [activitiesCache, setActivitiesCache] = useState<Record<string, GoalActivities[]>>({})

  // LAZY LOADING: Fetch featured students list + Student 1's data only
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingFeatured(true)
        setLoading(true)

        // STEP 1: Fetch featured students list
        const studentsResult = await getFeaturedStudents()

        if (studentsResult.error) {
          console.error('Error fetching featured students:', studentsResult.error)
          setFeaturedStudents([])
          setLoadingFeatured(false)
          setLoading(false)
          return
        }

        const students = studentsResult.data || []
        setFeaturedStudents(students)
        setLoadingFeatured(false)

        // STEP 2: Fetch only Student 1's data (lazy load others on click)
        if (students.length > 0) {
          const firstStudentResult = await getStudentActivitiesByGoal({ studentId: students[0].id })

          if (firstStudentResult.error) {
            console.error('Error fetching activities:', firstStudentResult.error)
            setError(firstStudentResult.error)
            setLoading(false)
            return
          }

          // Cache first student's data
          const newCache: Record<string, GoalActivities[]> = {
            [students[0].id]: firstStudentResult.data || []
          }
          setActivitiesCache(newCache)
          setGoalActivitiesData(firstStudentResult.data || [])
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setFeaturedStudents([])
        setLoadingFeatured(false)
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // LAZY LOADING: Fetch data when switching tabs (if not cached)
  useEffect(() => {
    const fetchStudentData = async () => {
      if (loadingFeatured || featuredStudents.length === 0) return

      const targetStudent = featuredStudents[selectedStudentIndex]
      if (!targetStudent) return

      // If already cached, use it
      if (activitiesCache[targetStudent.id]) {
        setGoalActivitiesData(activitiesCache[targetStudent.id])
        return
      }

      // Not cached, fetch it
      setLoading(true)
      const result = await getStudentActivitiesByGoal({ studentId: targetStudent.id })

      if (result.error) {
        console.error('Error fetching student activities:', result.error)
        setError(result.error)
        setLoading(false)
        return
      }

      // Cache the result
      setActivitiesCache(prev => ({
        ...prev,
        [targetStudent.id]: result.data || []
      }))
      setGoalActivitiesData(result.data || [])
      setLoading(false)
    }

    fetchStudentData()
  }, [selectedStudentIndex, featuredStudents, loadingFeatured])

  const isRestricted = userRole === 'guest'

  // Transform real goal data to display format
  const transformedRealGoals = goalActivitiesData.map(goal => ({
    id: goal.goal_id,
    title: `Goal: ${goal.goal_name}`,
    status: goal.goal_achieved_at ? 'completed' as const : 'active' as const,
    startDate: goal.goal_started_at || new Date().toISOString(),
    completedDate: goal.goal_achieved_at || undefined,
    actions: goal.activities.map(activity => {
      // For quiz and reflection activities, show video title + timestamp
      const shouldShowVideoContext = ['quiz', 'loom', 'voice', 'text', 'screenshot'].includes(activity.activity_type)

      let details = ''
      if (shouldShowVideoContext && activity.video_title) {
        const timestamp = formatTimestamp(activity.timestamp_seconds)
        details = `${activity.video_title} at ${timestamp}`
      } else {
        details = activity.video_title || ''
      }

      return {
        id: activity.id,
        type: activity.activity_type,
        title: activity.goal_title || activity.activity_type,
        date: activity.created_at,
        details
      }
    })
  }))

  // Sort goals reverse chronologically (most recent first)
  const allGoalsChronological = transformedRealGoals.sort((a, b) => {
    const aDate = a.completedDate || a.startDate
    const bDate = b.completedDate || b.startDate
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  // Calculate real stats from goal activities data
  const totalActivities = goalActivitiesData.reduce((sum, goal) => sum + goal.total_activities, 0)
  const completedGoalsCount = goalActivitiesData.filter(g => g.goal_achieved_at).length
  const reflectionsCount = goalActivitiesData.reduce((sum, goal) => sum + goal.reflections_count, 0)
  const quizzesCount = goalActivitiesData.reduce((sum, goal) => sum + goal.quizzes_count, 0)

  // Get current student name
  const currentStudentName = featuredStudents[selectedStudentIndex]?.full_name || 'Student'

  return (
    <div className="space-y-8">
      {/* Featured Students Tabs */}
      {featuredStudents.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Featured Student Journeys</h2>
          <p className="text-gray-600 text-center">
            See how our students achieve their goals step by step
          </p>

          {/* Horizontal Student Tabs */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featuredStudents.map((student, index) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentIndex(index)}
                className={`flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 transition-all min-w-[200px] ${
                  selectedStudentIndex === index
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                  selectedStudentIndex === index ? 'bg-gray-900' : 'bg-gray-400'
                }`}>
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    student.full_name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name */}
                <div className="text-center">
                  <div className={`font-semibold ${selectedStudentIndex === index ? 'text-gray-900' : 'text-gray-700'}`}>
                    {student.full_name}
                  </div>
                  {student.goal_title && (
                    <div className="text-xs text-gray-500 mt-1">
                      Goal: {student.goal_title}
                    </div>
                  )}
                </div>

                {/* Active indicator */}
                {selectedStudentIndex === index && (
                  <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {featuredStudents.length > 0
            ? `${currentStudentName}'s Goal Journey`
            : 'Featured Student Journeys'}
        </h2>
        <p className="text-gray-600">
          Complete timeline of goals and milestones achieved
        </p>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <StatsCardsSkeleton count={4} />
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Activities</div>
            <div className="text-xl font-medium text-gray-900">
              {totalActivities}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Reflections</div>
            <div className="text-xl font-medium text-gray-900">
              {reflectionsCount}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Quizzes</div>
            <div className="text-xl font-medium text-gray-900">
              {quizzesCount}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Goals Completed</div>
            <div className="text-xl font-medium text-gray-900">
              {completedGoalsCount}
            </div>
          </div>
        </div>
      )}

      {/* Goal Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="font-semibold text-gray-900">Goal Timeline</h3>
          {!loading && (
            <span className="text-sm text-gray-500">
              {allGoalsChronological.length} goal{allGoalsChronological.length !== 1 ? 's' : ''} in journey
            </span>
          )}
          {isRestricted && (
            <div className="ml-auto">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>

        {loading ? (
          <GoalTimelineSkeleton count={3} />
        ) : allGoalsChronological.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No goals recorded yet
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-6">
              {allGoalsChronological.map((goal) => (
                <div key={`goal-timeline-${goal.id}`} className="relative">
                  {/* Goal Node */}
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 text-right w-16">
                      <div className="text-xs text-gray-500 font-medium">
                        {new Date(goal.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: '2-digit'
                        })}
                      </div>
                      {goal.status === 'completed' && goal.completedDate && (
                        <div className="text-xs text-gray-400 mt-1">
                          to {new Date(goal.completedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 relative">
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        goal.status === 'completed' ? 'bg-gray-900' :
                        goal.status === 'active' ? 'bg-gray-700' : 'bg-gray-400'
                      }`}>
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>

                    <div className="flex-1 pb-6">
                      {/* Goal Header */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            {goal.title}
                          </h4>
                          {goal.status === 'active' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              Active
                            </span>
                          )}
                          {goal.status === 'completed' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {goal.actions && goal.actions.length > 0 && !isRestricted && (
                        <div className="mt-3 ml-2">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-sm font-medium text-gray-900">Actions</h6>
                            {goal.actions.length > 3 && (
                              <button
                                onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {expandedGoal === goal.id ? 'View less' : `View more (${goal.actions.length})`}
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(expandedGoal === goal.id ? goal.actions : goal.actions.slice(0, 3)).map((action) => (
                              <div key={`action-${goal.id}-${action.id}`} className="flex items-start gap-3 py-2 px-3 bg-white border border-gray-100 rounded text-sm">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  action.type === 'course' ? 'bg-blue-500' :
                                  action.type === 'quiz' ? 'bg-purple-500' :
                                  action.type === 'text' || action.type === 'screenshot' || action.type === 'voice' || action.type === 'loom' ? 'bg-orange-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-gray-900 font-medium">{action.title}</div>
                                  <div className="text-gray-500 text-xs mt-0.5">
                                    {formatTimeAgo(action.date)} {action.details && `• ${action.details}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Call to Action for Guests */}
      {isRestricted && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
          <Lock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Unlock Your Goal Journey</h3>
          <p className="text-gray-600 mb-4">
            Start tracking your own goals and milestones with detailed progress insights.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Join Community - $97/month
          </button>
        </div>
      )}
    </div>
  )
}
