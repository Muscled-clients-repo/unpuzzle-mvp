'use client'

import React, { useState, useEffect } from 'react'
import { BookOpen, User, ChevronDown, ChevronRight } from 'lucide-react'
import { getCoursesGroupedByTrackAndGoalAction } from '@/app/actions/course-actions'

interface Course {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  is_free: boolean
  price?: number
  instructor: {
    id?: string
    name: string
    avatar_url?: string
  }
}

interface Goal {
  id: string
  name: string
  description: string
  sort_order: number
  courses: Course[]
  course_count: number
}

interface Track {
  id: string
  name: string
  description: string
  goals: Goal[]
  total_courses: number
}

interface CommunityCoursesProps {
  userRole: 'guest' | 'student' | 'instructor'
}

export function CommunityCoursesSection({ userRole }: CommunityCoursesProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set())
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())

  const isRestricted = userRole === 'guest'

  // Fetch courses grouped by track and goal
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const result = await getCoursesGroupedByTrackAndGoalAction()

        if (result.error) {
          console.error('Error fetching courses:', result.error)
          setError(result.error)
          return
        }

        const tracksData = result.data || []
        setTracks(tracksData)

        // Expand first track and its first goal by default
        if (tracksData.length > 0) {
          const firstTrack = tracksData[0]
          setExpandedTracks(new Set([firstTrack.id]))
          if (firstTrack.goals.length > 0) {
            setExpandedGoals(new Set([firstTrack.goals[0].id]))
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err)
        setError('Failed to load courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Filter courses based on search across all tracks/goals
  const filteredTracks = tracks.map(track => ({
    ...track,
    goals: track.goals.map(goal => ({
      ...goal,
      courses: goal.courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(goal => goal.courses.length > 0)
  })).filter(track => track.goals.length > 0)

  const totalCourses = filteredTracks.reduce((sum, track) =>
    sum + track.goals.reduce((goalSum, goal) => goalSum + goal.courses.length, 0), 0
  )

  const toggleTrack = (trackId: string) => {
    const newExpanded = new Set(expandedTracks)
    if (newExpanded.has(trackId)) {
      newExpanded.delete(trackId)
    } else {
      newExpanded.add(trackId)
    }
    setExpandedTracks(newExpanded)
  }

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Browse Courses by Learning Track
        </h2>
        <p className="text-gray-600">
          Explore structured learning paths designed to help you reach your income goals
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <div className="text-sm text-gray-500 flex items-center">
          {totalCourses} course{totalCourses !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTracks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No courses match your search' : 'No courses available yet'}
        </div>
      )}

      {/* Tracks, Goals, and Courses Hierarchy */}
      {!loading && !error && filteredTracks.length > 0 && (
        <div className="space-y-6">
          {filteredTracks.map((track) => (
            <div key={track.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Track Header */}
              <button
                onClick={() => toggleTrack(track.id)}
                className="w-full bg-gray-50 px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedTracks.has(track.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  )}
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">{track.name}</h3>
                    <p className="text-sm text-gray-600">{track.description}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {track.total_courses} courses
                </div>
              </button>

              {/* Track Goals */}
              {expandedTracks.has(track.id) && (
                <div className="bg-white">
                  {track.goals.map((goal) => (
                    <div key={goal.id} className="border-t border-gray-200">
                      {/* Goal Header */}
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedGoals.has(goal.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                            {goal.description && (
                              <p className="text-xs text-gray-500">{goal.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {goal.courses.length} course{goal.courses.length !== 1 ? 's' : ''}
                        </div>
                      </button>

                      {/* Goal Courses */}
                      {expandedGoals.has(goal.id) && (
                        <div className="px-6 pb-4">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {goal.courses.map((course) => (
                              <div
                                key={course.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                              >
                                {/* Course Thumbnail */}
                                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                  {course.thumbnail_url ? (
                                    <img
                                      src={course.thumbnail_url}
                                      alt={course.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <BookOpen className="h-12 w-12 text-gray-400" />
                                  )}
                                </div>

                                {/* Course Title */}
                                <h5 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                  {course.title}
                                </h5>

                                {/* Course Description */}
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {course.description || 'No description available'}
                                </p>

                                {/* Instructor Info */}
                                <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                                  {course.instructor.avatar_url ? (
                                    <img
                                      src={course.instructor.avatar_url}
                                      alt={course.instructor.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                      <User className="h-3 w-3 text-gray-600" />
                                    </div>
                                  )}
                                  <span>{course.instructor.name}</span>
                                </div>

                                {/* Price Info */}
                                <div className="mb-3">
                                  {course.is_free ? (
                                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                      Free
                                    </span>
                                  ) : course.price ? (
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                      ${course.price}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Action Button */}
                                <button
                                  className={`w-full py-2 px-3 rounded text-sm transition-colors ${
                                    isRestricted
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-gray-900 text-white hover:bg-black'
                                  }`}
                                  disabled={isRestricted}
                                >
                                  {isRestricted ? 'Join to Access' : 'View Course'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Call to Action for Guests */}
      {isRestricted && totalCourses > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
          <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Start Your Learning Journey</h3>
          <p className="text-gray-600 mb-4">
            Join the community to access all courses and follow structured learning paths to reach your income goals.
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Join Community - $97/month
          </button>
        </div>
      )}
    </div>
  )
}
