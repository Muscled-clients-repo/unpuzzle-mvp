import { Badge } from "@/components/ui/badge"
import { Shield, GraduationCap, Star, CheckCircle } from "lucide-react"

interface ResponseBadgeProps {
  role: 'instructor' | 'moderator' | 'learner'
  trustScore?: number
  endorsed?: boolean
  helpfulVotes?: number
}

export function ResponseBadge({ role, trustScore, endorsed, helpfulVotes }: ResponseBadgeProps) {
  if (role === 'instructor') {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <GraduationCap className="h-3 w-3 mr-1" />
        Instructor
      </Badge>
    )
  }

  if (role === 'moderator') {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
          <Shield className="h-3 w-3 mr-1" />
          Moderator
          {trustScore && trustScore >= 90 && <Star className="h-3 w-3 ml-1" />}
        </Badge>
        {endorsed && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
        {helpfulVotes && helpfulVotes > 10 && (
          <Badge variant="outline">
            {helpfulVotes} helpful
          </Badge>
        )}
      </div>
    )
  }

  return null
}