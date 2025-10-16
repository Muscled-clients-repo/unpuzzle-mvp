'use client'

import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { getAllStudentsForFeaturing, featureStudent, unfeatureStudent } from '@/lib/actions/featured-students-actions'

interface Student {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  is_featured: boolean
  featured_order: number | null
}

export default function FeaturedStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStudents = async () => {
    setLoading(true)
    const result = await getAllStudentsForFeaturing()
    if (result.error) {
      setError(result.error)
    } else {
      setStudents(result.data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleFeature = async (studentId: string) => {
    setActionLoading(studentId)
    const result = await featureStudent(studentId)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      await fetchStudents()
    }
    setActionLoading(null)
  }

  const handleUnfeature = async (studentId: string) => {
    setActionLoading(studentId)
    const result = await unfeatureStudent(studentId)
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      await fetchStudents()
    }
    setActionLoading(null)
  }

  const featuredStudents = students.filter(s => s.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
  const unfeaturedStudents = students.filter(s => !s.is_featured)
  const canFeatureMore = featuredStudents.length < 3

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Featured Students</h1>
        <p className="text-gray-600">
          Select up to 3 students to showcase on the community goals page
        </p>
      </div>

      {/* Featured Students */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Featured ({featuredStudents.length}/3)
          </h2>
          {!canFeatureMore && (
            <span className="text-sm text-gray-500">
              Max reached - unfeature a student to add another
            </span>
          )}
        </div>

        {featuredStudents.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Star className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No featured students yet</p>
            <p className="text-sm text-gray-400 mt-1">Click the star icon on any student below to feature them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {featuredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-gray-50 border border-gray-300 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* Order Badge */}
                  <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {student.featured_order}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt={student.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      student.full_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="font-medium text-gray-900">{student.full_name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleUnfeature(student.id)}
                  disabled={actionLoading === student.id}
                  className="text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Remove from featured"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Students */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Students</h2>

        {unfeaturedStudents.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">All students are featured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unfeaturedStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt={student.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      student.full_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="font-medium text-gray-900">{student.full_name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </div>
                </div>

                {/* Feature Button */}
                <button
                  onClick={() => handleFeature(student.id)}
                  disabled={!canFeatureMore || actionLoading === student.id}
                  className="text-gray-400 hover:text-yellow-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={canFeatureMore ? "Add to featured" : "Max 3 featured students"}
                >
                  <Star className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
