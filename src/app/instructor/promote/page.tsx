"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Trophy, 
  TrendingUp, 
  Brain,
  MessageCircle,
  Star,
  Shield,
  Award,
  CheckCircle,
  User,
  ArrowRight,
  Sparkles
} from "lucide-react"

export default function PromoteToModeratorPage() {
  const { promoteToModerator, topLearners, allSpecializations, loadInstructorData } = useAppStore()
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([])
  
  useEffect(() => {
    loadInstructorData()
  }, [loadInstructorData])

  // Extended top learners data (will be replaced by API)
  const extendedTopLearners = [
    {
      id: '1',
      name: 'Sarah Chen',
      learnRate: 52,
      responsesInCommunity: 147,
      helpfulVotes: 892,
      reflectionsEndorsed: 23,
      coursesCompleted: 5,
      avgScore: 94,
      strengths: ['React', 'JavaScript', 'CSS'],
      joinedDaysAgo: 120,
      currentPlan: 'premium' as const
    },
    {
      id: '2',
      name: 'Mike Johnson',
      learnRate: 48,
      responsesInCommunity: 89,
      helpfulVotes: 456,
      reflectionsEndorsed: 15,
      coursesCompleted: 3,
      avgScore: 91,
      strengths: ['Python', 'Data Science', 'Machine Learning'],
      joinedDaysAgo: 90,
      currentPlan: 'premium' as const
    },
    {
      id: '3',
      name: 'Emma Wilson',
      learnRate: 45,
      responsesInCommunity: 234,
      helpfulVotes: 1023,
      reflectionsEndorsed: 31,
      coursesCompleted: 4,
      avgScore: 88,
      strengths: ['React', 'Node.js', 'TypeScript'],
      joinedDaysAgo: 150,
      currentPlan: 'basic' as const
    },
    {
      id: '4',
      name: 'Alex Kim',
      learnRate: 44,
      responsesInCommunity: 67,
      helpfulVotes: 234,
      reflectionsEndorsed: 8,
      coursesCompleted: 2,
      avgScore: 85,
      strengths: ['CSS', 'HTML', 'JavaScript'],
      joinedDaysAgo: 60,
      currentPlan: 'premium' as const
    }
  ]

  const handlePromote = () => {
    if (selectedCandidate && selectedSpecializations.length > 0) {
      promoteToModerator(selectedCandidate, selectedSpecializations)
      // Show success message
      alert(`Successfully promoted to moderator with specializations: ${selectedSpecializations.join(', ')}`)
      setSelectedCandidate(null)
      setSelectedSpecializations([])
    }
  }

  // allSpecializations now comes from store

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Promote to Moderator</h1>
        <p className="text-muted-foreground">
          Select top-performing learners to become trusted community moderators
        </p>
      </div>

      {/* Criteria Alert */}
      <Alert>
        <Trophy className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Moderator Selection Criteria:</p>
          <ul className="text-sm space-y-1">
            <li>• Learn Rate above 40 min/hr (consistent engagement)</li>
            <li>• At least 50 helpful responses in community</li>
            <li>• 80%+ course completion average</li>
            <li>• Active for at least 60 days</li>
            <li>• Positive community feedback (helpful votes)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Top Candidates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Top Candidates</h2>
        
        {topLearners.map((learner) => {
          const meetsAllCriteria = 
            learner.learnRate >= 40 &&
            learner.responsesInCommunity >= 50 &&
            learner.avgScore >= 80 &&
            learner.joinedDaysAgo >= 60

          return (
            <Card 
              key={learner.id}
              className={`${selectedCandidate === learner.id ? 'ring-2 ring-primary' : ''} ${
                !meetsAllCriteria ? 'opacity-60' : ''
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle>{learner.name}</CardTitle>
                      {meetsAllCriteria && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Qualified
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {learner.currentPlan} plan
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Member for {learner.joinedDaysAgo} days • {learner.coursesCompleted} courses completed
                    </p>
                  </div>
                  <Button
                    variant={selectedCandidate === learner.id ? "default" : "outline"}
                    disabled={!meetsAllCriteria}
                    onClick={() => setSelectedCandidate(selectedCandidate === learner.id ? null : learner.id)}
                  >
                    {selectedCandidate === learner.id ? "Selected" : "Select"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Brain className="h-4 w-4" />
                      Learn Rate
                    </div>
                    <p className="text-2xl font-bold">{learner.learnRate} min/hr</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MessageCircle className="h-4 w-4" />
                      Community Help
                    </div>
                    <p className="text-2xl font-bold">{learner.responsesInCommunity}</p>
                    <p className="text-xs text-muted-foreground">{learner.helpfulVotes} helpful votes</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Star className="h-4 w-4" />
                      Avg Score
                    </div>
                    <p className="text-2xl font-bold">{learner.avgScore}%</p>
                    <p className="text-xs text-muted-foreground">{learner.reflectionsEndorsed} endorsed</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Award className="h-4 w-4" />
                      Strengths
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {learner.strengths.map(strength => (
                        <Badge key={strength} variant="secondary" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCandidate === learner.id && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="font-medium mb-3">Select Specialization Areas:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {allSpecializations.map(spec => (
                        <label key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedSpecializations.includes(spec)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSpecializations([...selectedSpecializations, spec])
                              } else {
                                setSelectedSpecializations(selectedSpecializations.filter(s => s !== spec))
                              }
                            }}
                            disabled={!learner.strengths.includes(spec)}
                          />
                          <span className={`text-sm ${!learner.strengths.includes(spec) ? 'text-muted-foreground' : ''}`}>
                            {spec}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Promotion Action */}
      {selectedCandidate && selectedSpecializations.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold">Ready to Promote</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  This learner will be able to help answer student questions in: {selectedSpecializations.join(', ')}
                </p>
              </div>
              <Button onClick={handlePromote} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="mr-2 h-4 w-4" />
                Promote to Moderator
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle>Moderator Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Weekly Competitions</p>
                <p className="text-sm text-muted-foreground">
                  Top moderators win premium subscriptions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Trust Score System</p>
                <p className="text-sm text-muted-foreground">
                  Build reputation and earn instructor endorsements
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Special Recognition</p>
                <p className="text-sm text-muted-foreground">
                  Moderator badge and priority support access
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}