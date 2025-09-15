'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Clock, Users, BookOpen, ChevronRight, Lightbulb, CheckCircle } from 'lucide-react'
import { getAllTracks, getStudentTrackAssignments, assignTrackToStudent, getStudentPreferences } from '@/lib/actions/track-actions'
import { toast } from 'sonner'
import Link from 'next/link'

export default function TrackSelectionPage() {
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Get all tracks
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: getAllTracks
  })

  // Get current assignments
  const { data: assignments } = useQuery({
    queryKey: ['student-track-assignments'],
    queryFn: getStudentTrackAssignments
  })

  // Get student preferences
  const { data: preferences } = useQuery({
    queryKey: ['student-preferences'],
    queryFn: getStudentPreferences
  })

  // Track assignment mutation
  const assignTrackMutation = useMutation({
    mutationFn: assignTrackToStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-track-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['filtered-courses'] })
      toast.success('Track assigned successfully!')
      setSelectedTrack(null)
    },
    onError: (error) => {
      toast.error('Failed to assign track')
      console.error(error)
    }
  })

  const assignedTrackIds = new Set(assignments?.map(a => a.track_id) || [])
  const hasCompletedQuestionnaire = preferences?.completed_questionnaire

  const handleTrackSelect = (trackId: string, assignmentType: 'primary' | 'secondary' = 'primary') => {
    assignTrackMutation.mutate({
      trackId,
      assignmentType,
      source: 'manual',
      reasoning: 'Selected manually from track selection page'
    })
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getFocusAreaIcon = (focusArea: string) => {
    switch (focusArea.toLowerCase()) {
      case 'frontend': return '🎨'
      case 'backend': return '⚙️'
      case 'fullstack': return '🔄'
      case 'design': return '🎯'
      case 'mobile': return '📱'
      case 'devops': return '🚀'
      default: return '💻'
    }
  }

  if (tracksLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading learning tracks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Learning Track
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Select a learning track that aligns with your career goals and interests. 
          You can choose multiple tracks and switch between them as you progress.
        </p>
      </div>

      {/* Questionnaire CTA */}
      {!hasCompletedQuestionnaire && (
        <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Get Personalized Recommendations
                </h3>
                <p className="text-blue-700 dark:text-blue-200 text-sm mb-3">
                  Take our quick questionnaire to receive track recommendations tailored to your experience, 
                  goals, and learning preferences.
                </p>
                <Link href="/student/track-selection/questionnaire">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Take Questionnaire
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      {assignments && assignments.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Your Current Tracks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl">
                    {getFocusAreaIcon(assignment.track?.focus_area || '')}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {assignment.track?.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {assignment.assignment_type === 'primary' ? 'Primary Track' : 'Secondary Track'}
                      • {assignment.progress_percentage}% Complete
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {assignment.assignment_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track Selection */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tracks</TabsTrigger>
          <TabsTrigger value="beginner">Beginner Friendly</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TrackGrid 
            tracks={tracks || []} 
            assignedTrackIds={assignedTrackIds}
            onTrackSelect={handleTrackSelect}
            isAssigning={assignTrackMutation.isPending}
            selectedTrack={selectedTrack}
            setSelectedTrack={setSelectedTrack}
          />
        </TabsContent>

        <TabsContent value="beginner" className="space-y-4">
          <TrackGrid 
            tracks={tracks?.filter(t => t.difficulty_level === 'beginner') || []} 
            assignedTrackIds={assignedTrackIds}
            onTrackSelect={handleTrackSelect}
            isAssigning={assignTrackMutation.isPending}
            selectedTrack={selectedTrack}
            setSelectedTrack={setSelectedTrack}
          />
        </TabsContent>

        <TabsContent value="intermediate" className="space-y-4">
          <TrackGrid 
            tracks={tracks?.filter(t => t.difficulty_level === 'intermediate') || []} 
            assignedTrackIds={assignedTrackIds}
            onTrackSelect={handleTrackSelect}
            isAssigning={assignTrackMutation.isPending}
            selectedTrack={selectedTrack}
            setSelectedTrack={setSelectedTrack}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <TrackGrid 
            tracks={tracks?.filter(t => t.difficulty_level === 'advanced') || []} 
            assignedTrackIds={assignedTrackIds}
            onTrackSelect={handleTrackSelect}
            isAssigning={assignTrackMutation.isPending}
            selectedTrack={selectedTrack}
            setSelectedTrack={setSelectedTrack}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TrackGridProps {
  tracks: any[]
  assignedTrackIds: Set<string>
  onTrackSelect: (trackId: string, assignmentType?: 'primary' | 'secondary') => void
  isAssigning: boolean
  selectedTrack: string | null
  setSelectedTrack: (trackId: string | null) => void
}

function TrackGrid({ tracks, assignedTrackIds, onTrackSelect, isAssigning, selectedTrack, setSelectedTrack }: TrackGridProps) {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getFocusAreaIcon = (focusArea: string) => {
    switch (focusArea.toLowerCase()) {
      case 'frontend': return '🎨'
      case 'backend': return '⚙️'
      case 'fullstack': return '🔄'
      case 'design': return '🎯'
      case 'mobile': return '📱'
      case 'devops': return '🚀'
      default: return '💻'
    }
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No tracks available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Check back later for new learning tracks.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tracks.map(track => {
        const isAssigned = assignedTrackIds.has(track.id)
        const isExpanded = selectedTrack === track.id

        return (
          <Card 
            key={track.id} 
            className={`transition-all duration-200 hover:shadow-lg ${
              isAssigned ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/10' : 
              isExpanded ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {getFocusAreaIcon(track.focus_area)}
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">
                      {track.title}
                    </CardTitle>
                    <Badge className={`mt-1 text-xs ${getDifficultyColor(track.difficulty_level)}`}>
                      {track.difficulty_level}
                    </Badge>
                  </div>
                </div>
                {isAssigned && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                {track.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {track.estimated_duration_weeks}w
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {track.course_count} courses
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {track.student_count}
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {track.learning_outcomes && track.learning_outcomes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                        Learning Outcomes:
                      </h4>
                      <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {track.learning_outcomes.slice(0, 3).map((outcome: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {track.prerequisites && track.prerequisites.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                        Prerequisites:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {track.prerequisites.slice(0, 3).map((prereq: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {prereq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {!isExpanded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTrack(track.id)}
                    className="flex-1"
                  >
                    Learn More
                  </Button>
                )}

                {isExpanded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTrack(null)}
                    className="flex-1"
                  >
                    Show Less
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => onTrackSelect(track.id, isAssigned ? 'secondary' : 'primary')}
                  disabled={isAssigning}
                  className={isAssigned ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {isAssigning ? 'Adding...' : isAssigned ? 'Add as Secondary' : 'Select Track'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}